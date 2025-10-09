import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { generateMealPlanFromPantry } from "../../../packages/shared/src/utils/openai.ts";
import { mealResponseSchema } from "../../../packages/shared/src/validation/mealSchema.ts";
import { jsonResponse, errorResponse } from "../../../packages/shared/src/utils/http.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const bodySchema = z.object({
  meals: z.number().min(1).max(10).default(3),
  include_images: z.boolean().optional()
});

serve(async (req) => {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing token");
    const token = authHeader.replace("Bearer ", "");

    const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !user) throw new Error("Invalid user");

    const { meals } = bodySchema.parse(await req.json());

    // Fetch pantry items for this user
    const { data: pantry, error: pErr } = await supabase
      .from("user_pantry")
      .select("ingredient_name")
      .eq("user_id", user.id);
    if (pErr) throw pErr;
    const ingredients = pantry.map((i) => i.ingredient_name);

    const promptInput = {
      meals,
      available_ingredients: ingredients
    };

    const aiMeals = await generateMealPlanFromPantry(promptInput);
    const validMeals = mealResponseSchema.parse(aiMeals.meals);

    for (const meal of validMeals) {
      await supabase.from("recipes").insert({
        user_id: user.id,
        name: meal.name,
        ingredients: meal.ingredients,
        instructions: meal.instructions,
        macros: meal.macros,
        cost_estimate: meal.estimated_cost
      });
    }

    return jsonResponse({
      meals: validMeals,
      grocery_list: aiMeals.grocery_list
    });

  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : String(err);
    return errorResponse("BAD_REQUEST", message);
  }
});
