# AI Meal Prep Assistant

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
POST with Authorization: Bearer <JWT>

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
- Uses items stored in user_pantry.
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

## Phase 1 Verification Checklist
- [x] Supabase local runs (`supabase start`)
- [x] Migrations applied successfully
- [x] JWT auth verified
- [x] /api/meals/generate returns structured data
- [x] /api/meals/from-pantry uses stored pantry
- [x] Logs redact sensitive data
- [x] Zod validation in place
- [x] Unit tests pass


test
