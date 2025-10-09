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
