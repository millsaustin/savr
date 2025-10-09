# Unified Image Handling and Generation Plan

## Purpose
This document defines a single, cohesive image-handling strategy for the AI Meal Prep Assistant.  
The system uses stock image APIs (Unsplash, Pexels, Pixabay) when possible and falls back to AI image generation only when necessary.

---

## Core Logic Overview

### Primary Goals
1. Ensure every recipe has a visual representation.  
2. Prioritize **stock photo usage** to reduce generation costs.  
3. Generate missing images using AI when no stock image fits.  
4. Cache all results to prevent duplicate work and control spending.  
5. Enforce a **global monthly image-generation budget cap**.

---

## Processing Flow

```
User requests recipe
    │
    ├─> Check recipes.image_id
    │     ├─> Exists → Serve cached image
    │     └─> Missing → Start image acquisition flow
    │
    ├─> Stock Image Lookup (Unsplash / Pexels / Pixabay)
    │     ├─> Match found → Cache result (source='stock')
    │     └─> No match → Trigger AI Image Generation
    │
    ├─> AI Generation (DALL·E / Stability / Midjourney API)
    │     ├─> Success → Cache result (source='generated')
    │     └─> Fail → Assign placeholder category image
    │
    ├─> Log all actions to image_gen_log
    │
    └─> Serve image and update recipe record
```

---

## Step-by-Step Logic

### 1. Stock Photo Search
- Query order: **Pexels → Unsplash → Pixabay**
- Use recipe keywords: `recipe.name + recipe.category + top_ingredient`
- Filter results:
  - Aspect ratio = 1:1 or 4:3  
  - Width ≥ 1024px  
  - Safe content only  
- If found, store result in `images` table with:
  - `source = 'stock'`
  - `stock_provider`, `photographer_name`, `license_url`
  - Download and rehost in CDN (S3, R2, etc.)
  - Update `recipes.image_id`

### 2. AI Image Generation (Fallback)
Triggered only if no stock photo passes filters.  
- Build prompt:  
  `"Photorealistic overhead shot of [dish_name], natural light, rustic table, shallow depth of field."`
- Check monthly spend cap in `system_limits`.  
  - If over cap → assign placeholder image.  
- Generate via selected API.  
- Store result in `images` table with `source='generated'`.  
- Log API call and cost in `image_gen_log`.

### 3. Placeholder Handling
If both stock and AI generation fail:
- Use default placeholder based on recipe category (e.g., `high-protein-placeholder.jpg`).  
- Mark entry with `source='placeholder'`.

---

## Database Schema Summary

### images
| Field | Type | Description |
|-------|------|--------------|
| `id` | UUID | Primary key |
| `recipe_id` | UUID | FK to recipes |
| `category` | TEXT | e.g., "Chicken Dish" |
| `url` | TEXT | CDN link |
| `hash` | TEXT | SHA hash |
| `source` | TEXT | 'stock' / 'generated' / 'placeholder' |
| `stock_provider` | TEXT | 'pexels' / 'unsplash' / 'pixabay' |
| `photographer_name` | TEXT | Credit |
| `license_url` | TEXT | License reference |
| `prompt` | TEXT | If generated |
| `style_version` | TEXT | "v1.0-rustic-light" |
| `cost_estimate` | DECIMAL | Generation cost |
| `generated_at` | TIMESTAMP | Timestamp |
| `last_used` | TIMESTAMP | For cleanup |

### system_limits
Tracks global cost ceiling for generation.

| Field | Type | Description |
|-------|------|--------------|
| `month` | TEXT | e.g., "2025-10" |
| `max_monthly_spend` | DECIMAL | Default $300 |
| `current_spend` | DECIMAL | Updated per generation |
| `allow_generation` | BOOLEAN | True/False for global stop |
| `updated_at` | TIMESTAMP | Last refresh |

### image_gen_log
Keeps an audit trail of every generation attempt.

| Field | Type | Description |
|-------|------|--------------|
| `api_provider` | TEXT | API name |
| `tokens_used` | INT | If applicable |
| `cost_estimate` | DECIMAL | Cost of generation |
| `success` | BOOLEAN | Whether generation succeeded |
| `error_message` | TEXT | Logged if failed |
| `created_at` | TIMESTAMP | Timestamp |

---

## API Reference Examples

### Pexels
`GET https://api.pexels.com/v1/search?query=chicken%20bowl&per_page=1`  
Header: `Authorization: YOUR_PEXELS_API_KEY`

### Unsplash
`GET https://api.unsplash.com/search/photos?query=chicken%20bowl&per_page=1&client_id=YOUR_ACCESS_KEY`

### Pixabay
`GET https://pixabay.com/api/?key=YOUR_API_KEY&q=chicken%20bowl&image_type=photo`

---

## Implementation Notes

- The **Image Queue Worker** should always check stock providers first.  
- Cache results locally for reuse.  
- Only increment `system_limits.current_spend` when `source='generated'`.  
- The logic ensures you never pay for an image that can be fetched free.

---

## Future Enhancements
- Use CLIP-based image similarity to auto-rank stock results.  
- Add smart cropping and tone unification for consistent branding.  
- Track most-viewed recipes to pre-fetch high-priority stock images.
