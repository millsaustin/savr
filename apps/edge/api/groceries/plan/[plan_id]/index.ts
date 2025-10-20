import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsonResponse, errorResponse } from "../../../../../../packages/shared/src/utils/http.ts";
import {
  aggregateGroceriesForMeals,
  AggregationError
} from "../../_shared.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  try {
    if (req.method !== "GET") {
      return errorResponse("METHOD_NOT_ALLOWED", "Only GET is supported", 405);
    }

    const url = new URL(req.url);
    const planId = extractPlanId(url.pathname);
    if (!planId) {
      return errorResponse("400_INVALID_INPUT", "Plan id is required in the path", 400);
    }

    const persistParam = url.searchParams.get("persist");
    const persist = persistParam === null ? true : persistParam !== "false";

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

    const userId = authData.user.id;

    const { data: plan, error: planErr } = await supabase
      .from("meal_plans")
      .select("id, user_id")
      .eq("id", planId)
      .maybeSingle();

    if (planErr) {
      throw planErr;
    }

    if (!plan || plan.user_id !== userId) {
      return errorResponse("404_PLAN_NOT_FOUND", "Meal plan not found", 404);
    }

    const { data: planItems, error: itemsErr } = await supabase
      .from("meal_plan_items")
      .select("recipe_id")
      .eq("plan_id", planId)
      .order("position", { ascending: true });

    if (itemsErr) {
      throw itemsErr;
    }

    const mealIds = (planItems || []).map((item) => item.recipe_id).filter(Boolean);

    if (mealIds.length === 0) {
      if (!persist) {
        return jsonResponse({
          plan_id: planId,
          list_id: null,
          items: [],
          estimated_total_cost: 0
        });
      }

      const { data: emptyList, error: listErr } = await supabase
        .from("grocery_lists")
        .insert({
          user_id: userId,
          plan_id: planId,
          estimated_total_cost: 0
        })
        .select("id")
        .single();

      if (listErr || !emptyList) {
        throw listErr || new Error("Failed to create grocery list");
      }

      return jsonResponse({
        plan_id: planId,
        list_id: emptyList.id,
        items: [],
        estimated_total_cost: 0
      });
    }

    try {
      const result = await aggregateGroceriesForMeals({
        supabase,
        userId,
        mealIds,
        persist
      });

      if (persist && result.listId) {
        const { error: linkErr } = await supabase
          .from("grocery_lists")
          .update({ plan_id: planId })
          .eq("id", result.listId)
          .eq("user_id", userId);
        if (linkErr) {
          throw linkErr;
        }
      }

      return jsonResponse({
        plan_id: planId,
        list_id: persist ? result.listId : null,
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

function extractPlanId(pathname: string): string | null {
  const parts = pathname.split("/").filter(Boolean);
  const index = parts.indexOf("plan");
  if (index === -1 || index + 1 >= parts.length) return null;
  return parts[index + 1];
}
