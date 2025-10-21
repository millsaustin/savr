import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { guardrailsConfig } from '../config/guardrails';
import { logError, logInfo } from '../../../../packages/shared/src/utils/logger';
import { checkBudgetCap } from './budget-cap';
import { classifyIntent, type Intent } from './intent';
import { detectInjection } from './injection';
import { moderate } from './moderation';
import {
  checkRateLimitWithHash,
  hashClientIp,
} from './rate-limit';
import { sanitizeInput } from './sanitize';
import { isOnTopic, onTopicScore } from './topic-router';
import { logGuardEvent } from '../lib/guardLogger';

export type GuardMeta = {
  intent: Intent;
  onTopicScore: number;
  moderationFlag: boolean;
  rateLimitHit: boolean;
  ipHash: string;
  blockReason?: string;
};

type GuardAttachment = {
  guard: GuardMeta;
  sanitizedPrompt: string;
  hadUrls: boolean;
  body?: unknown;
};

export type GuardedRequest = NextRequest & {
  savr?: GuardAttachment;
};

export type NextRouteHandlerContext = {
  params?: Record<string, string>;
  [key: string]: unknown;
};

export type NextRouteHandler = (
  req: GuardedRequest,
  ctx: NextRouteHandlerContext,
) => Promise<Response> | Response;

type GuardDecision = 'allowed' | 'blocked';

const GUARD_LOG_ENDPOINT = process.env.GUARDRAILS_LOG_ENDPOINT;

const offTopicCounters = new Map<string, number>();

function offTopicKey(userId: string | undefined, ipHash: string): string {
  return `user:${userId ?? 'anon'}|ip:${ipHash}`;
}

function incrementOffTopic(
  userId: string | undefined,
  ipHash: string,
): number {
  const key = offTopicKey(userId, ipHash);
  const current = offTopicCounters.get(key) ?? 0;
  const next = current + 1;
  offTopicCounters.set(key, next);
  return next;
}

function resetOffTopic(userId: string | undefined, ipHash: string) {
  offTopicCounters.delete(offTopicKey(userId, ipHash));
}

async function extractPrompt(
  request: NextRequest,
): Promise<{ prompt: string; body?: unknown }> {
  if (request.method.toUpperCase() === 'GET') {
    const searchParams = request.nextUrl.searchParams;
    return {
      prompt:
        searchParams.get('prompt') ||
        searchParams.get('query') ||
        searchParams.get('input') ||
        '',
      body: undefined,
    };
  }

  const clone = request.clone();
  let raw = '';

  try {
    raw = await clone.text();
  } catch {
    raw = '';
  }

  if (!raw) {
    return { prompt: '', body: undefined };
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const candidate =
      (typeof parsed.prompt === 'string' && parsed.prompt) ||
      (typeof parsed.input === 'string' && parsed.input) ||
      (typeof parsed.query === 'string' && parsed.query) ||
      (typeof parsed.message === 'string' && parsed.message) ||
      '';
    return { prompt: candidate, body: parsed };
  } catch {
    return { prompt: raw, body: raw };
  }
}

function getClientIp(request: NextRequest): string {
  if (request.ip) return request.ip;

  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const [first] = forwarded.split(',');
    if (first) return first.trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  return 'unknown';
}

