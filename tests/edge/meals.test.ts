/// <reference types="vitest" />

import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

type EdgeHandler = (req: Request) => Promise<Response>;

const handlers: EdgeHandler[] = [];

vi.mock("https://deno.land/std@0.177.0/http/server.ts", () => ({
  serve: (handler: EdgeHandler) => {
    handlers.push(handler);
  }
}));

let currentSupabase: any;

vi.mock("https://esm.sh/@supabase/supabase-js@2", () => ({
  createClient: () => currentSupabase
}));

const generateMealPlanMock = vi.fn();
const generateMealPlanFromPantryMock = vi.fn();

vi.mock("../../packages/shared/src/utils/openai.ts", () => ({
  generateMealPlan: (...args: any[]) => generateMealPlanMock(...args),
  generateMealPlanFromPantry: (...args: any[]) => generateMealPlanFromPantryMock(...args)
}));

vi.mock("../../packages/shared/src/utils/hash.ts", () => ({
  hashString: vi.fn(async (value: string) => `hash-${value.length}`)
}));

beforeAll(() => {
  const envGet = vi.fn((key: string) => {
    if (key === "SUPABASE_URL") return "https://example.supabase.co";
    if (key === "SUPABASE_SERVICE_ROLE_KEY") return "service-role-key";
    if (key === "TEXT_MODEL") return undefined;
    return undefined;
  });

  (globalThis as any).Deno = {
    env: { get: envGet }
  };
});

beforeEach(() => {
  handlers.length = 0;
  generateMealPlanMock.mockReset();
  generateMealPlanFromPantryMock.mockReset();
  currentSupabase = undefined;
  vi.resetModules();
});

function createGenerateSupabaseMock() {
  const recipeInsert = vi.fn().mockResolvedValue({ error: null });
  const logInsert = vi.fn().mockResolvedValue({ error: null });

  const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
  const secondEq = vi.fn(() => ({ maybeSingle }));
  const firstEq = vi.fn(() => ({ eq: secondEq, maybeSingle }));
  const select = vi.fn(() => ({ eq: firstEq }));

  const supabase = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null
      })
    },
    from: vi.fn((table: string) => {
      if (table === "meal_gen_log") {
        return {
          select,
          insert: logInsert
        };
      }

      if (table === "recipes") {
        return {
          insert: recipeInsert,
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn(() =>
                  Promise.resolve({ data: [], error: null })
                )
              }))
            }))
          }))
        };
      }

      throw new Error(`Unexpected table ${table}`);
    })
  };

  return Object.assign(supabase, {
    __recipeInsert: recipeInsert,
    __logInsert: logInsert
  });
}

function createPantrySupabaseMock(pantryItems: Array<{ ingredient_name: string }>) {
  const recipeInsert = vi.fn().mockResolvedValue({ error: null });

  const supabase = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "user-456" } },
        error: null
      })
    },
    from: vi.fn((table: string) => {
      if (table === "user_pantry") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() =>
              Promise.resolve({ data: pantryItems, error: null })
            )
          }))
        };
      }

      if (table === "recipes") {
        return {
          insert: recipeInsert
        };
      }

      throw new Error(`Unexpected table ${table}`);
    })
  };

  return Object.assign(supabase, {
    __recipeInsert: recipeInsert
  });
}

async function loadGenerateHandler() {
  const index = handlers.length;
  await import("../../apps/edge/meals-generate/index.ts");
  return handlers[index];
}

async function loadPantryHandler() {
  const index = handlers.length;
  await import("../../apps/edge/meals-from-pantry/index.ts");
  return handlers[index];
}

