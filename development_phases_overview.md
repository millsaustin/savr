# AI Meal Prep Assistant — Full Development Phases Overview

**Project Owner:** Austin Mills  
**Model Partner:** GPT‑5 / Codex  
**Purpose:** Multi‑phase roadmap for the AI Meal Prep Assistant project, defining each stage of buildout with clear goals, deliverables, and dependencies.

---

## 🧠 Project Summary

The AI Meal Prep Assistant is a conversational, intelligent meal planning platform designed to help users plan meals, manage budgets, and use ingredients they already own.

The application merges **AI creativity** with **structured logic**, creating a system that feels like a human sous‑chef — witty, personal, and practical.

Each phase below builds upon the previous, progressively turning the system from a proof‑of‑concept into a full production platform.

---

## 🧩 Phase 1 — Core Backend (Brains Online)

### **Goal**
Establish the backend foundation, enabling dynamic meal generation and pantry‑based cooking suggestions.

### **Deliverables**
- `/api/meals/generate` endpoint — hybrid rule‑driven + AI meal generation.  
- `/api/meals/from-pantry` endpoint — Pantry‑to‑Plate flow using existing ingredients.  
- Supabase database schema and Auth integration.  
- OpenAI provider abstraction (replaceable later).  
- Logging and caching structure (`meal_gen_log`).  
- Schema migrations and environment configuration.  
- Unit tests and mock validations.

### **Dependencies**
- Supabase project initialized.  
- OpenAI API key + environment variables configured.

### **Completion Criteria**
- Backend can accept structured JSON requests and return valid meal plan data.  
- Data stored in Supabase tables (`recipes`, `meal_gen_log`, `user_pantry`).  
- Responses follow standard payload structure from API blueprint.

---

## 🎨 Phase 2 — Image Pipeline Integration

### **Goal**
Add visuals and control image generation costs using stock + AI images.

### **Deliverables**
- `/api/images/fetch-or-generate` internal function.  
- Stock‑photo search pipeline (Pexels → Unsplash → Pixabay).  
- AI‑generation fallback (OpenAI / Stability).  
- `system_limits` and `user_image_quota` tables.  
- Budget gating (monthly cap + quota reset).  
- Image caching and placeholder logic.  
- Integration into `/api/meals/generate` output (image_url per meal).

### **Dependencies**
- Phase 1 backend stable and tested.  
- Image API keys configured.

### **Completion Criteria**
- Each meal returns a valid image URL.  
- Budget gate halts AI generation when monthly cap is reached.  
- Logs track image spend per user and globally.

---

## 🛒 Phase 3 — Grocery List & Aggregation

### **Goal**
Convert meals into actionable grocery lists while minimizing redundant ingredients.

### **Deliverables**
- `/api/groceries/aggregate` endpoint.  
- `/api/groceries/plan/:plan_id` endpoint.  
- Ingredient normalization + unit aggregation logic.  
- “Already have” item filtering.  
- Grocery list cost estimator.  
- Output structure compatible with dashboard UI.  

### **Dependencies**
- Phase 1 meal generation data.  
- Pantry + recipe tables populated.

### **Completion Criteria**
- Aggregated grocery list returned for any meal plan.  
- Estimated cost totals accurate within ±10% margin.  
- Reuse of items properly reflected across meals.

---

## 🧑‍🍳 Phase 4 — Dashboard & Chat Frontend (Lifestyle UI)

### **Goal**
Create a warm, conversational front‑end experience centered around a witty sous‑chef personality.

### **Deliverables**
- Next.js app (Vercel deployment).  
- Landing page with tagline + “Start Cooking” CTA.  
- `/assistant` chat interface (real‑time streaming).  
- `/dashboard` lifestyle page with:  
  - Favorites grid  
  - Recent meals carousel  
  - “Your Week” meal planner view  
  - Pantry manager + grocery list widget  
  - Personality slider (0–100%)  
