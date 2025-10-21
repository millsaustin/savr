import { headers } from 'next/headers';
import { getGuardrailsConfig } from '../../../src/config/guardrails';
import GuardrailControls from './GuardrailControls';

type MetricRow = {
  hour_bucket: string;
  total_requests: number | null;
  off_topic_count: number | null;
  avg_on_topic_score: number | null;
  rate_limited_count: number | null;
  moderation_flag_count: number | null;
  blocked_count: number | null;
  estimated_spend_savings_events: number | null;
};

type BlockReasonResponse = {
  data: Array<{ reason: string; count: number }>;
  windowHours: number;
};

const SPEND_SAVINGS_DEFAULT = 0.05;

function getSupabaseHeaders() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return null;
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
  };
}

async function fetchGuardrailMetrics(): Promise<MetricRow[]> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const headersMap = getSupabaseHeaders();
  if (!supabaseUrl || !headersMap) {
    return [];
  }

  const url = new URL(`${supabaseUrl}/rest/v1/meal_guardrail_metrics_v`);
  url.searchParams.set(
    'select',
    'hour_bucket,total_requests,off_topic_count,avg_on_topic_score,rate_limited_count,moderation_flag_count,blocked_count,estimated_spend_savings_events',
  );
  url.searchParams.set('order', 'hour_bucket.desc');
  url.searchParams.set('limit', '168');

  const response = await fetch(url, {
    headers: headersMap,
    cache: 'no-store',
  }).catch(() => null);

  if (!response || !response.ok) {
    return [];
  }

  const payload = (await response.json().catch(() => [])) as MetricRow[];
  return payload;
}

async function fetchBlockReasons(headerBag: Headers, cookieHeader: string | null) {
  const host = headerBag.get('host');
  if (!host) {
    return { data: [], windowHours: 24 };
  }

  const protocol =
    headerBag.get('x-forwarded-proto') ||
    (process.env.NODE_ENV === 'production' ? 'https' : 'http');

  const forwardHeaders: Record<string, string> = {
    cookie: cookieHeader ?? '',
  };

  const testHeader = headerBag.get('x-test-admin-email');
  if (testHeader) {
    forwardHeaders['x-test-admin-email'] = testHeader;
  }

  const response = await fetch(
    `${protocol}://${host}/api/admin/guardrails/block-reasons`,
    {
      headers: forwardHeaders,
      cache: 'no-store',
    },
  ).catch(() => null);

  if (!response || !response.ok) {
    return { data: [], windowHours: 24 };
  }

  const payload = (await response.json().catch(() => ({
    data: [],
    windowHours: 24,
  }))) as BlockReasonResponse;
  return payload;
}

function summarizeMetrics(rows: MetricRow[]) {
  if (!rows.length) {
    return {
      totalRequests: 0,
      offTopicRate: 0,
      avgOnTopic: 0,
      rateLimitedPerHour: 0,
      moderationPerHour: 0,
      blockedCount: 0,
      estimatedSpendSavings: 0,
    };
  }

  let totalRequests = 0;
  let totalOffTopic = 0;
  let weightedOnTopicScore = 0;
  let hours = 0;
  let totalRateLimited = 0;
  let totalModeration = 0;
  let totalBlocked = 0;

  for (const row of rows) {
    const requests = Number(row.total_requests) || 0;
    const offTopic = Number(row.off_topic_count) || 0;
    const avgScore = Number(row.avg_on_topic_score) || 0;
    const rateLimited = Number(row.rate_limited_count) || 0;
    const moderationFlags = Number(row.moderation_flag_count) || 0;
    const blocked = Number(row.blocked_count) || 0;

    totalRequests += requests;
    totalOffTopic += offTopic;
    totalRateLimited += rateLimited;
    totalModeration += moderationFlags;
    totalBlocked += blocked;

    if (requests > 0) {
      weightedOnTopicScore += avgScore * requests;
    }

    hours += 1;
  }

  const offTopicRate =
    totalRequests > 0 ? totalOffTopic / totalRequests : 0;

  const avgOnTopic =
    totalRequests > 0 ? weightedOnTopicScore / totalRequests : 0;

  const rateLimitedPerHour =
    hours > 0 ? totalRateLimited / hours : totalRateLimited;

  const moderationPerHour =
    hours > 0 ? totalModeration / hours : totalModeration;

  const guardrailsConfig = getGuardrailsConfig();
  const spendSavings =
    totalBlocked *
    (guardrailsConfig?.costPerRequestEstimate ?? SPEND_SAVINGS_DEFAULT);

  return {
    totalRequests,
    offTopicRate,
    avgOnTopic,
    rateLimitedPerHour,
    moderationPerHour,
    blockedCount: totalBlocked,
    estimatedSpendSavings: spendSavings,
  };
}