describe("Edge Functions", () => {
  it("inserts generated meals and logs the request", async () => {
    const supabase = createGenerateSupabaseMock();
    currentSupabase = supabase;

    const fakeMeal = {
      name: "Test Meal",
      ingredients: [
        {
          name: "Rice",
          amount: "1",
          unit: "cup",
          cost_estimate: 2
        }
      ],
      instructions: "Cook rice.",
      macros: { calories: 500, protein: 20, carbs: 60, fat: 10 },
      estimated_cost: 4
    };

    const aiMeals = [fakeMeal];
    (aiMeals as any).tokens = 21;
    (aiMeals as any).cost = 3;

    generateMealPlanMock.mockResolvedValue(aiMeals);

    const handler = await loadGenerateHandler();
    const req = new Request("http://localhost/api/meals/generate", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-123",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        meals: 1,
        budget_total: 25
      })
    });

    const res = await handler(req);
    expect(res.status).toBe(200);

    const payload = await res.json();
    expect(payload.cache_hit).toBe(false);
    expect(payload.meals).toEqual([
      expect.objectContaining({
        name: fakeMeal.name,
        ingredients: fakeMeal.ingredients,
        instructions: fakeMeal.instructions,
        macros: fakeMeal.macros,
        estimated_cost: fakeMeal.estimated_cost
      })
    ]);

    expect(generateMealPlanMock).toHaveBeenCalledWith({
      meals: 1,
      budget_total: 25
    });

    expect(supabase.__recipeInsert).toHaveBeenCalledTimes(1);
    expect(supabase.__recipeInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-123",
        name: fakeMeal.name,
        ingredients: fakeMeal.ingredients,
        instructions: fakeMeal.instructions,
        macros: fakeMeal.macros,
        cost_estimate: fakeMeal.estimated_cost
      })
    );

    expect(supabase.__logInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-123",
        tokens_used: 21,
        cost_estimate: 3
      })
    );
  });

  it("builds meals and grocery list from pantry items", async () => {
    const supabase = createPantrySupabaseMock([
      { ingredient_name: "tomato" },
      { ingredient_name: "onion" }
    ]);
    currentSupabase = supabase;

    const pantryMeal = {
      name: "Pantry Stew",
      ingredients: [
        { name: "tomato", amount: "2", unit: "pieces" },
        { name: "onion", amount: "1", unit: "pieces" }
      ],
      instructions: "Simmer everything.",
      macros: { calories: 350, protein: 10, carbs: 40, fat: 8 },
      estimated_cost: 5,
      extra_ingredients: ["salt"]
    };

    generateMealPlanFromPantryMock.mockResolvedValue({
      meals: [pantryMeal],
      grocery_list: ["salt"]
    });

    const handler = await loadPantryHandler();
    const req = new Request("http://localhost/api/meals/from-pantry", {
      method: "POST",
      headers: {
        Authorization: "Bearer pantry-token",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        meals: 1,
        include_images: false
      })
    });

    const res = await handler(req);
    expect(res.status).toBe(200);

    const payload = await res.json();
    expect(payload.meals).toHaveLength(1);
    expect(payload.grocery_list).toEqual(["salt"]);

    expect(generateMealPlanFromPantryMock).toHaveBeenCalledWith({
      meals: 1,
      available_ingredients: ["tomato", "onion"]
    });

    expect(supabase.__recipeInsert).toHaveBeenCalledTimes(1);
    expect(supabase.__recipeInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-456",
        name: pantryMeal.name,
        ingredients: pantryMeal.ingredients,
        instructions: pantryMeal.instructions,
        macros: pantryMeal.macros,
        cost_estimate: pantryMeal.estimated_cost
      })
    );
  });

  it("returns 400 when authorization header is missing", async () => {
    const supabase = createGenerateSupabaseMock();
    currentSupabase = supabase;

    const handler = await loadGenerateHandler();
    const req = new Request("http://localhost/api/meals/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        meals: 1,
        budget_total: 25
      })
    });

    const res = await handler(req);
    expect(res.status).toBe(400);

    const payload = await res.json();
    expect(payload).toEqual({
      error: {
        code: "BAD_REQUEST",
        message: "Missing token"
      }
    });

    expect(generateMealPlanMock).not.toHaveBeenCalled();
  });
});
