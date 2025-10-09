import OpenAI from "openai";

interface MealConstraints {
  meals: number;
  budget_total: number;
  calories_per_meal?: number;
  diet?: string;
  excluded_ingredients?: string[];
}

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || Deno.env.get("OPENAI_API_KEY")
});

export async function generateMealPlan(constraints: MealConstraints) {
  const prompt = `
You are an expert meal planner.
Generate ${constraints.meals} meals that match:
- Total budget: $${constraints.budget_total}
- Diet: ${constraints.diet || "any"}
- Exclude: ${(constraints.excluded_ingredients || []).join(", ") || "none"}.
Return strict JSON array of recipes with keys:
name, ingredients[{name, amount, unit, cost_estimate}],
instructions, macros{calories,protein,carbs,fat}, estimated_cost.
`;

  const response = await client.chat.completions.create({
    model: process.env.TEXT_MODEL || "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are an expert meal planner." },
      { role: "user", content: prompt }
    ],
    temperature: 0.8
  });

  const text = response.choices[0].message?.content || "[]";
  const json = JSON.parse(text);

  return { meals: json, tokens: response.usage?.total_tokens || 0, cost: 0 };
}

export async function generateMealPlanFromPantry({ meals, available_ingredients }) {
  const ingredientList = available_ingredients.join(", ");

  const prompt = `
You are an expert chef.
Create ${meals} meals using these available ingredients:
[${ingredientList}]
You may suggest a few additional ingredients ONLY if absolutely necessary.

Rules:
- Use as many provided ingredients as possible.
- Keep new ingredients minimal.
Return JSON array of:
{
  name, ingredients_used, extra_ingredients, instructions,
  estimated_cost_new_items, macros:{calories,protein,carbs,fat}
}
`;

  const response = await client.chat.completions.create({
    model: process.env.TEXT_MODEL || "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are an expert chef." },
      { role: "user", content: prompt }
    ],
    temperature: 0.8
  });

  const text = response.choices[0].message?.content || "[]";
  const json = JSON.parse(text);

  const grocery_list = [];
  for (const meal of json) {
    for (const item of meal.extra_ingredients || []) {
      grocery_list.push(item);
    }
  }

  return { meals: json, grocery_list };
}
