/**
 * Grocery utilities shared across edge functions and services.
 * All helpers are pure functions to keep them test-friendly.
 */

export interface ParsedAmount {
  amount: number | null;
  unit: string | null;
  notes?: string;
}

export interface AggregatedItem {
  name: string;
  amount: number | null;
  unit: string | null;
  notes?: string;
  source_meal_ids: string[];
}

const ALIAS_MAP: Record<string, string> = {
  scallion: "green onion",
  scallions: "green onion",
  "spring onion": "green onion",
  "spring onions": "green onion",
  coriander: "cilantro",
  cilantro: "cilantro",
  "bell pepper": "bell pepper",
  "bell peppers": "bell pepper",
  chickpeas: "chickpea",
  garbanzos: "chickpea",
  garbanzo: "chickpea",
  yoghurt: "yogurt",
  courgette: "zucchini",
  courgettes: "zucchini",
  aubergine: "eggplant",
  aubergines: "eggplant"
};

const IRREGULAR_SINGULARS: Record<string, string> = {
  tomatoes: "tomato",
  potatoes: "potato",
  leaves: "leaf",
  loaves: "loaf",
  knives: "knife",
  wives: "wife",
  children: "child",
  men: "man",
  women: "woman",
  mice: "mouse",
  geese: "goose",
  berries: "berry",
  cherries: "cherry",
  peas: "pea",
  beans: "bean",
  cloves: "clove",
  halves: "half"
};

const UNIT_SYNONYMS: Record<string, string> = {
  gram: "g",
  grams: "g",
  g: "g",
  kilogram: "kg",
  kilograms: "kg",
  kg: "kg",
  ounce: "oz",
  ounces: "oz",
  oz: "oz",
  pound: "lb",
  pounds: "lb",
  lb: "lb",
  lbs: "lb",
  milliliter: "ml",
  milliliters: "ml",
  ml: "ml",
  liter: "l",
  litre: "l",
  liters: "l",
  litres: "l",
  l: "l",
  tablespoon: "tbsp",
  tablespoons: "tbsp",
  tbsp: "tbsp",
  tsp: "tsp",
  teaspoon: "tsp",
  teaspoons: "tsp",
  cup: "cup",
  cups: "cup",
  can: "item",
  cans: "item",
  whole: "item",
  each: "item",
  cloves: "item",
  clove: "item",
  piece: "item",
  pieces: "item",
  bunch: "item",
  bunches: "item"
};

const CANONICAL_UNITS = new Set([
  "g",
  "kg",
  "ml",
  "l",
  "tbsp",
  "tsp",
  "cup",
  "item"
]);

const VOLUME_TO_PRIMARY: Record<string, { target: string; factor: number }> = {
  l: { target: "ml", factor: 1000 },
  "fl oz": { target: "ml", factor: 29.5735 },
  cup: { target: "ml", factor: 240 },
  tbsp: { target: "ml", factor: 15 },
  tsp: { target: "ml", factor: 5 }
};

const WEIGHT_TO_PRIMARY: Record<string, { target: string; factor: number }> = {
  kg: { target: "g", factor: 1000 },
  lb: { target: "g", factor: 453.592 },
  oz: { target: "g", factor: 28.3495 }
};

const FRACTION_MAP: Record<string, string> = {
  "¼": "1/4",
  "½": "1/2",
  "¾": "3/4",
  "⅓": "1/3",
  "⅔": "2/3",
  "⅛": "1/8"
};

export function normalizeIngredientName(name: string): string {
  if (!name) return "";

  let result = name
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ");

  result = result.trim();

  if (ALIAS_MAP[result]) {
    result = ALIAS_MAP[result];
  }

  const tokens = result.split(" ").map((token) => singularize(token));
  result = tokens.join(" ").trim();

  if (ALIAS_MAP[result]) {
    result = ALIAS_MAP[result];
  }

  return result;
}

