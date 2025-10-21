import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Intent } from '../guards/intent';

type GuardEventInput = {
  userId?: string;
  intent: Intent;
  onTopicScore: number;
  moderationFlag: boolean;
  rateLimitHit: boolean;
  blockReason?: string;
  ipHash: string;
  model?: string | null;
  tokens?: number | null;
  success: boolean;
};

const isProduction = process.env.NODE_ENV === 'production';

let supabaseServiceClient: SupabaseClient | null = null;

function warnDev(message: string, meta?: unknown) {
  if (!isProduction && typeof console !== 'undefined') {
    console.warn(`[guardLogger] ${message}`, meta);
  }
}

function ensureSupabaseServiceClient(): SupabaseClient | null {
  if (typeof window !== 'undefined') {
    warnDev('logGuardEvent invoked in browser context');
    return null;
  }

  if (supabaseServiceClient) {
    return supabaseServiceClient;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    warnDev('Supabase service credentials missing');
    return null;
  }

  supabaseServiceClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
    global: {
      headers: {
        'x-guard-source': 'web',
      },
    },
  });

  return supabaseServiceClient;
}

function sanitizeModel(model: string | null | undefined, success: boolean) {
  if (!success) return null;
  if (typeof model === 'string' && model.trim().length > 0) {
    return model.trim();
  }
  return 'guardrails';
}

function sanitizeTokens(tokens: number | null | undefined, success: boolean) {
  if (!success) return null;
  if (!Number.isFinite(tokens)) return 0;
  return Math.max(0, Math.trunc(tokens as number));
}

function sanitizeScore(score: number) {
  if (!Number.isFinite(score)) return 0;
  if (score < 0) return 0;
  if (score > 1) return 1;
  return Number(score.toFixed(6));
}

export async function logGuardEvent(input: GuardEventInput): Promise<void> {
  const client = ensureSupabaseServiceClient();
  if (!client) return;

  const record = {
    user_id: input.userId ?? null,
    intent: input.intent,
    on_topic_score: sanitizeScore(input.onTopicScore),
    moderation_flag: Boolean(input.moderationFlag),
    rate_limit_hit: Boolean(input.rateLimitHit),
    block_reason: input.blockReason ?? null,
    ip_hash: input.ipHash,
    model: sanitizeModel(input.model ?? null, input.success),
    tokens_used: sanitizeTokens(input.tokens ?? null, input.success),
    success: input.success,
  };

  try {
    const { error } = await client.from('meal_gen_log').insert(record);
    if (error) {
      warnDev('Supabase insert failed', { error: error.message });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    warnDev('Supabase insert threw', { message });
  }
}
