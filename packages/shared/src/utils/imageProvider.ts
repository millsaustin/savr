import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import OpenAI from "openai";
import { logError, logInfo } from "./logger.ts";

type StockResult = {
  url: string;
  provider: "pexels" | "unsplash" | "pixabay";
  photographer?: string;
  license_url?: string;
};

export type RecipeImageMeta = {
  recipeName: string;
  category?: string;
  topIngredient?: string;
  prompt?: string;
  allowGeneration?: boolean;
};

export type RecipeImageDecision =
  | (StockResult & { source: "stock"; query: string })
  | {
      source: "generated";
      url: string;
      cost_estimate: number;
      tokens_used: number;
      prompt: string;
      model: string;
    }
  | {
      source: "placeholder";
      url: string;
      reason: "budget" | "error" | "fallback";
      error?: string;
    };

export interface RecipeImageFetchParams {
  recipe_id: string;
  recipe_name: string;
  category?: string;
  top_ingredient?: string;
  authToken?: string;
}

export interface RecipeImageFetchResult {
  image_url: string;
  source: "stock" | "generated" | "placeholder";
  status: "ok" | "budget_cap" | "placeholder" | "error";
  error?: string;
}

const RATIO_TOLERANCE = 0.15;
const MIN_WIDTH = 1024;

const PLACEHOLDER_BASE =
  getEnvVar("IMAGE_PLACEHOLDER_BASE_URL") || "/static/images/placeholders";
const PLACEHOLDER_DEFAULT = `${PLACEHOLDER_BASE}/default.jpg`;

const SUPABASE_URL = getEnvVar("SUPABASE_URL");
const SUPABASE_SERVICE_KEY = getEnvVar("SUPABASE_SERVICE_ROLE_KEY");

const supabase =
  SUPABASE_URL && SUPABASE_SERVICE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    : null;

const OPENAI_API_KEY = getEnvVar("OPENAI_API_KEY");
const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;

function ensureSupabase() {
  if (!supabase) {
    throw new Error("Supabase credentials missing for image provider.");
  }
  return supabase;
}

function ensureOpenAI() {
  if (!openai) throw new Error("OPENAI_API_KEY missing for image generation.");
  return openai;
}

function getEnvVar(key: string): string | undefined {
  if (typeof Deno !== "undefined" && typeof Deno.env?.get === "function") {
    try {
      return Deno.env.get(key) ?? undefined;
    } catch {
      // ignore when not permitted
    }
  }
  if (typeof process !== "undefined" && process?.env) {
    return process.env[key];
  }
  return undefined;
}

function isAcceptableDimensions(width?: number, height?: number) {
  if (!width || !height) return false;
  if (width < MIN_WIDTH) return false;
  const ratio = width / height;
  return (
    Math.abs(ratio - 1) <= RATIO_TOLERANCE ||
    Math.abs(ratio - 4 / 3) <= RATIO_TOLERANCE
  );
}

function buildSearchQuery(meta: RecipeImageMeta) {
  return [
    meta.recipeName,
    meta.category,
    meta.topIngredient
  ]
    .filter((part) => part && part.trim().length > 0)
    .join(" ");
}

function defaultPrompt(meta: RecipeImageMeta) {
  const details = [
    meta.recipeName,
    meta.category ? `${meta.category} recipe` : null,
    meta.topIngredient ? `highlighting ${meta.topIngredient}` : null
  ]
    .filter(Boolean)
    .join(", ");

  return `Photorealistic overhead shot of ${details}. Natural diffused daylight, rustic tabletop styling, shallow depth of field, cinematic food photography.`;
}

function placeholderForCategory(category?: string) {
  if (!category) return PLACEHOLDER_DEFAULT;
  const slug = category
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `${PLACEHOLDER_BASE}/${slug || "default"}.jpg`;
}

export async function searchStock(
  query: string
): Promise<StockResult | null> {
  if (!query) return null;

  const strategies: Array<{
    provider: StockResult["provider"];
    handler: () => Promise<StockResult | null>;
  }> = [
    { provider: "pexels", handler: () => searchPexels(query) },
    { provider: "unsplash", handler: () => searchUnsplash(query) },
    { provider: "pixabay", handler: () => searchPixabay(query) }
  ];

  for (const { provider, handler } of strategies) {
    try {
      const result = await handler();
      if (result) {
        logInfo("stock_image_found", { provider: result.provider, query });
        return result;
      }
    } catch (err) {
      logError("stock_image_lookup_failed", {
        provider,
        error: err instanceof Error ? err.message : String(err)
      });
    }
  }

  return null;
}

