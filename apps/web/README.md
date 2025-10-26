# Savr Web (Phase 4 scaffold)

Minimal Next.js 14 app router shell with Tailwind, Supabase client wiring, and guardrail-aware routing.

## Quick start

```bash
# from repo root
cp apps/web/.env.example apps/web/.env.local
```

Edit `apps/web/.env.local` and set:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
REQUIRE_AUTH=false
```

Setting `REQUIRE_AUTH=false` leaves the dashboard open so you can review the placeholder UI immediately. Turn it to `true` later when you integrate Supabase auth.

Install dependencies and start the dev server:

```bash
npm install
cd apps/web
npm run dev
```

Visit http://localhost:3000/dashboard to inspect the Phase 4 placeholder dashboard.
