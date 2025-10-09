import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { hashString } from "../../../packages/shared/src/utils/hash.ts";
import { mealResponseSchema } from "../../../packages/shared/src/validation/mealSchema.ts";
import { generateMealPlan } from "../../../packages/shared/src/utils/openai.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const bodySchema = z.object({
  meals: z.number().min(1).max(10),
  budget_total: z.number().min(10),
  calories_per_meal: z.number().optional(),
  diet: z.string().optional(),
  excluded_ingredients: z.array(z.string()).optional()
});

serve(async (req) => {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing token");
    const token = authHeader.replace("Bearer ", "");

    const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !user) throw new Error("Invalid user");

    const json = await req.json();
    const parsed = bodySchema.parse(json);

    const hashKey = await hashString(JSON.stringify(parsed));

    const { data: cacheHit } = await supabase
      .from("meal_gen_log")
      .select("*")
      .eq("user_id", user.id)
      .eq("prompt_hash", hashKey)
      .maybeSingle();

    if (cacheHit) {
      const { data: recipes } = await supabase
        .from("recipes")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(parsed.meals);
      return new Response(JSON.stringify({ cache_hit: true, meals: recipes }), { status: 200 });
    }

    const aiMeals = await generateMealPlan(parsed);

    const validMeals = mealResponseSchema.parse(aiMeals);

    for (const meal of validMeals) {
      await supabase.from("recipes").insert({
        user_id: user.id,
        name: meal.name,
        category: parsed.diet,
        ingredients: meal.ingredients,
        instructions: meal.instructions,
        macros: meal.macros,
        cost_estimate: meal.estimated_cost
      });
    }

    await supabase.from("meal_gen_log").insert({
      user_id: user.id,
      prompt_hash: hashKey,
      model: Deno.env.get("TEXT_MODEL") || "gpt-4o-mini",
      tokens_used: aiMeals.tokens || 0,
      cost_estimate: aiMeals.cost || 0
    });

    return new Response(JSON.stringify({ cache_hit: false, meals: validMeals }), { status: 200 });

  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message }), { status: 400 });
  }
});
