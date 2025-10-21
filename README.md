# Savr

## Database Setup (Local)

1. **Install Supabase CLI**  
   - Follow the official guide for your platform: https://supabase.com/docs/guides/cli  
   - For example, using npm: `npm install -g supabase`
2. **Start local Supabase services**  
   - Run `supabase start`
3. **Apply database migrations**  
   - Reset and seed from scratch: `supabase db reset`  
   - Apply new migrations without reset: `supabase db push`
4. **Security notes**  
   - RLS is enabled on all tables.  
   - Policies ensure users can only access their own records.  
   - The service role key must never be exposed or used in client-side code.

### /api/meals/generate
POST with `Authorization: Bearer <JWT>`

Example body:
```json
{
  "meals": 5,
  "budget_total": 200,
  "diet": "high_protein",
  "excluded_ingredients": ["seafood"]
}
```

Response:
```json
{
  "cache_hit": false,
  "meals": [ ...recipe objects... ]
}
```

Notes:
- Requires user authentication.
- Validates input with Zod.
- Returns cached plans when available.

### /api/meals/from-pantry
POST with `Authorization: Bearer <JWT>`

Body:
```json
{
  "meals": 3,
  "include_images": false
}
```

Response:
```json
{
  "meals": [...],
  "grocery_list": [...]
}
```

Notes:
- Uses items stored in `user_pantry`.
- Suggests minimal extra ingredients.
- Requires authentication.
- Validates all data and enforces RLS.

## Image Pipeline & Budget Management

The image subsystem ensures every meal card can display a relevant photo while keeping generation costs bounded. Incoming requests first reuse any cached recipe image, then waterfall through stock providers, and finally fall back to AI generation only when spend limits allow.

**Required environment variables**
- `PEXELS_API_KEY`
- `UNSPLASH_ACCESS_KEY`
- `PIXABAY_API_KEY`
- `OPENAI_API_KEY`
- `MAX_IMAGE_SPEND_MONTH` (overrides the default monthly cap stored in `system_limits`)

Stock imagery from Pexels → Unsplash → Pixabay is always preferred. If no safe match (≥1024px, ~1:1 or 4:3) is available, the Edge Function checks `system_limits` and `user_image_quota` before issuing an OpenAI Images request. When the monthly cap is reached or generation is disabled, category placeholders are returned instead of new renders. Image generation runs entirely on backend infrastructure; public clients never invoke these providers directly.

**Helpful CLI commands**
```bash
# Re-apply the latest image schema changes
supabase db push

# Exercise the image Edge Function locally (requires auth JWT)
supabase functions serve --env-file .env.local api/images/fetch-or-generate
curl -s -X POST http://localhost:54321/functions/v1/api/images/fetch-or-generate \
  -H "Authorization: Bearer $USER_JWT" \
  -H "Content-Type: application/json" \
  -d '{"recipe_id":"<uuid>","recipe_name":"Spiced Lentils","category":"vegan"}'
```

## Phase 3 - Grocery Aggregation

Savr now normalizes grocery items across meals, tracks plan-level selections, and optionally persists lists for later reference.

**New Edge Functions**
- `POST /api/groceries/aggregate`
- `GET /api/groceries/plan/:plan_id`

**Grocery Aggregation Flow**
1. Collect recipes by meal IDs or a saved plan.
2. Normalize ingredient names (aliases, plurals) and parse quantity + unit strings.
3. Convert to canonical units (`g`, `ml`, `tbsp`, `tsp`, `cup`, `item`).
4. Merge like items, track contributing meal IDs, and estimate total cost.
5. Optionally insert records into `grocery_lists` and `grocery_list_items`.

**Example: POST /api/groceries/aggregate**
```bash
curl -s -X POST http://localhost:54321/functions/v1/api/groceries/aggregate \
  -H "Authorization: Bearer $USER_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "meal_ids": ["6a4d...", "8b9f..."],
    "already_have": [{"name": "salt"}]
  }'
```
Response snippet:
```json
{
  "list_id": "3db1...",
  "estimated_total_cost": 24.75,
  "items": [
    {
      "name": "olive oil",
      "amount": 45,
      "unit": "ml",
      "notes": null,
      "source_meal_ids": ["6a4d...", "8b9f..."]
    }
  ]
}
```