async function searchPexels(query: string): Promise<StockResult | null> {
  const apiKey = getEnvVar("PEXELS_API_KEY");
  if (!apiKey) return null;

  const url = new URL("https://api.pexels.com/v1/search");
  url.searchParams.set("query", query);
  url.searchParams.set("per_page", "6");
  url.searchParams.set("orientation", "landscape");

  const response = await fetch(url.toString(), {
    headers: { Authorization: apiKey }
  });

  if (!response.ok) {
    throw new Error(`Pexels returned ${response.status}`);
  }

  const data = await response.json();
  const photo = (data?.photos || []).find((item: any) =>
    isAcceptableDimensions(item?.width, item?.height)
  );
  if (!photo) return null;

  return {
    url: photo.src?.large2x || photo.src?.large || photo.src?.original,
    provider: "pexels",
    photographer: photo.photographer,
    license_url: photo.url
  };
}

async function searchUnsplash(query: string): Promise<StockResult | null> {
  const accessKey = getEnvVar("UNSPLASH_ACCESS_KEY");
  if (!accessKey) return null;

  const url = new URL("https://api.unsplash.com/search/photos");
  url.searchParams.set("query", query);
  url.searchParams.set("per_page", "6");
  url.searchParams.set("orientation", "landscape");
  url.searchParams.set("content_filter", "high");
  url.searchParams.set("client_id", accessKey);

  const response = await fetch(url.toString(), {
    headers: { "Accept-Version": "v1" }
  });

  if (!response.ok) {
    throw new Error(`Unsplash returned ${response.status}`);
  }

  const data = await response.json();
  const photo = (data?.results || []).find((item: any) =>
    isAcceptableDimensions(item?.width, item?.height)
  );
  if (!photo) return null;

  return {
    url: photo.urls?.regular || photo.urls?.full,
    provider: "unsplash",
    photographer: photo.user?.name,
    license_url: photo.links?.html
  };
}

