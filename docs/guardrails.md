# Guardrail Architecture

Savr wraps every conversational route handler with a reusable guard pipeline that keeps requests within supported domains, rejects harmful or policy-violating content, and records minimal telemetry.

```
Incoming Request
   │
   ├─ Sanitize input (trim, strip URLs/HTML, length check)
   ├─ Moderation check (local blocklist + provider)
   ├─ Injection heuristics (“ignore previous…”, tool-call directives, HTML/URLs)
   ├─ Topic scoring (embeddings vs canonical topics ⇒ cosine similarity)
   ├─ Rate limiting (sliding window keyed by salted IP hash & user)
   ├─ Budget cap (Supabase system_limits + in-memory token budget)
   ├─ Intent classification (keyword routing + similarity fallback)
   │
   └─ Route handler invoked with `req.savr.guard` metadata
         └─ Guard logger writes anonymized entry (intent, score, ip_hash, decision)
```

If any step fails, the pipeline short-circuits, returns a standardized error payload, and logs the guard decision (without storing raw prompts or IPs). Successful requests continue to the route handler, which can inspect `req.savr.guard` for guard metadata.

## Intent Mapping

`classifyIntent` combines lightweight keyword routing with topic similarity:

| Intent | Keywords / Conditions | Example Prompt |
| --- | --- | --- |
| `FROM_PANTRY` | `pantry`, `cupboard`, `on hand` | “What can I cook with pantry staples tonight?” |
| `GROCERY_AGG` | `grocery`, `list`, `cart`, `aggregate` | “Combine my grocery list for these meals” |
| `PROFILE` | `profile`, `preferences`, `diet`, `allergy`, `restrictions` | “Update my profile to dairy-free high protein” |
| `MEAL_GENERATE` | `meal`, `recipe`, `plan`, `cook`, or fallback when on-topic score ≥ threshold | “Plan four balanced dinners under $80” |
| `OFF_TOPIC` | Score below threshold & no keyword match | “Help me fix my smartphone” |

The chat relay endpoint uses the classified intent to forward prompts to the appropriate handler (meal generation, pantry mode, grocery aggregation, or profile update).

## Tuning Guardrails

- **Raising the similarity threshold** (`GUARD_SIMILARITY_THRESHOLD`) narrows accepted prompts to tightly aligned cooking topics. Useful when the model starts drifting into unrelated chat. Watch OFF_TOPIC rates and user feedback.
- **Lowering the threshold** relaxes the guard, which can improve recall for borderline prompts (e.g., nutrition questions phrased oddly) at the cost of more off-topic content slipping through.
- **Block-after-three** (`GUARD_BLOCK_AFTER_THREE`) controls whether repeated off-topic attempts are automatically refused after three consecutive misses. Disable it if users often “warm up” with exploratory prompts; enable it to deter persistent abuse or misaligned usage.
- **Rate limits** (Requests per 30s/day) protect from bursts. Move to a distributed data store when vertically scaling.

## Production Considerations

- **Rate limiting & counters:** The current implementation uses an in-memory `Map`. In multi-instance deployments, replace with a shared store (Redis, Supabase KV, Cloudflare KV/Workers Durable Objects, Vercel Edge Config, etc.).
- **Guard config toggles:** Runtime setters mutate in-memory state for fast iteration. For production, persist guardrail settings in a secrets manager, environment configuration system, or a secure database table so they survive process restarts.
- **Logging:** Guard logger uses the Supabase service role to insert into `meal_gen_log`. Ensure the service key stays server-side only.