export function parseAmountUnit(
  input: string | number | null | undefined,
  unit?: string | null
): ParsedAmount {
  if (typeof input === "number" && !Number.isNaN(input)) {
    const sanitizedUnit = sanitizeUnit(unit);
    return { amount: input, unit: sanitizedUnit };
  }

  const rawString = typeof input === "string" ? input : "";
  const cleaned = substituteFractions(rawString).trim();

  if (!cleaned) {
    return {
      amount: null,
      unit: sanitizeUnit(unit),
      notes: undefined
    };
  }

  const amountMatch = cleaned.match(/^([\d\s\/\.,\-]+)/);
  if (!amountMatch) {
    return {
      amount: null,
      unit: sanitizeUnit(unit),
      notes: tidyNotes(cleaned)
    };
  }

  const amountStr = amountMatch[1].trim();
  const amount = parseNumericPortion(amountStr);
  const remainder = cleaned.slice(amountMatch[0].length).trim();

  if (amount === null) {
    const notes = cleaned !== rawString ? cleaned : rawString;
    return {
      amount: null,
      unit: sanitizeUnit(unit),
      notes: notes || undefined
    };
  }

  let derivedUnit = unit ? sanitizeUnit(unit) : null;
  let notes: string | undefined;

  if (!derivedUnit && remainder) {
    const unitMatch = remainder.match(/^([a-zA-Z]+(?:\s?[a-zA-Z]+)?)/);
    if (unitMatch) {
      derivedUnit = sanitizeUnit(unitMatch[1]);
      notes = tidyNotes(remainder.slice(unitMatch[1].length));
    } else {
      notes = tidyNotes(remainder);
    }
  } else if (remainder) {
    notes = tidyNotes(remainder);
  }

  if (notes && derivedUnit && sanitizeUnit(notes) === derivedUnit) {
    notes = undefined;
  }

  return {
    amount,
    unit: derivedUnit,
    notes
  };
}

export function toCanonicalUnit(
  amount: number | null,
  unit: string | null
): { amount: number | null; unit: string | null } {
  if (!unit) {
    return { amount, unit: null };
  }

  let normalizedUnit = sanitizeUnit(unit);
  if (!normalizedUnit) {
    return { amount, unit: null };
  }

  // Apply basic conversions to preferred base units.
  if (amount !== null && WEIGHT_TO_PRIMARY[normalizedUnit]) {
    const conversion = WEIGHT_TO_PRIMARY[normalizedUnit];
    return toCanonicalUnit(amount * conversion.factor, conversion.target);
  }

  if (amount !== null && VOLUME_TO_PRIMARY[normalizedUnit]) {
    const conversion = VOLUME_TO_PRIMARY[normalizedUnit];
    if (normalizedUnit === "cup") {
      // For cups, convert directly to ml to keep consistent units.
      return toCanonicalUnit(amount * conversion.factor, conversion.target);
    }
    if (normalizedUnit === "tbsp") {
      return toCanonicalUnit(amount * conversion.factor, conversion.target);
    }
    if (normalizedUnit === "tsp") {
      return toCanonicalUnit(amount * conversion.factor, conversion.target);
    }
    return toCanonicalUnit(amount * conversion.factor, conversion.target);
  }

  if (!CANONICAL_UNITS.has(normalizedUnit)) {
    return { amount, unit: normalizedUnit };
  }

  return {
    amount: amount !== null ? round(amount, 4) : null,
    unit: normalizedUnit
  };
}

export function aggregateItems(
  items: Array<{
    name: string;
    amount?: number | string | null;
    unit?: string | null;
    sourceMealId?: string | null;
    notes?: string | null;
  }>
): AggregatedItem[] {
  const aggregates = new Map<
    string,
    {
      name: string;
      amount: number | null;
      unit: string | null;
      notes: Set<string>;
      sourceIds: Set<string>;
    }
  >();

  const nameUnits = new Map<string, Set<string | null>>();

  for (const item of items) {
    if (!item || !item.name) continue;
    const normalizedName = normalizeIngredientName(item.name);

    const parsed = parseAmountUnit(
      item.amount === undefined ? null : (item.amount as any),
      item.unit ?? null
    );

    const canonical = toCanonicalUnit(parsed.amount, parsed.unit);

    const key = `${normalizedName}::${canonical.unit ?? "none"}`;
    let entry = aggregates.get(key);

    if (!entry) {
      entry = {
        name: normalizedName,
        amount: canonical.amount ?? null,
        unit: canonical.unit ?? null,
        notes: new Set<string>(),
        sourceIds: new Set<string>()
      };
      aggregates.set(key, entry);
    } else if (canonical.amount !== null) {
      if (entry.amount === null) {
        entry.amount = canonical.amount;
      } else {
        entry.amount += canonical.amount;
      }
    }

    if (parsed.notes) {
      entry.notes.add(parsed.notes);
    }
    if (item.notes) {
      entry.notes.add(item.notes);
    }
    if (item.sourceMealId) {
      entry.sourceIds.add(item.sourceMealId);
    }

    const unitSet = nameUnits.get(normalizedName) ?? new Set<string | null>();
    unitSet.add(entry.unit);
    nameUnits.set(normalizedName, unitSet);
  }

  const results: AggregatedItem[] = [];

  for (const entry of aggregates.values()) {
    const unitsForName = nameUnits.get(entry.name) ?? new Set<string | null>();
    if (unitsForName.size > 1) {
      const conflictUnits = Array.from(unitsForName)
        .filter((u): u is string => !!u)
        .join(", ");
      if (conflictUnits) {
        entry.notes.add(`conflicting units: ${conflictUnits}`);
      }
    }

    results.push({
      name: entry.name,
      amount: entry.amount !== null ? round(entry.amount, 3) : null,
      unit: entry.unit,
      notes: entry.notes.size > 0 ? Array.from(entry.notes).join("; ") : undefined,
      source_meal_ids: Array.from(entry.sourceIds)
    });
  }

  return results.sort((a, b) => a.name.localeCompare(b.name));
}

