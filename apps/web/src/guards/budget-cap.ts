import { guardrailsConfig } from '../config/guardrails';
import { logError } from '../../../../packages/shared/src/utils/logger';

type SystemLimitRow = {
  allow_generation?: boolean;
  current_spend?: number | string | null;
  max_monthly_spend?: number | string | null;
};

type UsageRecord = {
  month: string;
  tokens: number;
};

const textUsage = new Map<string, UsageRecord>();

function getCurrentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

function getUsageRecord(userId: string | undefined, month: string): UsageRecord {
  const key = userId ?? 'anon';
  const existing = textUsage.get(key);
  if (existing && existing.month === month) {
    return existing;
  }

  const fresh: UsageRecord = { month, tokens: 0 };
  textUsage.set(key, fresh);
  return fresh;
}

async function fetchSystemLimit(month: string): Promise<SystemLimitRow | null> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    logError('system_limits_env_missing');
    return null;
  }

  const endpoint = `${supabaseUrl.replace(
    /\/$/,
    '',
  )}/rest/v1/system_limits?select=max_monthly_spend,current_spend,allow_generation&month=eq.${encodeURIComponent(
    month,
  )}&limit=1`;

  try {
    const response = await fetch(endpoint, {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      logError('system_limits_request_failed', { status: response.status });
      return null;
    }

    const data = (await response.json().catch(() => [])) as SystemLimitRow[];
    return data?.[0] ?? null;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logError('system_limits_request_error', { message });
    return null;
  }
}

function parseNumber(value: number | string | null | undefined): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export async function checkBudgetCap({
  userId,
}: {
  userId?: string;
}): Promise<{ over: boolean; code?: '402_BUDGET_CAP' }> {
  const month = getCurrentMonth();

  const systemLimit = await fetchSystemLimit(month);
  if (systemLimit) {
    const allowGeneration =
      systemLimit.allow_generation !== undefined
        ? Boolean(systemLimit.allow_generation)
        : true;
    const currentSpend = parseNumber(systemLimit.current_spend);
    const maxSpend = parseNumber(systemLimit.max_monthly_spend);

    if (!allowGeneration || (maxSpend > 0 && currentSpend >= maxSpend)) {
      return { over: true, code: '402_BUDGET_CAP' };
    }
  }

  const usage = getUsageRecord(userId, month);
  if (usage.tokens >= guardrailsConfig.textTokenBudgetMonth) {
    return { over: true, code: '402_BUDGET_CAP' };
  }

  return { over: false };
}

export function recordTextTokenUsage({
  userId,
  tokens,
}: {
  userId?: string;
  tokens: number;
}) {
  if (!Number.isFinite(tokens) || tokens <= 0) {
    return;
  }
  const month = getCurrentMonth();
  const usage = getUsageRecord(userId, month);
  usage.tokens += Math.trunc(tokens);
}