async function searchPixabay(query: string): Promise<StockResult | null> {
  const apiKey = getEnvVar("PIXABAY_API_KEY");
  if (!apiKey) return null;

  const url = new URL("https://pixabay.com/api/");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("q", query);
  url.searchParams.set("image_type", "photo");
  url.searchParams.set("per_page", "6");
  url.searchParams.set("orientation", "horizontal");
  url.searchParams.set("safesearch", "true");

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Pixabay returned ${response.status}`);
  }

  const data = await response.json();
  const hit = (data?.hits || []).find((item: any) =>
    isAcceptableDimensions(item?.imageWidth, item?.imageHeight)
  );
  if (!hit) return null;

  return {
    url: hit.largeImageURL || hit.webformatURL,
    provider: "pixabay",
    photographer: hit.user,
    license_url: "https://pixabay.com/service/license/"
  };
}

export async function generateAIImage(prompt: string) {
  const client = ensureOpenAI();
  const model = getEnvVar("IMAGE_MODEL") || "gpt-image-1";
  const size = getEnvVar("IMAGE_SIZE") || "1024x1024";

  logInfo("ai_image_requested", { model, size });

  const response = await client.images.generate({
    model,
    prompt,
    size,
    n: 1,
    response_format: "url"
  });

  const image = response.data?.[0];
  if (!image?.url) {
    throw new Error("Image generation returned empty URL.");
  }

  const tokens = response.usage?.total_tokens ?? 0;
  const tokenCost = parseNumber(getEnvVar("IMAGE_TOKEN_COST"));
  const flatCost = parseNumber(getEnvVar("IMAGE_GEN_COST"));

  const costFromTokens =
    tokenCost > 0 && tokens > 0 ? (tokens / 1000) * tokenCost : 0;
  const estimate = roundCurrency(
    costFromTokens > 0 ? costFromTokens : flatCost
  );

  logInfo("ai_image_generated", {
    model,
    tokens,
    estimated_cost: estimate,
    prompt_preview: prompt.slice(0, 80)
  });

  return {
    url: image.url,
    cost_estimate: estimate,
    tokens_used: tokens,
    model
  };
}

export async function placeholder(category: string): Promise<string> {
  return placeholderForCategory(category);
}

export async function canGenerateMoreImages(): Promise<boolean> {
  const client = ensureSupabase();
  const month = formatMonth(new Date());

  const { data, error } = await client
    .from("system_limits")
    .select("allow_generation, current_spend, max_monthly_spend")
    .eq("month", month)
    .maybeSingle();

  if (error) throw error;
  if (!data) return true;
  if (data.allow_generation === false) return false;

  const current = Number(data.current_spend ?? 0);
  const max = Number(data.max_monthly_spend ?? 0);
  if (max <= 0) return true;
  return current < max;
}

export async function logImageCost(
  imageId: string | null,
  provider: string,
  tokens: number,
  cost: number,
  success: boolean,
  error?: string
): Promise<void> {
  const client = ensureSupabase();
  const payload = {
    image_id: imageId,
    api_provider: provider,
    tokens_used: tokens,
    cost_estimate: roundCurrency(cost),
    success,
    error_message: error ?? null
  };

  const { error: insertError } = await client.from("image_gen_log").insert(payload);
  if (insertError) throw insertError;
}

export async function resolveRecipeImage(
  meta: RecipeImageMeta
): Promise<RecipeImageDecision> {
  const query = buildSearchQuery(meta);
  if (query) {
    const stock = await searchStock(query);
    if (stock) {
      return {
        source: "stock",
        query,
        ...stock
      };
    }
  }

  const prompt = meta.prompt || defaultPrompt(meta);

  if (meta.allowGeneration === false) {
    return {
      source: "placeholder",
      url: placeholderForCategory(meta.category),
      reason: "fallback"
    };
  }

  const canGenerate = await canGenerateMoreImages();
  if (!canGenerate) {
    return {
      source: "placeholder",
      url: placeholderForCategory(meta.category),
      reason: "budget"
    };
  }

  try {
    const generated = await generateAIImage(prompt);
    return {
      source: "generated",
      url: generated.url,
      cost_estimate: generated.cost_estimate,
      tokens_used: generated.tokens_used,
      prompt,
      model: generated.model
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logError("ai_image_generation_failed", { message });
    return {
      source: "placeholder",
      url: placeholderForCategory(meta.category),
      reason: "error",
      error: message
    };
  }
}

export async function getImageForRecipe(
  params: RecipeImageFetchParams
): Promise<RecipeImageFetchResult> {
  const supabaseUrl = getEnvVar("SUPABASE_URL");
  if (!supabaseUrl) {
    throw new Error("SUPABASE_URL missing");
  }

  const endpoint = `${supabaseUrl.replace(/\/$/, "")}/functions/v1/api/images/fetch-or-generate`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };
  if (params.authToken) {
    headers.Authorization = `Bearer ${params.authToken}`;
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({
      recipe_id: params.recipe_id,
      recipe_name: params.recipe_name,
      category: params.category,
      top_ingredient: params.top_ingredient
    })
  });

  const payload = await response.json().catch(() => ({}));
  const imageUrl = payload?.image_url;
  const source = payload?.source ?? "placeholder";

  if (response.status === 402) {
    return {
      image_url: imageUrl ?? placeholderForCategory(params.category),
      source,
      status: "budget_cap",
      error: payload?.error?.code || "BUDGET_CAP_IMAGE_GEN"
    };
  }

  if (!response.ok) {
    return {
      image_url: imageUrl ?? placeholderForCategory(params.category),
      source,
      status: "error",
      error: payload?.error?.code || "IMAGE_PIPELINE_ERROR"
    };
  }

  return {
    image_url: imageUrl ?? placeholderForCategory(params.category),
    source: source as RecipeImageFetchResult["source"],
    status: imageUrl ? "ok" : "placeholder"
  };
}

function formatMonth(date: Date) {
  return date.toISOString().slice(0, 7);
}

function parseNumber(value?: string) {
  if (!value) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundCurrency(value: number) {
  return Math.round((value ?? 0) * 100) / 100;
}