export function estimateTotalCost(
  aggregatedItems: AggregatedItem[],
  priceHints?: Record<string, number>
): number {
  if (!priceHints) return 0;
  let total = 0;

  for (const item of aggregatedItems) {
    const key = normalizeIngredientName(item.name);
    const price = priceHints[key];
    if (price === undefined) continue;

    const multiplier =
      item.amount !== null && !Number.isNaN(item.amount) ? item.amount : 1;
    total += price * multiplier;
  }

  return round(total, 2);
}

export function formatForClient(
  aggregatedItems: AggregatedItem[]
): Array<{
  name: string;
  amount: number | null;
  unit: string | null;
  notes?: string;
  source_meal_ids: string[];
}> {
  return aggregatedItems.map((item) => ({
    name: item.name,
    amount: item.amount,
    unit: item.unit,
    notes: item.notes,
    source_meal_ids: item.source_meal_ids
  }));
}

function sanitizeUnit(unit?: string | null): string | null {
  if (!unit) return null;
  const lowered = unit
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\s+/g, " ")
    .trim();
  const alias = UNIT_SYNONYMS[lowered];
  if (alias) return alias;
  return lowered;
}

function singularize(word: string): string {
  if (!word) return word;
  if (IRREGULAR_SINGULARS[word]) return IRREGULAR_SINGULARS[word];

  if (word.endsWith("ies") && word.length > 3) {
    return word.slice(0, -3) + "y";
  }
  if (word.endsWith("ves") && word.length > 3) {
    return word.slice(0, -3) + "f";
  }
  if (word.endsWith("ses") || word.endsWith("xes") || word.endsWith("zes")) {
    return word.slice(0, -2);
  }
  if (word.endsWith("s") && word.length > 3 && !word.endsWith("ss")) {
    return word.slice(0, -1);
  }
  return word;
}

function parseNumericPortion(input: string): number | null {
  if (!input) return null;
  const sanitized = input
    .replace(/-/g, " ")
    .replace(/,/g, " ")
    .trim();

  const tokens = sanitized.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return null;

  let total = 0;
  let found = false;

  for (const token of tokens) {
    if (/^\d+\/\d+$/.test(token)) {
      const [num, den] = token.split("/").map(Number);
      if (den === 0) continue;
      total += num / den;
      found = true;
    } else if (/^\d+(\.\d+)?$/.test(token)) {
      total += parseFloat(token);
      found = true;
    }
  }

  return found ? total : null;
}

function substituteFractions(input: string): string {
  return input.replace(
    /[¼½¾⅓⅔⅛]/g,
    (match) => FRACTION_MAP[match] ?? match
  );
}

function round(value: number, precision: number): number {
  const factor = Math.pow(10, precision);
  return Math.round(value * factor) / factor;
}

function tidyNotes(value?: string | null): string | undefined {
  if (!value) return undefined;
  const cleaned = value.replace(/^[\s,;()\-]+/, "").replace(/[\s,;()\-]+$/, "").trim();
  return cleaned || undefined;
}
