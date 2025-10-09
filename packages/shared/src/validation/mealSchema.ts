import { z } from "zod";

export const ingredientSchema = z.object({
  name: z.string().trim(),
  amount: z.string().trim().optional(),
  unit: z.string().trim().optional(),
  cost_estimate: z.number().optional()
});

export const macrosSchema = z.object({
  calories: z.number().min(0),
  protein: z.number().min(0),
  carbs: z.number().min(0),
  fat: z.number().min(0)
});

export const mealSchema = z.object({
  name: z.string().trim(),
  ingredients: z.array(ingredientSchema),
  instructions: z.string().trim(),
  macros: macrosSchema,
  estimated_cost: z.number().min(0)
});

export const mealResponseSchema = z.array(mealSchema);

export const pantryPromptSchema = z.object({
  meals: z.number().min(1).max(10),
  available_ingredients: z.array(z.string().trim()).nonempty()
});
