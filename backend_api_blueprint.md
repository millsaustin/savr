# Backend API Blueprint — AI Meal Prep Assistant (MVP)

Stack assumptions locked for MVP:
- **Frontend**: Next.js on Vercel
- **Backend APIs**: Supabase Edge Functions (TypeScript)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (JWT)
- **Storage**: Supabase Storage (S3-compatible) for images
- **AI Provider**: OpenAI (abstracted provider layer for future swap)
- **Queues / Cron**: Supabase Scheduled Functions (for image jobs & cleanups)

> Goal: One clear contract Codex can implement without guessing. Covers endpoints, payloads, auth, limits, and cross-module flows (meals ↔ images ↔ pantry ↔ grocery).

---

## 0) Conventions

- **Auth**: Bearer JWT from Supabase Auth in `Authorization: Bearer <token>` (unless noted public).
- **Content-Type**: `application/json`.
- **IDs**: UUID v4.
- **Timestamps**: ISO 8601 UTC.
- **Errors (uniform)**:
```json
{ "error": { "code": "STRING_CODE", "message": "Human-readable message", "details": { } } }
```
- **Pagination**: `?limit=20&cursor=<opaque>` for list endpoints.
- **Feature flags**: stored in DB (e.g., `system_limits.allow_generation`).

---

## 1) Auth & Profile

### 1.1 `GET /api/me/auth`
Returns the current user profile (server verifies Supabase JWT).