**Example: GET /api/groceries/plan/:plan_id**
```bash
curl -s -X GET "http://localhost:54321/functions/v1/api/groceries/plan/7c2e...?persist=true" \
  -H "Authorization: Bearer $USER_JWT"
```
Response snippet:
```json
{
  "plan_id": "7c2e...",
  "list_id": "5f1b...",
  "estimated_total_cost": 31.40,
  "items": [
    {
      "name": "chicken breast",
      "amount": 1500,
      "unit": "g",
      "source_meal_ids": ["de12...", "ab34..."]
    }
  ]
}
```

**Notes**
- `already_have` names are normalized before filtering, so "Salt" and "salt" are treated the same.
- Amount parsing accepts inputs like `"1 1/2 tbsp"`, `"400 g"`, and `"1 can (15 oz)"`.
- Unknown units fall back to raw notes; conflicting units add explanatory notes.

## Quickstart - Phase 3

```bash
# Apply the new meal plan + grocery tables
supabase db migration up 0003_groceries

# Aggregate groceries directly from meal IDs
curl -s -X POST http://localhost:54321/functions/v1/api/groceries/aggregate \
  -H "Authorization: Bearer $USER_JWT" \
  -H "Content-Type: application/json" \
  -d '{"meal_ids": ["6a4d...", "8b9f..."], "persist": false}'

# Generate a grocery list from a saved plan
curl -s -X GET "http://localhost:54321/functions/v1/api/groceries/plan/7c2e...?persist=true" \
  -H "Authorization: Bearer $USER_JWT"
```

## Phase 1 Verification Checklist
- [x] Supabase local runs (`supabase start`)
- [x] Migrations applied successfully
- [x] JWT auth verified
- [x] /api/meals/generate returns structured data
- [x] /api/meals/from-pantry uses stored pantry
- [x] Logs redact sensitive data
- [x] Zod validation in place
- [x] Unit tests pass

## Phase 4 — Guardrails and Observability

Savr’s guardrail layer defends the conversational endpoints while keeping telemetry anonymized and actionable.

### Allowed Topics
- Recipes & meal planning
- Pantry / on-hand ingredients
- Groceries & shopping lists
- Nutrition & macros
- Food profiles, dietary restrictions, budget guidance

### Refusal Codes
| Code | Meaning |
| --- | --- |
| `OFF_TOPIC` | Prompt falls outside supported food domains |
| `BLOCKED` | Provider or local moderation flagged the content |
| `INJECTION` | Prompt-injection heuristic triggered (`ignore previous…`, etc.) |
| `429_RATE_LIMITED` | User/IP exceeded sliding-window request limits |
| `402_BUDGET_CAP` | Monthly text budget or system spend cap reached |
| `INVALID_FORMAT` | Request body failed schema validation |
| `TOO_LONG` | Prompt exceeded max length (1,500 chars) |

### Environment Variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `EMBEDDINGS_MODEL` | `gpt-embedding-3-small` | Guardrail embeddings provider |
| `MODERATION_MODEL` | `omni-moderation-latest` | Moderation provider model |
| `GUARD_SIMILARITY_THRESHOLD` | `0.35` | Min cosine score (scaled [0,1]) for on-topic prompts |
| `GUARD_BLOCK_AFTER_THREE` | `true` | After three consecutive off-topic attempts, auto-block |
| `REQUESTS_PER_30S` | `5` | Sliding-window limit per user/IP hash (30 seconds) |
| `REQUESTS_PER_DAY` | `100` | Daily per user/IP hash limit |
| `IP_HASH_SALT` | _required_ | Salted HMAC key for IP hashing |
| `TEXT_TOKEN_BUDGET_MONTH` | `150000` | Monthly text token budget (in-memory counter) |
| `GUARD_COST_PER_REQUEST` | `0.05` | Estimated cost per text request (USD) |
| `ALLOWED_ADMIN_EMAILS` | _(none)_ | Comma-separated emails allowed in admin dashboard |

### Admin Dashboard
- Route: `/admin/observability`
- Shows hourly guardrail metrics: off-topic %, moderation flags, rate limits, blocks, spend savings.
- Guard controls let admins adjust similarity threshold & “block after three” at runtime (in-memory).
- Access requires Supabase-authenticated users whose email appears in `ALLOWED_ADMIN_EMAILS`; middleware returns 404 otherwise.

### Privacy Commitments
- No raw prompts or IP addresses are logged.
- Only salted `ip_hash` values (SHA-256 HMAC) are stored alongside guard metadata.
- Observability view exposes aggregates only—no per-user or prompt data.


