
/// <reference types="vitest" />

import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { normalizeIngredientName } from "../../packages/shared/src/utils/grocery.ts";

type EdgeHandler = (req: Request) => Promise<Response>;

const aggregateHandlers: EdgeHandler[] = [];
const planHandlers: EdgeHandler[] = [];
let currentModuleKey = "";

vi.mock("https://deno.land/std@0.177.0/http/server.ts", () => ({
  serve: (handler: EdgeHandler) => {
    if (currentModuleKey === "aggregate") {
      aggregateHandlers.push(handler);
    } else if (currentModuleKey === "plan") {
      planHandlers.push(handler);
    } else {
      aggregateHandlers.push(handler);
    }
  }
}));

let currentSupabase: any;

vi.mock("https://esm.sh/@supabase/supabase-js@2", () => ({
  createClient: () => currentSupabase
}));

beforeAll(() => {
  const envGet = vi.fn((key: string) => {
    if (key === "SUPABASE_URL") return "https://example.supabase.co";
    if (key === "SUPABASE_SERVICE_ROLE_KEY") return "service-role-key";
    if (key === "GROCERY_PRICE_HINTS") return undefined;
    return undefined;
  });

  (globalThis as any).Deno = {
    env: { get: envGet }
  };
});

beforeEach(() => {
  aggregateHandlers.length = 0;
  planHandlers.length = 0;
  currentModuleKey = "";
  currentSupabase = undefined;
  vi.resetModules();
});

function createSupabaseMock({
  userId = "user-123",
  recipes = [],
  mealPlan,
  mealPlanItems,
  groceryListId = "list-xyz"
}: {
  userId?: string;
  recipes?: any[];
  mealPlan?: any;
  mealPlanItems?: any[];
  groceryListId?: string;
}) {
  const tableHandlers: Record<string, any> = {};

  tableHandlers.recipes = {
    select: vi.fn(() => ({
      in: vi.fn(async () => ({
        data: recipes,
        error: null
      }))
    }))
  };

  tableHandlers.grocery_lists = {
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(async () => ({
          data: { id: groceryListId },
          error: null
        }))
      }))
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(async () => ({
          data: null,
          error: null
        }))
      }))
    }))
  };

  tableHandlers.grocery_list_items = {
    insert: vi.fn(async () => ({ error: null }))
  };

  if (mealPlan) {
    tableHandlers.meal_plans = {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(async () => ({
            data: mealPlan,
            error: null
          }))
        }))
      }))
    };
  }

  if (mealPlanItems) {
    tableHandlers.meal_plan_items = {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(async () => ({
            data: mealPlanItems,
            error: null
          }))
        }))
      }))
    };
  }

  const from = vi.fn((table: string) => {
    const handler = tableHandlers[table];
    if (!handler) {
      throw new Error(`Unexpected table ${table}`);
    }
    return handler;
  });

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: userId } },
        error: null
      })
    },
    from,
    __tableHandlers: tableHandlers
  };
}

async function loadAggregateHandler() {
  const index = aggregateHandlers.length;
  currentModuleKey = "aggregate";
  await import("../../apps/edge/api/groceries/aggregate/index.ts");
  return aggregateHandlers[index];
}

async function loadPlanHandler() {
  const index = planHandlers.length;
  currentModuleKey = "plan";
  await import("../../apps/edge/api/groceries/plan/[plan_id]/index.ts");
  return planHandlers[index];
}

describe("POST /api/groceries/aggregate", () => {
  it("aggregates ingredients and skips already-have items", async () => {
    const recipes = [
      {
        id: "recipe-1",
        user_id: "user-123",
        ingredients: [
          { name: "Olive Oil", amount: "2", unit: "tbsp" },
          { name: "Salt", amount: "1", unit: "tsp" }
        ]
      },
      {
        id: "recipe-2",
        user_id: "user-123",
        ingredients: [
          { name: "olive oil", amount: "1", unit: "tbsp" },
          { name: "Garlic", amount: "3", unit: "cloves" }
        ]
      }
    ];

    const supabase = createSupabaseMock({ recipes, groceryListId: "list-agg" });
    currentSupabase = supabase;

    const handler = await loadAggregateHandler();

    const req = new Request("http://localhost/api/groceries/aggregate", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-123",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        meal_ids: ["recipe-1", "recipe-2"],
        already_have: [{ name: "salt" }]
      })
    });

    const res = await handler(req);
    expect(res.status).toBe(200);

    const payload = await res.json();
    expect(payload).toMatchObject({
      list_id: "list-agg",
      estimated_total_cost: expect.any(Number)
    });
    expect(payload.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: normalizeIngredientName("olive oil"),
          source_meal_ids: expect.arrayContaining(["recipe-1", "recipe-2"])
        }),
        expect.objectContaining({
          name: normalizeIngredientName("garlic")
        })
      ])
    );
    expect(payload.items.some((item: any) => item.name === "salt")).toBe(false);
  });
});

describe("GET /api/groceries/plan/:plan_id", () => {
  it("aggregates plan meals and persists grocery list", async () => {
    const planId = "plan-123";
    const recipes = [
      {
        id: "recipe-1",
        user_id: "user-123",
        ingredients: [
          { name: "Chicken Breast", amount: "1", unit: "kg" },
          { name: "Olive Oil", amount: "2", unit: "tbsp" }
        ]
      },
      {
        id: "recipe-2",
        user_id: "user-123",
        ingredients: [
          { name: "Chicken breast", amount: "500", unit: "g" },
          { name: "Lemon", amount: "1", unit: "item" }
        ]
      }
    ];

    const supabase = createSupabaseMock({
      recipes,
      mealPlan: { id: planId, user_id: "user-123" },
      mealPlanItems: [
        { recipe_id: "recipe-1", position: 1 },
        { recipe_id: "recipe-2", position: 2 }
      ],
      groceryListId: "list-plan"
    });
    currentSupabase = supabase;

    const handler = await loadPlanHandler();
    const req = new Request(`http://localhost/api/groceries/plan/${planId}`, {
      method: "GET",
      headers: {
        Authorization: "Bearer token-123"
      }
    });

    const res = await handler(req);
    expect(res.status).toBe(200);

    const payload = await res.json();
    expect(payload).toMatchObject({
      plan_id: planId,
      list_id: "list-plan",
      estimated_total_cost: expect.any(Number)
    });

    expect(payload.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: normalizeIngredientName("Chicken Breast"),
          source_meal_ids: expect.arrayContaining(["recipe-1", "recipe-2"])
        }),
        expect.objectContaining({
          name: normalizeIngredientName("Lemon")
        })
      ])
    );

    expect(
      supabase.__tableHandlers.grocery_lists.update.mock.calls.length
    ).toBeGreaterThan(0);
  });
});
