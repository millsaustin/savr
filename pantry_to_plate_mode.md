# Pantry-to-Plate Mode

## Purpose
Enable users to input or select ingredients they already have (pantry, fridge, freezer) and automatically generate complete meals using those items. The AI suggests additional ingredients only if necessary.

---

## Overview
This feature transforms the AI Meal Prep Assistant into a dynamic kitchen companion that builds recipes around the user's current inventory. It connects directly with the hybrid meal generation pipeline and grocery list system.

---

## 1. User Flow

1. User enters ingredients via:
   - Text input (e.g., "chicken, rice, broccoli, eggs, cheddar")
   - Interactive pantry selector (optional autocomplete list for later)

2. Backend interprets these items as **available ingredients**.

3. AI generates recipes using those items, suggesting minimal extras.

4. Output includes:
   - Meal names and instructions
   - Ingredients used vs. missing
   - Estimated cost for missing ingredients
   - Macros and nutritional summary

5. The system aggregates missing ingredients into the grocery list builder.

---

## 2. Example Model Prompt

```
You are an expert chef.
Create 3 meals using these available ingredients:
[chicken, rice, broccoli, cheddar, eggs]
You can suggest a few additional ingredients ONLY if necessary to complete the meals.

Rules:
- Use as many provided ingredients as possible.
- Keep total additional ingredients minimal.
- Return the result in JSON:
[
  {
    "name": "...",
    "ingredients_used": ["..."],
    "extra_ingredients": ["..."],
    "instructions": "...",
    "estimated_cost_new_items": 0,
    "macros": {"calories": 0, "protein": 0, "carbs": 0, "fat": 0}
  }
]
```

---

## 3. Grocery List Integration

- Extract `extra_ingredients` from the model response.
- Aggregate across all meals for a concise list.
- Display list in a user-friendly format:

```
You're only 3 ingredients away from 3 full meals:
- Garlic (2 cloves)
- Olive oil (4 tbsp)
- Flour (1 cup)
```

- User can check off items they already have.
- Merged with general grocery list logic from hybrid generation pipeline.

---

## 4. Database Schema Additions

### user_pantry

| Field | Type | Description |
|-------|------|--------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | FK to users |
| `ingredient_name` | TEXT | e.g., "chicken breast" |
| `quantity` | TEXT | e.g., "2 lb" |
| `location` | ENUM('fridge','freezer','pantry') | Optional |
| `last_updated` | TIMESTAMP | Last modification date |

- Each logged-in user maintains a persistent pantry.
- Can be auto-synced when new items are marked as "available" or "used."

---

## 5. Backend Logic (High-Level)

```python
def generate_meals_from_pantry(user_ingredients):
    prompt = build_pantry_prompt(user_ingredients)
    response = openai.ChatCompletion.create(
        model="gpt-4-turbo",
        messages=[
            {"role": "system", "content": "You are an expert chef."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.8
    )

    meals = validate_and_parse(response)
    grocery_items = aggregate_missing_ingredients(meals)
    save_recipes_to_db(meals)
    return {"meals": meals, "grocery_list": grocery_items}
```

---

## 6. Personality & UX Integration

- Friendly tone examples:
  - *“Alright, chef — what ingredients are we working with today?”*
  - *“Nice haul! I can turn that into tacos, stir fry, or a casserole — what mood are you in?”*
- Low personality mode = simple input box.
- High personality mode = chat-driven back-and-forth.

---

## 7. Integration Points

| System | Connection |
|---------|-------------|
| **Hybrid Generation Pipeline** | Reuses JSON parsing, validation, image generation |
| **Grocery List Builder** | Populates with missing ingredients |
| **User Dashboard** | Adds "Use My Pantry" button |
| **Image Pipeline** | Normal flow after recipe generation |

---

## 8. Future Enhancements

- Smart pantry inference: track commonly used ingredients and suggest restocks.
- Visual pantry (upload photo → AI detects items).
- Link to grocery APIs for real-world pricing and delivery options.

---

## Summary

The Pantry-to-Plate mode bridges real-world cooking with AI creativity. It uses available ingredients to generate realistic, cost-aware meals while minimizing food waste and effort. This mode makes the assistant feel practical, personal, and genuinely helpful.
