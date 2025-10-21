-- 1) Extend meal_gen_log with guardrail metadata
ALTER TABLE public.meal_gen_log
  ADD COLUMN IF NOT EXISTS intent TEXT,
  ADD COLUMN IF NOT EXISTS on_topic_score NUMERIC,
  ADD COLUMN IF NOT EXISTS moderation_flag BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS rate_limit_hit BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS block_reason TEXT,
  ADD COLUMN IF NOT EXISTS ip_hash TEXT;

-- 2) Create a narrow view for observability (no raw prompts)
DROP VIEW IF EXISTS public.meal_guardrail_metrics_v;
CREATE VIEW public.meal_guardrail_metrics_v AS
SELECT
  date_trunc('hour', created_at) AS hour_bucket,
  COUNT(*)                                        AS total_requests,
  COUNT(*) FILTER (WHERE intent IS NULL OR intent = 'OFF_TOPIC') AS off_topic_count,
  ROUND(AVG(NULLIF(on_topic_score, 0))::NUMERIC, 4)              AS avg_on_topic_score,
  COUNT(*) FILTER (WHERE rate_limit_hit)                         AS rate_limited_count,
  COUNT(*) FILTER (WHERE moderation_flag)                        AS moderation_flag_count,
  COUNT(*) FILTER (WHERE block_reason IS NOT NULL)               AS blocked_count,
  SUM(CASE WHEN block_reason IS NOT NULL THEN 1 ELSE 0 END)      AS estimated_spend_savings_events
FROM public.meal_gen_log
GROUP BY 1
ORDER BY 1 DESC;

-- Notes:
-- - ip_hash is written by server code (salted hash); never store raw IP or raw prompts.
-- - View only exposes aggregates/hourly buckets; consumers must have appropriate RLS/role.
