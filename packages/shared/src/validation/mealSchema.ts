import { z } from "zod";

export const ingredientSchema = z.object({
  name: z.string(),
  amount: z.string().optional(),
  unit: z.string().optional(),
  cost_estimate: z.number().optional()
});

export const macrosSchema = z.object({
  calories: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fat: z.number()
});

export const mealSchema = z.object({
  name: z.string(),
  ingredients: z.array(ingredientSchema),
  instructions: z.string(),
  macros: macrosSchema,
  estimated_cost: z.number()
});

export const mealResponseSchema = z.array(mealSchema);
