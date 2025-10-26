import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextResponse } from 'next/server';
import type { GuardedRequest, NextRouteHandler } from '../src/guards/withGuards';
import type { Intent } from '../src/guards/intent';

process.env.IP_HASH_SALT = process.env.IP_HASH_SALT ?? 'x'.repeat(32);

type RateLimitScenario =
  | { hit: boolean; window: string }
  | (() => { hit: boolean; window: string });

type Scenario = {
  sanitize?: { cleaned: string; tooLong: boolean; hadUrls: boolean };
  moderation?: { flagged: boolean; category?: string };
  injection?: { injected: boolean; rule?: string };
  onTopicScore?: number;
  isOnTopicOverride?: boolean | ((score: number, threshold: number) => boolean);
  rateLimit?: RateLimitScenario;
  budget?: { over: boolean; code?: string };
  intent?: Intent;
};

const scenario: Scenario = {};

vi.mock('../src/lib/guardLogger', () => ({
  logGuardEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../src/guards/sanitize', () => ({
  sanitizeInput: vi.fn(() => scenario.sanitize ?? {
    cleaned: 'make dinner',
    tooLong: false,
    hadUrls: false,
  }),
}));

vi.mock('../src/guards/moderation', () => ({
  moderate: vi.fn(async () => scenario.moderation ?? { flagged: false }),
}));

vi.mock('../src/guards/injection', () => ({
  detectInjection: vi.fn(() => scenario.injection ?? { injected: false }),
}));

vi.mock('../src/guards/topic-router', () => ({
  onTopicScore: vi.fn(async () => scenario.onTopicScore ?? 0.9),
  isOnTopic: vi.fn((score: number, threshold: number) => {
    if (typeof scenario.isOnTopicOverride === 'boolean') {
      return scenario.isOnTopicOverride;
    }
    if (typeof scenario.isOnTopicOverride === 'function') {
      return scenario.isOnTopicOverride(score, threshold);
    }
    return score >= threshold;
  }),
}));

vi.mock('../src/guards/rate-limit', () => ({
  hashClientIp: vi.fn(async () => 'hashed-ip'),
  checkRateLimitWithHash: vi.fn(async () => {
    if (typeof scenario.rateLimit === 'function') {
      return scenario.rateLimit();
    }
    return scenario.rateLimit ?? { hit: false, window: 'ok' };
  }),
}));

vi.mock('../src/guards/budget-cap', () => ({
  checkBudgetCap: vi.fn(async () => scenario.budget ?? { over: false }),
}));

vi.mock('../src/guards/intent', () => ({
  classifyIntent: vi.fn(async () => scenario.intent ?? 'MEAL_GENERATE'),
}));

const { withGuards } = await import('../src/guards/withGuards');

function createGuardedRequest(body: unknown = { prompt: 'make pasta' }): GuardedRequest {
  const rawBody = JSON.stringify(body);
  const headers = new Headers({
    'Content-Type': 'application/json',
  });
  const nextUrl = {
    pathname: '/api/test',
    origin: 'https://example.com',
    searchParams: new URLSearchParams(),
  } as any;

  const request: any = {
    method: 'POST',
    headers,
    nextUrl,
    ip: '127.0.0.1',
  };

  request.clone = () => ({
    text: async () => rawBody,
  });

  request.json = async () => JSON.parse(rawBody);
  request.text = async () => rawBody;

  return request as GuardedRequest;
}

beforeEach(() => {
  scenario.sanitize = {
    cleaned: 'make dinner plans',
    tooLong: false,
    hadUrls: false,
  };
  scenario.moderation = { flagged: false };
  scenario.injection = { injected: false };
  scenario.onTopicScore = 0.9;
  scenario.isOnTopicOverride = undefined;
  scenario.rateLimit = { hit: false, window: 'ok' };
  scenario.budget = { over: false };
  scenario.intent = 'MEAL_GENERATE';
});

async function runGuarded(handler: NextRouteHandler, body?: unknown) {
  const guarded = withGuards(handler);
  const request = createGuardedRequest(body);
  return guarded(request, {});
}

async function responseJson(response: Response) {
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

describe('withGuards integration', () => {
  it('blocks off-topic prompts with code OFF_TOPIC and skips handler', async () => {
    scenario.onTopicScore = 0.1;
    scenario.isOnTopicOverride = false;

    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));

    const response = await runGuarded(handler);
    const payload = await responseJson(response);

    expect(response.status).toBe(200);
    expect(payload?.error?.code).toBe('OFF_TOPIC');
    expect(handler).not.toHaveBeenCalled();
  });

  it('blocks prompt injection attempts', async () => {
    scenario.injection = { injected: true, rule: 'IGNORE_PREVIOUS' };

    const handler = vi.fn();
    const response = await runGuarded(handler);
    const payload = await responseJson(response);

    expect(response.status).toBe(200);
    expect(payload?.error?.code).toBe('INJECTION');
    expect(handler).not.toHaveBeenCalled();
  });

  it('blocks moderated content', async () => {
    scenario.moderation = { flagged: true, category: 'HATE' };

    const handler = vi.fn();
    const response = await runGuarded(handler);
    const payload = await responseJson(response);

    expect(response.status).toBe(200);
    expect(payload?.error?.code).toBe('BLOCKED');
    expect(handler).not.toHaveBeenCalled();
  });

  it('enforces rate limits returning 429 on sixth request', async () => {
    let callCount = 0;
    scenario.rateLimit = () => {
      callCount += 1;
      if (callCount >= 6) {
        return { hit: true, window: '30s' };
      }
      return { hit: false, window: 'ok' };
    };

    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));
    const guarded = withGuards(handler);
    const request = createGuardedRequest();

    for (let i = 0; i < 5; i += 1) {
      const res = await guarded(request, {});
      expect(res.status).toBe(200);
    }

    const response = await guarded(request, {});
    const payload = await responseJson(response);

    expect(response.status).toBe(429);
    expect(payload?.error?.code).toBe('429_RATE_LIMITED');
  });

  it('honors budget cap checks', async () => {
    scenario.budget = { over: true, code: '402_BUDGET_CAP' };

    const handler = vi.fn();
    const response = await runGuarded(handler);
    const payload = await responseJson(response);

    expect(response.status).toBe(402);
    expect(payload?.error?.code).toBe('402_BUDGET_CAP');
    expect(handler).not.toHaveBeenCalled();
  });

  it('allows valid prompts to reach the handler', async () => {
    const handler = vi.fn().mockResolvedValue(
      NextResponse.json({ ok: true, result: 'done' }),
    );

    const response = await runGuarded(handler);
    const payload = await responseJson(response);

    expect(response.status).toBe(200);
    expect(payload).toEqual({ ok: true, result: 'done' });
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