function formatPercent(value: number) {
  if (!Number.isFinite(value)) return '0%';
  return `${(value * 100).toFixed(1)}%`;
}

function formatCurrency(value: number) {
  return `$${value.toFixed(2)}`;
}

export default async function ObservabilityPage() {
  const headerBag = headers();
  const cookieHeader = headerBag.get('cookie') ?? null;

  const [metrics, blockReasons] = await Promise.all([
    fetchGuardrailMetrics(),
    fetchBlockReasons(headerBag, cookieHeader),
  ]);

  const summary = summarizeMetrics(metrics);
  const guardrails = getGuardrailsConfig();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-neutral-900">
          Guardrail Observability
        </h1>
        <p className="text-sm text-neutral-600">
          Monitor guardrail telemetry. Data aggregates per hour and omits any
          prompt or IP level details.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <article className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-medium text-neutral-600">
            Off-topic Rate
          </h3>
          <p className="mt-2 text-2xl font-semibold text-neutral-900">
            {formatPercent(summary.offTopicRate)}
          </p>
          <p className="text-xs text-neutral-500">
            {summary.totalRequests} requests analysed
          </p>
        </article>

        <article className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-medium text-neutral-600">
            Avg. On-topic Score
          </h3>
          <p className="mt-2 text-2xl font-semibold text-neutral-900">
            {summary.avgOnTopic.toFixed(3)}
          </p>
          <p className="text-xs text-neutral-500">
            Weighted by hourly request volume
          </p>
        </article>

        <article className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-medium text-neutral-600">
            Rate-limited / Hour
          </h3>
          <p className="mt-2 text-2xl font-semibold text-neutral-900">
            {summary.rateLimitedPerHour.toFixed(2)}
          </p>
          <p className="text-xs text-neutral-500">Across the last 7 days</p>
        </article>

        <article className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-medium text-neutral-600">
            Moderation Flags / Hour
          </h3>
          <p className="mt-2 text-2xl font-semibold text-neutral-900">
            {summary.moderationPerHour.toFixed(2)}
          </p>
          <p className="text-xs text-neutral-500">Across the last 7 days</p>
        </article>

        <article className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-medium text-neutral-600">
            Blocks Recorded
          </h3>
          <p className="mt-2 text-2xl font-semibold text-neutral-900">
            {summary.blockedCount}
          </p>
          <p className="text-xs text-neutral-500">
            Summed from hourly aggregations
          </p>
        </article>

        <article className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-medium text-neutral-600">
            Estimated Spend Savings
          </h3>
          <p className="mt-2 text-2xl font-semibold text-neutral-900">
            {formatCurrency(summary.estimatedSpendSavings)}
          </p>
          <p className="text-xs text-neutral-500">
            Using {formatCurrency(guardrails.costPerRequestEstimate)} per blocked request
          </p>
        </article>
      </div>

      <section className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
        <header className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-neutral-800">
              Block Reasons (last {blockReasons.windowHours}h)
            </h2>
            <p className="text-sm text-neutral-500">
              Counts aggregated from guardrail logs. No prompt content is stored.
            </p>
          </div>
        </header>
        <div className="mt-4 space-y-3">
          {blockReasons.data.length === 0 && (
            <p className="text-sm text-neutral-500">
              No recent blocks recorded.
            </p>
          )}
          {blockReasons.data.map((entry) => (
            <div
              key={entry.reason}
              className="flex items-center justify-between rounded-md border border-neutral-100 bg-neutral-50 px-3 py-2 text-sm"
            >
              <span className="font-medium text-neutral-700">
                {entry.reason}
              </span>
              <span className="text-neutral-600">{entry.count}</span>
            </div>
          ))}
        </div>
      </section>

      <GuardrailControls
        initialSimilarityThreshold={guardrails.guardSimilarityThreshold}
        initialBlockAfterThree={guardrails.guardBlockAfterThree}
      />
    </div>
  );
}
