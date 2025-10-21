import { guardrailsConfig } from '../config/guardrails';
import { logError } from '../../../../packages/shared/src/utils/logger';

const EMBEDDINGS_ENDPOINT =
  process.env.INTERNAL_EMBEDDINGS_ENDPOINT || '/api/internal/embeddings';
const EMBEDDING_TIMEOUT_MS = 8000;

type ProviderEmbeddingResponse =
  | { data?: Array<{ embedding?: number[] }>; embedding?: number[] }
  | undefined;

function normalizeInput(text: string): string {
  return text.normalize('NFKC').trim();
}

function clamp(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value > 1) return 1;
  if (value < -1) return -1;
  return value;
}

export async function embed(text: string): Promise<number[]> {
  const normalized = normalizeInput(text);
  if (!normalized) {
    return [];
  }

  if (typeof fetch !== 'function') {
    logError('embeddings_fetch_unavailable');
    return [];
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), EMBEDDING_TIMEOUT_MS);

  try {
    const response = await fetch(EMBEDDINGS_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: guardrailsConfig.embeddingsModel,
        input: normalized,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      logError('embeddings_request_failed', { status: response.status });
      return [];
    }

    const payload = (await response
      .json()
      .catch(() => null)) as ProviderEmbeddingResponse;

    const rawVector =
      payload?.data?.[0]?.embedding ||
      (Array.isArray(payload?.embedding) ? payload?.embedding : undefined);

    if (!Array.isArray(rawVector)) {
      logError('embeddings_response_invalid');
      return [];
    }

    return rawVector.map((value) => clamp(Number(value) || 0));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logError('embeddings_provider_error', { message });
    return [];
  } finally {
    clearTimeout(timer);
  }
}

export function cosine(a: number[], b: number[]): number {
  const length = Math.min(a.length, b.length);
  if (length === 0) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < length; i += 1) {
    const va = Number.isFinite(a[i]) ? a[i] : 0;
    const vb = Number.isFinite(b[i]) ? b[i] : 0;

    dot += va * vb;
    normA += va * va;
    normB += vb * vb;
  }

  if (normA === 0 || normB === 0) return 0;

  const result = dot / (Math.sqrt(normA) * Math.sqrt(normB));
  return clamp(result);
}
