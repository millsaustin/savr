import { logGuardEvent } from '../lib/guardLogger';
import type { GuardMeta } from './withGuards';

type GuardOutcome = {
  success: boolean;
  userId?: string;
  model?: string | null;
  tokens?: number | null;
  blockReason?: string;
};

export async function logGuardOutcome(
  meta: GuardMeta,
  outcome: GuardOutcome,
): Promise<void> {
  await logGuardEvent({
    userId: outcome.userId,
    intent: meta.intent,
    onTopicScore: meta.onTopicScore,
    moderationFlag: meta.moderationFlag,
    rateLimitHit: meta.rateLimitHit,
    blockReason: outcome.blockReason ?? meta.blockReason,
    ipHash: meta.ipHash,
    model: outcome.model ?? undefined,
    tokens: outcome.tokens ?? undefined,
    success: outcome.success,
  });
}
