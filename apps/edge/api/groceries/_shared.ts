import {
  normalizeIngredientName,
  aggregateItems,
  estimateTotalCost,
  formatForClient
} from "../../../../../packages/shared/src/utils/grocery.ts";

export class AggregationError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

const DEFAULT_PRICE_HINTS: Record<string, number> = {
  "olive oil": 0.5,
  salt: 0.05,
  pepper: 0.05,
  garlic: 0.4,
  onion: 0.7,
  "green onion": 0.6,
  tomato: 1.0,
  "chicken breast": 4.0,
  egg: 0.3,
  eggplant: 2.0,
  zucchini: 1.5,
  cilantro: 0.9,
  chickpea: 1.2,
  rice: 0.4
};

export interface AggregateOptions {
  supabase: any;
  userId: string;
  mealIds: string[];
  alreadyHaveNames?: Set<string>;
  persist: boolean;
}

export interface AggregateResult {
  items: ReturnType<typeof formatForClient>;
  estimatedTotalCost: number;
  listId: string | null;
}

export async function aggregateGroceriesForMeals({
  supabase,
  userId,
  mealIds,
  alreadyHaveNames = new Set<string>(),
  persist
}: AggregateOptions): Promise<AggregateResult> {
  if (!mealIds.length) {
    throw new AggregationError("400_INVALID_INPUT", "At least one meal id is required", 400);
  }

  const { data: recipes, error: recipeErr } = await supabase
    .from("recipes")
    .select("id, user_id, ingredients")
    .in("id", mealIds);

  if (recipeErr) {
    throw recipeErr;
  }

  if (!recipes || recipes.length !== mealIds.length) {
    throw new AggregationError("404_RECIPE_NOT_FOUND", "One or more recipes were not found", 404);
  }

  const unauthorized = recipes.find((recipe: any) => recipe.user_id !== userId);
  if (unauthorized) {
    throw new AggregationError("404_RECIPE_NOT_FOUND", "One or more recipes were not found", 404);
  }

  const flattened: Array<{
    name: string;
    amount?: string | number | null;
    unit?: string | null;
    notes?: string | null;
    sourceMealId?: string;
  }> = [];

  for (const recipe of recipes) {
    const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
    for (const raw of ingredients) {
      if (!raw || typeof raw !== "object") continue;
      const rawName = typeof raw.name === "string" ? raw.name : null;
      if (!rawName) continue;

      const normalizedName = normalizeIngredientName(rawName);
      if (alreadyHaveNames.has(normalizedName)) continue;

      flattened.push({
        name: rawName,
        amount:
          typeof raw.amount === "number" || typeof raw.amount === "string"
            ? raw.amount
            : typeof raw.quantity === "number" || typeof raw.quantity === "string"
            ? raw.quantity
            : undefined,
        unit:
          typeof raw.unit === "string"
            ? raw.unit
            : typeof raw.units === "string"
            ? raw.units
            : undefined,
        notes: typeof raw.notes === "string" ? raw.notes : undefined,
        sourceMealId: recipe.id
      });
    }
  }

  const aggregated = aggregateItems(flattened);
  const priceHints = resolvePriceHints();
  const estimatedTotalCost = estimateTotalCost(aggregated, priceHints);
  const itemsForClient = formatForClient(aggregated);

  if (!persist) {
    return {
      items: itemsForClient,
      estimatedTotalCost,
      listId: null
    };
  }

  const { data: listInsert, error: listErr } = await supabase
    .from("grocery_lists")
    .insert({
      user_id: userId,
      estimated_total_cost: estimatedTotalCost
    })
    .select("id")
    .single();

  if (listErr || !listInsert) {
    throw listErr || new Error("Failed to create grocery list");
  }

  if (aggregated.length > 0) {
    const listItems = aggregated.map((item) => ({
      list_id: listInsert.id,
      name: item.name,
      amount: item.amount,
      unit: item.unit,
      notes: item.notes,
      source_meal_ids: item.source_meal_ids
    }));

    const { error: itemsErr } = await supabase.from("grocery_list_items").insert(listItems);
    if (itemsErr) {
      throw itemsErr;
    }
  }

  return {
    items: itemsForClient,
    estimatedTotalCost,
    listId: listInsert.id
  };
}

function resolvePriceHints(): Record<string, number> | undefined {
  const envHints = Deno.env.get("GROCERY_PRICE_HINTS");
  if (!envHints) return DEFAULT_PRICE_HINTS;

  try {
    const parsed = JSON.parse(envHints);
    if (parsed && typeof parsed === "object") {
      const normalized: Record<string, number> = {};
      for (const [key, value] of Object.entries(parsed)) {
        const normalizedKey = normalizeIngredientName(key);
        const numericValue = typeof value === "number" ? value : Number(value);
        if (normalizedKey && Number.isFinite(numericValue)) {
          normalized[normalizedKey] = numericValue;
        }
      }
      return Object.keys(normalized).length > 0 ? normalized : DEFAULT_PRICE_HINTS;
    }
  } catch (_err) {
    console.warn("Failed to parse GROCERY_PRICE_HINTS, using defaults");
  }

  return DEFAULT_PRICE_HINTS;
}
