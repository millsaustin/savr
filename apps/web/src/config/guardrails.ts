import { z } from 'zod';

const guardrailsEnvSchema = z
  .object({
    EMBEDDINGS_MODEL: z
      .string()
      .trim()
      .min(1, { message: 'EMBEDDINGS_MODEL is required' })
      .default('gpt-embedding-3-small'),
    MODERATION_MODEL: z
      .string()
      .trim()
      .min(1, { message: 'MODERATION_MODEL is required' })
      .default('omni-moderation-latest'),
    GUARD_SIMILARITY_THRESHOLD: z
      .coerce
      .number()
      .min(0, { message: 'GUARD_SIMILARITY_THRESHOLD must be >= 0' })
      .max(1, { message: 'GUARD_SIMILARITY_THRESHOLD must be <= 1' })
      .default(0.35),
    GUARD_BLOCK_AFTER_THREE: z.coerce.boolean().default(true),
    REQUESTS_PER_30S: z
      .coerce
      .number()
      .int()
      .positive({ message: 'REQUESTS_PER_30S must be a positive integer' })
      .default(5),
    REQUESTS_PER_DAY: z
      .coerce
      .number()
      .int()
      .positive({ message: 'REQUESTS_PER_DAY must be a positive integer' })
      .default(100),
    IP_HASH_SALT: z
      .string()
      .trim()
      .min(32, { message: 'IP_HASH_SALT must be at least 32 characters' }),
    TEXT_TOKEN_BUDGET_MONTH: z
      .coerce
      .number()
      .int()
      .nonnegative({ message: 'TEXT_TOKEN_BUDGET_MONTH must be >= 0' })
      .default(150000),
    GUARD_COST_PER_REQUEST: z
      .coerce
      .number()
      .nonnegative({ message: 'GUARD_COST_PER_REQUEST must be >= 0' })
      .default(0.05),
  })
  .transform((env) => ({
    embeddingsModel: env.EMBEDDINGS_MODEL,
    moderationModel: env.MODERATION_MODEL,
    guardSimilarityThreshold: env.GUARD_SIMILARITY_THRESHOLD,
    guardBlockAfterThree: env.GUARD_BLOCK_AFTER_THREE,
    requestsPer30s: env.REQUESTS_PER_30S,
    requestsPerDay: env.REQUESTS_PER_DAY,
    ipHashSalt: env.IP_HASH_SALT,
    textTokenBudgetMonth: env.TEXT_TOKEN_BUDGET_MONTH,
    costPerRequestEstimate: env.GUARD_COST_PER_REQUEST,
  }));

const parsedConfig = guardrailsEnvSchema.safeParse({
  EMBEDDINGS_MODEL: process.env.EMBEDDINGS_MODEL,
  MODERATION_MODEL: process.env.MODERATION_MODEL,
  GUARD_SIMILARITY_THRESHOLD: process.env.GUARD_SIMILARITY_THRESHOLD,
  GUARD_BLOCK_AFTER_THREE: process.env.GUARD_BLOCK_AFTER_THREE,
  REQUESTS_PER_30S: process.env.REQUESTS_PER_30S,
  REQUESTS_PER_DAY: process.env.REQUESTS_PER_DAY,
  IP_HASH_SALT: process.env.IP_HASH_SALT,
  TEXT_TOKEN_BUDGET_MONTH: process.env.TEXT_TOKEN_BUDGET_MONTH,
  GUARD_COST_PER_REQUEST: process.env.GUARD_COST_PER_REQUEST,
});

if (!parsedConfig.success) {
  const issueSummary = parsedConfig.error.issues
    .map((issue) => {
      const path = issue.path.join('.') || 'guardrails';
      return `${path}: ${issue.message}`;
    })
    .join('; ');

  throw new Error(`Invalid guardrails configuration: ${issueSummary}`);
}

type GuardrailsConfigInternal = z.infer<typeof guardrailsEnvSchema>;

export type GuardrailsConfig = GuardrailsConfigInternal;

type GuardrailsMutableFields = Pick<
  GuardrailsConfig,
  'guardSimilarityThreshold' | 'guardBlockAfterThree'
>;

const guardrailsState: GuardrailsConfig = {
  ...parsedConfig.data,
};

export const guardrailsConfig = guardrailsState;

export function setGuardrailsConfig(update: Partial<GuardrailsMutableFields>) {
  if (
    typeof update.guardSimilarityThreshold === 'number' &&
    update.guardSimilarityThreshold >= 0 &&
    update.guardSimilarityThreshold <= 1
  ) {
    guardrailsState.guardSimilarityThreshold = update.guardSimilarityThreshold;
  }

  if (typeof update.guardBlockAfterThree === 'boolean') {
    guardrailsState.guardBlockAfterThree = update.guardBlockAfterThree;
  }
}

export function getGuardrailsConfig(): GuardrailsConfig {
  return guardrailsState;
}