**Response 200**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "created_at": "2025-10-06T15:20:00Z"
  },
  "profile": {
    "display_name": "Austin",
    "personality_level": 50,
    "diet_preferences": ["high_protein"],
    "allergies": ["peanut"],
    "budget_default": 200
  }
}
```

### 1.2 `PATCH /api/me/profile`
Update optional profile metadata.

**Body**
```json
{
  "display_name": "Austin",
  "personality_level": 70,
  "diet_preferences": ["high_protein", "mediterranean"],
  "allergies": ["peanut"],
  "budget_default": 250
}
```

**Response 200**
```json
{ "ok": true }
```

---

## 2) Pantry-to-Plate

### 2.1 `POST /api/pantry/ingest`
Store/replace the user’s pantry list.

**Body**
```json
{
  "items": [
    {"ingredient_name": "chicken breast", "quantity": "2 lb", "location": "fridge"},
    {"ingredient_name": "rice", "quantity": "3 cups", "location": "pantry"}
  ]
}
```

**Response 200**
```json
{ "ok": true, "count": 2 }
```

### 2.2 `GET /api/pantry`
Fetch current pantry for the user.

**Response 200**
```json
{
  "items": [
    {"id": "uuid", "ingredient_name": "chicken breast", "quantity": "2 lb", "location": "fridge", "last_updated": "2025-10-06T15:20:00Z"}
  ]
}
```

### 2.3 `POST /api/meals/from-pantry`
Generate meals using pantry items; suggest minimal extras.

**Body**
```json
{
  "meals": 3,
  "include_images": true
}
```

**Response 200**
```json
{
  "meals": [
    {
      "id": "uuid",
      "name": "Garlic Chicken & Broccoli Rice",
      "ingredients_used": ["chicken breast", "broccoli", "rice"],
      "extra_ingredients": [{"name": "garlic", "amount": "2", "unit": "cloves"}],
      "instructions": "…",
      "macros": {"calories": 780, "protein": 62, "carbs": 68, "fat": 24},
      "estimated_cost_new_items": 3.20,
      "image_url": "https://cdn/…/img.jpg"
    }
  ],
  "grocery_list": [
    {"name": "garlic", "amount": "2", "unit": "cloves", "aggregate": true}
  ]
}
```

Errors:
- `402_BUDGET_CAP_IMAGE_GEN` if monthly image budget reached and placeholders used.

---

## 3) Meal Generation (Hybrid)

### 3.1 `POST /api/meals/generate`
Rule-driven outline + OpenAI creative fill. Caches by constraint hash.

**Body**
```json
{
  "meals": 5,
  "budget_total": 200,
  "calories_per_meal": 800,
  "diet": "high_protein",
  "excluded_ingredients": ["seafood"],
  "include_images": true
}
```

**Response 200**
```json
{
  "plan_id": "uuid",
  "meals": [
    {
      "id": "uuid",
      "name": "Turkey Chili with Black Beans",
      "ingredients": [
        {"name": "ground turkey", "amount": "1", "unit": "lb", "cost_estimate": 4.50},
        {"name": "black beans", "amount": "2", "unit": "cups", "cost_estimate": 1.20}
      ],
      "instructions": "…",
      "macros": {"calories": 790, "protein": 55, "carbs": 65, "fat": 24},
      "estimated_cost": 7.20,
      "image_url": "https://cdn/…/img.jpg"
    }
  ],
  "estimated_total_cost": 185.40,
  "cache_hit": false
}
```

Validation failures return `400_INVALID_CONSTRAINTS`.

### 3.2 `GET /api/meals/plan/:plan_id`
Fetch a prior generated plan (for dashboard/history).

**Response 200**
```json
{ "plan_id": "uuid", "created_at": "2025-10-06T15:20:00Z", "meals": [ … ] }
```

---

## 4) Favorites & History

### 4.1 `POST /api/meals/:meal_id/favorite`
Toggle favorite.

**Body**
```json
{ "favorite": true }
```

**Response 200**
```json
{ "ok": true, "favorite": true }
```

### 4.2 `GET /api/me/favorites?limit=20&cursor=…`
Return favorite meals with thumbnails.

**Response 200**
```json
{
  "items": [
    {"meal_id": "uuid", "name": "Turkey Chili", "image_url": "…", "macros": {"calories": 790, "protein": 55}} 
  ],
  "next_cursor": null
}
```

### 4.3 `GET /api/me/history?limit=20&cursor=…`
Recent generated meals (implicit learning).

**Response 200**
```json
{ "items": [ { "meal_id": "uuid", "generated_at": "…", "name": "…", "image_url": "…" } ], "next_cursor": null }
```

---

## 5) Grocery List

### 5.1 `POST /api/groceries/aggregate`
Aggregate ingredients across selected meals; subtract items marked “already have”.

**Body**
```json
{
  "meal_ids": ["uuid1", "uuid2", "uuid3"],
  "already_have": [{"name": "olive oil"}, {"name": "salt"}]
}
```

**Response 200**
```json
{
  "items": [
    {"name": "chicken breast", "amount": "2", "unit": "lb"},
    {"name": "garlic", "amount": "2", "unit": "cloves"}
  ],
  "estimated_total_cost": 42.80
}
```

### 5.2 `GET /api/groceries/plan/:plan_id`
Convenience endpoint to build groceries from a stored plan.

**Response 200**
```json
{ "items": [ … ], "estimated_total_cost": 184.90 }
```

---

## 6) Images (Hybrid Sourcing + Budget Gate)

These are **internal** functions called by meal generation flows (not public endpoints in MVP).

- **Stock-first search**: Pexels → Unsplash → Pixabay
- **Fallback generation**: OpenAI / Stability
- **Placeholder**: category image if budget exceeded or generation fails
- **Budget gate**: `system_limits.allow_generation === true && current_spend < max_monthly_spend`

**Sequence (text)**:
```
check recipes.image_id → if missing:
  try stockSearch(tags)
    if hit → save images(source='stock')
    else if budget_ok → generate via AI → images(source='generated') + log cost
    else → assign placeholder (source='placeholder')
update recipes.image_id → return URL
```

---

## 7) Rate Limits & Quotas

- **Guests**: 5 plan generations/day; images may show placeholders if budget ceiling reached.
- **Free Users**: 15 generations/day; image generation allowed until global cap.
- **Premium (future)**: Higher limits + priority image generation.

**Tables**:
- `user_image_quota`: `{ user_id, month, images_generated, quota_limit }`
- `meal_gen_log`: tracks meal generation cost/tokens.

Errors:
- `429_RATE_LIMITED`
- `402_BUDGET_CAP_IMAGE_GEN`

---

## 8) Provider Abstraction (Text & Pseudocode)

**Environment**:
```
OPENAI_API_KEY=…
MODEL_PROVIDER=openai
TEXT_MODEL=gpt-4o-mini   # example fast creative model
IMAGE_PROVIDER=openai    # or 'stability'
MAX_IMAGE_SPEND_MONTH=300
```

**TypeScript sketch**:
```ts
// provider/text.ts
export async function generateText({system, user, temperature = 0.8}) {
  if (process.env.MODEL_PROVIDER === "openai") {
    // OpenAI client call here
  } else {
    // other providers
  }
}