async function persistGuardLog(payload: Record<string, unknown>) {
  if (!GUARD_LOG_ENDPOINT || typeof fetch !== 'function') return;

  try {
    await fetch(GUARD_LOG_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logError('guardrails_log_failed', { message });
  }
}

async function logGuardDecision(
  route: string,
  decision: GuardDecision,
  meta: GuardMeta,
  extras: Record<string, unknown> = {},
) {
  const payload = {
    route,
    decision,
    intent: meta.intent,
    onTopicScore: meta.onTopicScore,
    moderationFlag: meta.moderationFlag,
    rateLimitHit: meta.rateLimitHit,
    ipHash: meta.ipHash,
    blockReason: meta.blockReason,
    ...extras,
  };

  if (decision === 'allowed') {
    logInfo('guardrails_allow', payload);
  } else {
    logInfo('guardrails_block', payload);
  }

    if (decision === 'blocked') {
      await logGuardEvent({
        userId: typeof extras.userId === 'string' ? extras.userId : undefined,
        intent: meta.intent,
        onTopicScore: meta.onTopicScore,
        moderationFlag: meta.moderationFlag,
        rateLimitHit: meta.rateLimitHit,
        blockReason: meta.blockReason,
        ipHash: meta.ipHash,
        model:
          typeof extras.model === 'string'
            ? extras.model
            : decision === 'blocked'
              ? 'guardrails'
              : undefined,
        tokens:
          typeof extras.tokens === 'number'
            ? (extras.tokens as number)
            : decision === 'blocked'
              ? 0
              : undefined,
        success: false,
      });
    }

    await persistGuardLog(payload);
  }

function errorResponse(
  code: string,
  message: string,
  status = 200,
): NextResponse {
  return NextResponse.json(
    {
      error: {
        code,
        message,
      },
    },
    { status },
  );
}

export function withGuards(handler: NextRouteHandler): NextRouteHandler {
  return async (request, context) => {
    const guardedRequest = request as GuardedRequest;
    const route = request.nextUrl?.pathname || 'unknown_route';
    const userId =
      request.headers.get('x-user-id') ||
      request.headers.get('x-supabase-user-id') ||
      request.headers.get('x-client-user-id') ||
      undefined;

    const clientIp = getClientIp(request);
    const ipHash = await hashClientIp(clientIp);

    const guardMeta: GuardMeta = {
      intent: 'OFF_TOPIC',
      onTopicScore: 0,
      moderationFlag: false,
      rateLimitHit: false,
      ipHash,
    };

    try {
      const { prompt, body } = await extractPrompt(request);
      const sanitized = sanitizeInput(prompt || '');

      if (guardedRequest.savr) {
        guardedRequest.savr.guard = guardMeta;
        guardedRequest.savr.sanitizedPrompt = sanitized.cleaned;
        guardedRequest.savr.hadUrls = sanitized.hadUrls;
        guardedRequest.savr.body = body;
      } else {
        guardedRequest.savr = {
          guard: guardMeta,
          sanitizedPrompt: sanitized.cleaned,
          hadUrls: sanitized.hadUrls,
          body,
        };
      }

      if (sanitized.tooLong) {
        guardMeta.blockReason = 'TOO_LONG';
        await logGuardDecision(route, 'blocked', guardMeta, { userId });
        return errorResponse(
          'TOO_LONG',
          'Keep it concise so I can help best.',
          200,
        );
      }

      if (!sanitized.cleaned) {
        guardMeta.blockReason = 'EMPTY_PROMPT';
        await logGuardDecision(route, 'blocked', guardMeta, { userId });
        return errorResponse(
          'EMPTY_PROMPT',
          'I need a bit more detail to help.',
        );
      }

      const moderationResult = await moderate(sanitized.cleaned);
      if (moderationResult.flagged) {
        guardMeta.moderationFlag = true;
        guardMeta.blockReason = moderationResult.category || 'MODERATION';
        await logGuardDecision(route, 'blocked', guardMeta, { userId });
        return errorResponse('BLOCKED', "Can’t help with that.");
      }

      const injectionResult = detectInjection(sanitized.cleaned);
      if (injectionResult.injected) {
        guardMeta.blockReason = injectionResult.rule || 'PROMPT_INJECTION';
        await logGuardDecision(route, 'blocked', guardMeta, { userId });
        return errorResponse(
          'INJECTION',
          'I won’t run instructions embedded in prompts.',
        );
      }

      const topicScore = await onTopicScore(sanitized.cleaned);
      guardMeta.onTopicScore = topicScore;

      if (!isOnTopic(topicScore, guardrailsConfig.guardSimilarityThreshold)) {
        const count = incrementOffTopic(userId, ipHash);
        const repeatBlock =
          guardrailsConfig.guardBlockAfterThree && count >= 3;
        guardMeta.blockReason = repeatBlock ? 'OFF_TOPIC_REPEAT' : 'OFF_TOPIC';
        await logGuardDecision(route, 'blocked', guardMeta, { userId });
        return errorResponse(
          'OFF_TOPIC',
          'I stay focused on cooking, groceries, nutrition, and your pantry.',
        );
      }

      const rateResult = await checkRateLimitWithHash({ userId, ipHash });
      if (rateResult.hit) {
        guardMeta.rateLimitHit = true;
        guardMeta.blockReason =
          rateResult.window === '24h'
            ? 'RATE_LIMIT_24H'
            : 'RATE_LIMIT_30S';
        await logGuardDecision(route, 'blocked', guardMeta, {
          userId,
          window: rateResult.window,
        });
        return errorResponse(
          '429_RATE_LIMITED',
          'Too many requests — give it a moment.',
          429,
        );
      }

      const budgetResult = await checkBudgetCap({ userId });
      if (budgetResult.over) {
        guardMeta.blockReason = budgetResult.code || '402_BUDGET_CAP';
        await logGuardDecision(route, 'blocked', guardMeta, { userId });
        return errorResponse(
          budgetResult.code || '402_BUDGET_CAP',
          'Monthly budget cap reached.',
          402,
        );
      }

      const intent = await classifyIntent(sanitized.cleaned);
      guardMeta.intent = intent;
      guardedRequest.savr.guard = guardMeta;
      resetOffTopic(userId, ipHash);

      await logGuardDecision(route, 'allowed', guardMeta, { userId });

      return handler(guardedRequest, context);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      guardMeta.blockReason = 'GUARD_PIPELINE_ERROR';
      await logGuardDecision(route, 'blocked', guardMeta, {
        userId,
        error: message,
      });
      return errorResponse(
        'GUARD_PIPELINE_ERROR',
        'Unable to process request right now.',
        500,
      );
    }
  };
}
