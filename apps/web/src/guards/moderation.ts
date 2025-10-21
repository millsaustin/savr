import { guardrailsConfig } from '../config/guardrails';
import { logError } from '../../../../packages/shared/src/utils/logger';

const MODERATION_ENDPOINT =
  process.env.INTERNAL_MODERATION_ENDPOINT || '/api/internal/moderation';
const MODERATION_TIMEOUT_MS = 8000;

type ModerationResponse = {
  flagged?: boolean;
  results?: Array<{
    flagged?: boolean;
    categories?: Record<string, boolean>;
  }>;
  categories?: string[];
  category?: string;
};

type ModerationResult = {
  flagged: boolean;
  categories?: string[];
};

type LocalRule = {
  rule: string;
  pattern: RegExp;
};

const LOCAL_BLOCKLIST: LocalRule[] = [
  {
    rule: 'LOCAL_OVERRIDE_GUARDRAILS',
    pattern: /(?:override|bypass)\s+(?:guardrails|filters|safety)/i,
  },
  {
    rule: 'LOCAL_IGNORE_POLICIES',
    pattern: /ignore\s+(?:all\s+)?(?:policies|instructions|safety)/i,
  },
  {
    rule: 'LOCAL_FORCE_TOOLING',
    pattern: /force\s+(?:a\s+)?tool\s+call/i,
  },
  {
    rule: 'LOCAL_EXPLICIT_OVERRIDE',
    pattern: /disregard\s+(?:previous|above)\s+instructions/i,
  },
];

function runLocalBlocklist(text: string): ModerationResult | null {
  const target = text.normalize('NFKC');
  for (const entry of LOCAL_BLOCKLIST) {
    if (entry.pattern.test(target)) {
      return { flagged: true, categories: [entry.rule] };
    }
  }
  return null;
}

function extractCategory(payload: ModerationResponse): string | undefined {
  if (Array.isArray(payload.categories) && payload.categories.length > 0) {
    const first = payload.categories.find(
      (value) => typeof value === 'string' && value.trim().length > 0,
    );
    if (typeof first === 'string') return first;
  }

  if (Array.isArray(payload.results) && payload.results.length > 0) {
    const first = payload.results[0];
    if (first && typeof first === 'object' && first.categories) {
      const flaggedCategory = Object.entries(first.categories).find(
        ([, value]) => Boolean(value),
      );
      if (flaggedCategory) {
        return flaggedCategory[0];
      }
    }
  }

  if (typeof payload.category === 'string') return payload.category;

  return undefined;
}

export async function moderate(
  text: string,
): Promise<{ flagged: boolean; category?: string }> {
  const normalized = text.normalize('NFKC').trim();
  if (!normalized) {
    return { flagged: false };
  }

  const localResult = runLocalBlocklist(normalized);
  if (localResult) {
    return {
      flagged: true,
      category: localResult.categories?.[0],
    };
  }

  if (typeof fetch !== 'function') {
    logError('moderation_fetch_unavailable');
    return { flagged: false };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), MODERATION_TIMEOUT_MS);

  try {
    const response = await fetch(MODERATION_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: guardrailsConfig.moderationModel,
        input: normalized,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      logError('moderation_request_failed', { status: response.status });
      return { flagged: false };
    }

    const payload = (await response.json().catch(() => ({}))) as ModerationResponse;

    const flagged = Boolean(payload.flagged) ||
      (Array.isArray(payload.results) &&
        payload.results.some((result) => result?.flagged === true));

    if (!flagged) {
      return { flagged: false };
    }

    return {
      flagged: true,
      category: extractCategory(payload),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logError('moderation_provider_error', { message });
    return { flagged: false };
  } finally {
    clearTimeout(timer);
  }
}