// provider/image.ts
export async function getImageForRecipe(meta) {
  const stock = await searchStock(meta.tags);
  if (stock) return stock;
  if (!(await canGenerateMoreImages())) return placeholder(meta.category);
  const url = await generateViaAI(meta.prompt);
  await logCost(meta.estimatedCost);
  return url;
}
```

---

## 9) Database (Key Tables Summary)

Only deltas beyond standard user/profile are shown here.

### `recipes`
- `id` (uuid, pk), `name` (text), `category` (text)
- `ingredients` (jsonb), `instructions` (text)
- `macros` (jsonb), `cost_estimate` (numeric)
- `image_id` (uuid fk → images.id), `created_at` (timestamptz)

### `images`
- `id`, `recipe_id` (fk), `category`, `url`, `hash`
- `source` enum('stock','generated','placeholder')
- `stock_provider`, `photographer_name`, `license_url`
- `prompt`, `style_version`, `cost_estimate` (numeric)
- `generated_at`, `last_used`

### `image_gen_log`
- `id`, `image_id`, `api_provider`, `tokens_used`, `cost_estimate`, `success`, `error_message`, `created_at`

### `system_limits`
- `id`, `month`, `max_monthly_spend`, `current_spend`, `allow_generation`, `updated_at`

### `user_image_quota`
- `user_id`, `month`, `images_generated`, `quota_limit`, `last_reset`

### `meal_gen_log`
- `id`, `user_id`, `prompt_hash`, `model`, `tokens_used`, `cost_estimate`, `created_at`

### `user_favorites`
- `user_id`, `meal_id`, `favorited_at`

### `user_pantry`
- `id`, `user_id`, `ingredient_name`, `quantity`, `location`, `last_updated`

---

## 10) Security & Privacy Notes

- Enable **Row Level Security (RLS)** on all user-owned tables; policies scoped to `auth.uid()`.
- Store only **non-sensitive** health data at MVP (diet tags, allergies). No medical claims.
- **CORS**: Restrict to your Vercel domain(s) for public endpoints.
- Audit log: log model calls & image cost to guardrails dashboards.

---

## 11) Testing & Observability

- Add a **/api/health** endpoint returning DB & provider status.
- Log: request id, user id (if any), latency, tokens, image spend deltas.
- Synthetic tests: nightly meal generation smoke test (1 plan) with generation disabled for images.

---

## 12) Rollout Plan (MVP)

1) Implement `/api/meals/generate` and `/api/meals/from-pantry` first (text-only).  
2) Add image pipeline (stock-first + AI fallback + budget gate).  
3) Add favorites/history endpoints.  
4) Add groceries aggregation.  
5) Hook up dashboard UI to these endpoints.  
6) Toggle quotas and invite testers.

---

## 13) Example Request/Response (End-to-End)

**Request**
`POST /api/meals/generate`
```json
{
  "meals": 5,
  "budget_total": 200,
  "calories_per_meal": 800,
  "diet": "high_protein",
  "include_images": true
}
```

**Response**
```json
{
  "plan_id": "6a2a2c3b-42b4-4b1c-87d7-58a1a8e0f9b0",
  "meals": [
    {
      "id": "8c7d9d1d-37c8-4b7f-8e67-2f3b4a945f1e",
      "name": "Harissa Chicken with Herbed Couscous",
      "ingredients": [
        {"name": "chicken thigh", "amount": "1", "unit": "lb", "cost_estimate": 4.10},
        {"name": "couscous", "amount": "2", "unit": "cups", "cost_estimate": 1.40}
      ],
      "instructions": "…",
      "macros": {"calories": 810, "protein": 54, "carbs": 66, "fat": 28},
      "estimated_cost": 7.00,
      "image_url": "https://cdn/…/harissa.jpg"
    }
  ],
  "estimated_total_cost": 187.00,
  "cache_hit": false
}
```

---

## 14) Nice-to-haves (Phase 2+)

- Stripe-powered premium tier (higher quotas, grocery integrations)
- Real-store pricing (Walmart/Instacart) replacing regional estimates
- Multi-week planning & macro dashboards
- User photo uploads & community recipes (moderation queue)
- Seasonal suggestions (“fall soups”, “summer grills”)

---

**This file is the single source of truth for Codex.**  
If anything changes (new field, behavior tweak), update this blueprint first, then regenerate code.
