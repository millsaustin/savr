# Hybrid Meal Generation Pipeline

## Purpose
This document defines a unified approach for generating meal plans by combining structured backend logic with OpenAI's generative capabilities. The goal is to achieve both creativity and predictability.

---

## Overview

### Goal
Blend deterministic rule-based logic (macros, costs, constraints) with OpenAI’s creative output to generate, validate, and store recipes that meet user constraints.

### Summary Flow
```
User prompt → Backend parses → Build structured constraints
     ↓
Generate meal plan outline (rule engine)
     ↓
Send structured prompt to OpenAI for creative fill
     ↓
Validate + normalize response
     ↓
Store recipe + metadata → Generate / fetch image
```

---

## 1. User Request Example

Frontend request:
```json
{
  "meals": 5,
  "budget_total": 200,
  "diet": "high protein",
  "calories_per_meal": 800,
  "excluded_ingredients": ["seafood"]
}
```

---

## 2. Constraint Builder

Backend interprets user input into deterministic parameters:

| Parameter | Example Value | Description |
|------------|----------------|--------------|
| `meals` | 5 | Number of meals to create |
| `budget_total` | 200 | Total budget in USD |
| `budget_per_meal` | 40 | Derived field |
| `diet` | high protein | Dietary focus |
| `excluded_ingredients` | ["seafood"] | Ingredients to avoid |

The rule layer ensures all constraints are valid before AI generation.

---

## 3. Prompt Construction (Backend → OpenAI)

Example system prompt:
```
You are an expert meal planner.
Generate 5 meal recipes that meet these criteria:
- Total budget: $200 (around $40 per meal)
- Calories per meal: about 800
- Diet: high protein
- Exclude: seafood
Return your answer in strict JSON format:
[
  {
    "name": "...",
    "ingredients": [
      {"name": "...", "amount": "...", "unit": "...", "cost_estimate": "..."}
    ],
    "instructions": "...",
    "macros": {"calories": 0, "protein": 0, "carbs": 0, "fat": 0},
    "estimated_cost": 0
  }
]
```

---

## 4. Model Response Parsing

Backend validates and normalizes JSON:
- Ensure all keys exist and data types match expectations.
- Recalculate total cost and macros.
- Retry with “Reformat into valid JSON” if parsing fails.

---

## 5. Database Storage

Each generated recipe is saved to `recipes` table with metadata.

| Field | Type | Description |
|-------|------|--------------|
| `id` | UUID | Primary key |
| `name` | TEXT | Recipe name |
| `ingredients` | JSONB | Ingredient list |
| `instructions` | TEXT | Cooking steps |
| `macros` | JSONB | Nutritional data |
| `cost_estimate` | DECIMAL | Total cost |
| `diet` | TEXT | Category |
| `image_id` | UUID | FK to image table |
| `created_at` | TIMESTAMP | Creation date |

---

## 6. Meal Generation Logging

Create a new table `meal_gen_log` for transparency and cost tracking.

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | FK to users |
| `prompt_hash` | TEXT | Used for caching |
| `model` | TEXT | Model name |
| `tokens_used` | INT | Token cost |
| `cost_estimate` | DECIMAL | Dollar cost |
| `created_at` | TIMESTAMP | When generated |

---

## 7. Caching Logic

Before generating, hash constraints:
```
hash_key = sha256(diet + budget + calories + exclusions + meal_count)
```
If a cached version exists, return it immediately instead of calling OpenAI.

---

## 8. Pseudocode Implementation

```python
def generate_meal_plan(user_input):
    constraints = build_constraints(user_input)
    cache_key = hash_constraints(constraints)
    
    if recipe_cache.exists(cache_key):
        return recipe_cache.get(cache_key)
    
    prompt = build_prompt(constraints)
    response = openai.ChatCompletion.create(
        model="gpt-4-turbo",
        messages=[{"role": "system", "content": "You are an expert meal planner."},
                  {"role": "user", "content": prompt}],
        temperature=0.8
    )
    
    meals = validate_and_parse(response)
    save_meals_to_db(meals)
    recipe_cache.set(cache_key, meals)
    return meals
```

---

## 9. Integration with Image System

Once recipes are generated and saved:
1. Check if `image_id` exists → Serve cached image.  
2. If missing → Trigger stock photo search → AI image generation fallback.  
3. Log cost and provider in `images` and `image_gen_log` tables.

---

## 10. Estimated Cost Control

- GPT calls: ~$0.05–$0.15 per meal plan.  
- Cache prevents redundant requests.  
- Combine with system_limits logic from image pipeline to maintain unified monthly cap.

---

## 11. Future Enhancements
- Add “Refinement Loop”: allow users to modify generated meals (“make it spicy,” “add Italian flavors”).  
- Introduce macro-balancing AI agent to double-check nutritional values.  
- Implement per-user history tracking and favorites integration.  
- Fine-tune or distill the model for lower-cost inference later.

---

## Summary
This unified pipeline allows OpenAI’s model to handle creativity while your backend enforces structure, validation, caching, and cost control. The result is flexible, scalable, and production-friendly.
