import { guardrailsConfig } from '../config/guardrails';
import { logError } from '../../../../packages/shared/src/utils/logger';
import { cosine, embed } from './embeddings';

export const CANONICAL_TOPICS = [
  'recipes',
  'pantry',
  'groceries',
  'nutrition',
  'macros',
  'food profile',
  'dietary restrictions',
  'budget',
] as const;

type CanonicalEmbedding = {
  topic: (typeof CANONICAL_TOPICS)[number];
  vector: number[];
};

let cachedCanonicalEmbeddings: CanonicalEmbedding[] | null = null;

const bootstrapCanonicals = preloadCanonicals();

async function preloadCanonicals(): Promise<CanonicalEmbedding[]> {
  try {
    const vectors = await Promise.all(
      CANONICAL_TOPICS.map(async (topic) => ({
        topic,
        vector: await embed(topic),
      })),
    );
    cachedCanonicalEmbeddings = vectors;
    return vectors;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logError('canonical_embedding_bootstrap_failed', { message });
    const fallback = CANONICAL_TOPICS.map((topic) => ({ topic, vector: [] }));
    cachedCanonicalEmbeddings = fallback;
    return fallback;
  }
}

async function getCanonicalEmbeddings(): Promise<CanonicalEmbedding[]> {
  if (cachedCanonicalEmbeddings) return cachedCanonicalEmbeddings;
  return bootstrapCanonicals;
}

export async function onTopicScore(prompt: string): Promise<number> {
  const normalized = prompt.normalize('NFKC').trim();
  if (!normalized) return 0;

  const promptVector = await embed(normalized);
  if (!promptVector.length) return 0;

  const canonicalEmbeddings = await getCanonicalEmbeddings();
  let bestCosine = 0;

  for (const canonical of canonicalEmbeddings) {
    if (!canonical.vector.length) continue;
    const similarity = cosine(promptVector, canonical.vector);
    if (similarity > bestCosine) bestCosine = similarity;
  }

  const score = (bestCosine + 1) / 2;
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(1, score));
}

export function isOnTopic(score: number, threshold: number): boolean {
  return Number.isFinite(score) && score >= threshold;
}