- Responsive layout for mobile and desktop.  
- Supabase Auth (magic links, social logins).  

### **Dependencies**
- Phase 1–3 APIs functional.  
- OpenAI + Supabase configured client‑side.

### **Completion Criteria**
- Fully interactive UI connected to backend.  
- Users can log in, plan meals, chat, and see grocery lists.  
- Personality slider dynamically adjusts tone.

---

## ❤️ Phase 5 — Personalization, Favorites & Quotas

### **Goal**
Enable the system to learn from user habits and personalize results.

### **Deliverables**
- `/api/me/favorites`, `/api/me/history`, `/api/me/profile` endpoints.  
- User preferences stored in Supabase (`user_profile`).  
- Favorites and history tables linked to dashboard.  
- Per‑user quota and monthly usage tracking.  
- “Refine my last plan” and “Cook something like last week” features.  

### **Dependencies**
- Auth and database persistence (Phase 1).  
- Functional UI (Phase 4).

### **Completion Criteria**
- Personalized meal recommendations based on prior likes.  
- Quotas applied correctly (requests/day).  
- Dashboard reflects past meals and favorited recipes.

---

## 💵 Phase 6 — Monetization & Scaling

### **Goal**
Introduce a premium tier, improve reliability, and prepare for production.

### **Deliverables**
- Stripe integration for paid subscriptions.  
- Tier‑based quotas and image generation caps.  
- Usage analytics dashboard (admin view).  
- Scheduled health checks and backups.  
- CI/CD integration for staging and production.  
- Monitoring (logs, error tracking, uptime).  

### **Dependencies**
- Phase 1–5 complete and stable.  

### **Completion Criteria**
- Users can upgrade to premium.  
- Stripe payments functional.  
- Error logs and backups active.  
- System stable under 500+ concurrent sessions.

---

## 🤖 Phase 7 — Advanced AI Features (Stretch Goals)

### **Goal**
Enhance the system’s intelligence and interactivity.

### **Potential Features**
- **Visual Pantry:** Image recognition of ingredients using uploaded photos.  
- **Voice Input:** Conversational meal requests via speech‑to‑text.  
- **Macro‑Balancer:** AI validates and rebalances nutritional breakdowns.  
- **Seasonal Suggestions:** Recommendations based on seasonality or region.  
- **Multi‑week planning:** Long‑term macro or calorie planning across 7‑30 days.  
- **Community Recipes:** User‑submitted recipes with AI moderation.  

### **Dependencies**
- Core pipeline (Phase 1–5) complete.  
- Stable user base for testing.

### **Completion Criteria**
- At least one advanced AI feature implemented and validated.  
- Expanded model usage while maintaining budget caps.

---

## 📈 Phase Dependencies Summary

| Phase | Prerequisites | Next Step |
|--------|----------------|------------|
| **1** | None | Image pipeline |
| **2** | Phase 1 backend | Grocery aggregation |
| **3** | Phase 1–2 complete | Dashboard & chat UI |
| **4** | Phase 1–3 | Personalization & favorites |
| **5** | Phase 1–4 | Monetization |
| **6** | Phase 1–5 | Advanced AI features |
| **7** | All prior complete | Ongoing iteration |

---

## 🧭 Implementation Order for Codex

1. Implement **Phase 1** endpoints and DB schema.  
2. Add **Phase 2** image pipeline and quotas.  
3. Expand to **Phase 3** grocery logic.  
4. Scaffold **Phase 4** UI with hooks into APIs.  
5. Layer **Phase 5** personalization and quotas.  
6. Integrate **Phase 6** monetization.  
7. Explore **Phase 7** advanced AI features.

---

## 🧩 Version Control & Collaboration Notes

- Each phase should have its own Git branch (`phase-1-core-backend`, `phase-2-images`, etc.).  
- Commit with clear messages referencing blueprint updates.  
- Always update this document when a phase is modified.  
- Codex and GPT‑5 should reference previous phase deliverables before generating new code.

---

### End of Document
