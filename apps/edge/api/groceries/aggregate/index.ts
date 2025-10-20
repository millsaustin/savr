import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { jsonResponse, errorResponse } from "../../../../../packages/shared/src/utils/http.ts";
import { normalizeIngredientName } from "../../../../../packages/shared/src/utils/grocery.ts";
import {
  aggregateGroceriesForMeals,
  AggregationError
} from "../_shared.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const bodySchema = z.object({
  meal_ids: z.array(z.string().uuid()).min(1),
  already_have: z
    .array(
      z.object({
        name: z.string().min(1)
      })
    )
    .optional(),
  persist: z.boolean().optional()
});

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return errorResponse("METHOD_NOT_ALLOWED", "Only POST is supported", 405);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse("401_UNAUTHORIZED", "Missing bearer token", 401);
    }

    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) {
      return errorResponse("401_UNAUTHORIZED", "Invalid bearer token", 401);
    }

    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData?.user) {
      return errorResponse("401_UNAUTHORIZED", "Invalid or expired token", 401);
    }

    let payload: z.infer<typeof bodySchema>;
    try {
      payload = bodySchema.parse(await req.json());
    } catch (parseErr) {
      const message =
        parseErr instanceof Error ? parseErr.message : "Invalid request body";
      return errorResponse("400_INVALID_INPUT", message, 400);
    }

    const userId = authData.user.id;
    const mealIds = payload.meal_ids;
    const persist = payload.persist ?? true;
    const alreadyHaveNames = new Set(
      (payload.already_have || []).map((item) => normalizeIngredientName(item.name))
    );

    try {
      const result = await aggregateGroceriesForMeals({
        supabase,
        userId,
        mealIds,
        alreadyHaveNames,
        persist
      });

      if (!persist) {
        return jsonResponse({
          items: result.items,
          estimated_total_cost: result.estimatedTotalCost
        });
      }

      return jsonResponse({
        list_id: result.listId,
        items: result.items,
        estimated_total_cost: result.estimatedTotalCost
      });
    } catch (err) {
      if (err instanceof AggregationError) {
        return errorResponse(err.code, err.message, err.status);
      }
      throw err;
    }
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : String(err);
    return errorResponse("500_INTERNAL", message, 500);
  }
});
