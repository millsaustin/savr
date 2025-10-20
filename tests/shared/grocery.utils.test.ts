
import { describe, expect, it } from "vitest";
import {
  normalizeIngredientName,
  parseAmountUnit,
  toCanonicalUnit,
  aggregateItems,
  estimateTotalCost,
  formatForClient
} from "../../packages/shared/src/utils/grocery.ts";

describe("grocery utils", () => {
  describe("normalizeIngredientName", () => {
    it("normalizes aliases and trims punctuation", () => {
      expect(normalizeIngredientName("  Scallions  ")).toBe("green onion");
      expect(normalizeIngredientName("Spring-Onions!!")).toBe("green onion");
    });

    it("handles plurals and casing", () => {
      expect(normalizeIngredientName("Tomatoes")).toBe("tomato");
      expect(normalizeIngredientName("CHICKPEAS")).toBe("chickpea");
    });
  });

  describe("parseAmountUnit", () => {
    it("parses mixed fraction amounts", () => {
      expect(parseAmountUnit("1 1/2 tbsp")).toEqual({
        amount: 1.5,
        unit: "tbsp",
        notes: undefined
      });
    });

    it("parses weight strings", () => {
      expect(parseAmountUnit("400 g")).toEqual({
        amount: 400,
        unit: "g",
        notes: undefined
      });
    });

    it("parses canned goods and captures notes", () => {
      expect(parseAmountUnit("1 can (15 oz)")).toEqual({
        amount: 1,
        unit: "item",
        notes: "15 oz"
      });
    });

    it("parses volume units", () => {
      expect(parseAmountUnit("2 cups")).toEqual({
        amount: 2,
        unit: "cup",
        notes: undefined
      });
    });
  });

  describe("toCanonicalUnit", () => {
    it("converts teaspoons and tablespoons to milliliters", () => {
      expect(toCanonicalUnit(6, "tsp")).toEqual({ amount: 30, unit: "ml" });
      expect(toCanonicalUnit(2, "tbsp")).toEqual({ amount: 30, unit: "ml" });
    });

    it("converts cups to milliliters", () => {
      expect(toCanonicalUnit(1.5, "cup")).toEqual({ amount: 360, unit: "ml" });
    });

    it("converts kilograms to grams", () => {
      expect(toCanonicalUnit(2, "kg")).toEqual({ amount: 2000, unit: "g" });
    });

    it("converts liters to milliliters", () => {
      expect(toCanonicalUnit(1.25, "l")).toEqual({ amount: 1250, unit: "ml" });
    });
  });

  describe("aggregateItems", () => {
    it("merges like items and preserves conflicting units", () => {
      const aggregated = aggregateItems([
        { name: "Tomatoes", amount: "2", unit: "kg", sourceMealId: "meal-1" },
        { name: "tomato", amount: "500", unit: "g", sourceMealId: "meal-2" },
        { name: "Tomato", amount: "3", unit: "item", sourceMealId: "meal-3" }
      ]);

      expect(aggregated).toHaveLength(2);

      const weightEntry = aggregated.find((item) => item.unit === "g");
      expect(weightEntry).toMatchObject({
        name: "tomato",
        amount: 1500,
        unit: "g"
      });
      expect(weightEntry?.source_meal_ids.sort()).toEqual(["meal-1", "meal-2"]);

      const itemEntry = aggregated.find((item) => item.unit === "item");
      expect(itemEntry).toMatchObject({
        name: "tomato",
        amount: 3,
        unit: "item"
      });
      expect(itemEntry?.source_meal_ids).toEqual(["meal-3"]);
      expect(itemEntry?.notes).toMatch(/conflicting units/);
    });
  });

  describe("estimateTotalCost & formatForClient", () => {
    it("estimates total and formats aggregated items", () => {
      const aggregated = aggregateItems([
        { name: "Olive Oil", amount: "2", unit: "tbsp", sourceMealId: "meal-1" },
        { name: "Salt", amount: null, unit: null, sourceMealId: "meal-1" }
      ]);

      const priceHints = {
        "olive oil": 0.05,
        salt: 0.1
      };

      const total = estimateTotalCost(aggregated, priceHints);
      // 2 tbsp -> 30 ml, so 30 * 0.05 = 1.5 plus salt fallback (1 unit) * 0.1 = 0.1
      expect(total).toBeCloseTo(1.6, 2);

      const formatted = formatForClient(aggregated);
      expect(Array.isArray(formatted)).toBe(true);
      expect(formatted).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: "olive oil",
            source_meal_ids: ["meal-1"]
          }),
          expect.objectContaining({
            name: "salt",
            amount: null,
            unit: null
          })
        ])
      );
    });
  });
});
