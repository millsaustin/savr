import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import {
  jsonResponse,
  errorResponse
} from "../../../../../packages/shared/src/utils/http.ts";
import {
  resolveRecipeImage,
  logImageCost,
  placeholder as getPlaceholderUrl
} from "../../../../../packages/shared/src/utils/imageProvider.ts";
import { hashString } from "../../../../../packages/shared/src/utils/hash.ts";
import { logError, logInfo } from "../../../../../packages/shared/src/utils/logger.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const bodySchema = z.object({
  recipe_id: z.string().uuid(),
  recipe_name: z.string().min(1),
  category: z.string().optional(),
  top_ingredient: z.string().optional()
});

type RequestPayload = z.infer<typeof bodySchema>;

type SystemLimitRow = {
  id: number;
  month: string;
  max_monthly_spend: number | string;
  current_spend: number | string;
  allow_generation: boolean;
};

type UserImageQuotaRow = {
  user_id: string;
  month: string | null;
  images_generated: number;
  quota_limit: number;
  last_reset: string | null;
};

type StoredImageRow = {
  id: string;
  url: string;
  source?: string;
};

serve(async (req) => {
  const requestId = crypto.randomUUID();

  try {
    if (req.method !== "POST") {
      return errorResponse("METHOD_NOT_ALLOWED", "Only POST supported", 405);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse("UNAUTHORIZED", "Missing bearer token", 401);
    }
    const token = authHeader.replace("Bearer ", "");

    const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !user) {
      return errorResponse("UNAUTHORIZED", "Invalid or expired token", 401);
    }

    const payload = bodySchema.parse(await req.json());

    const recipe = await getRecipe(payload.recipe_id, user.id);
    if (!recipe) {
      return errorResponse("NOT_FOUND", "Recipe not found", 404);
    }

    if (recipe.image_id) {
      const cached = await getImageById(recipe.image_id);
      if (cached?.url) {
        logInfo("image_cache_hit", { requestId, recipeId: recipe.id, imageId: cached.id });
        return jsonResponse({ image_url: cached.url, source: cached.source ?? "unknown", cache_hit: true });
      }
    }

    const currentMonth = formatMonth(new Date());
    const userQuota = await getOrResetUserQuota(user.id, currentMonth);
    const userWithinQuota =
      !userQuota || userQuota.images_generated < userQuota.quota_limit;

    const prompt = buildPrompt(
      payload.recipe_name,
      payload.category,
      payload.top_ingredient
    );

    const decision = await resolveRecipeImage({
      recipeName: payload.recipe_name,
      category: payload.category,
      topIngredient: payload.top_ingredient,
      prompt,
      allowGeneration: userWithinQuota
    });

    if (decision.source === "stock") {
      const stored = await storeImage({
        recipeId: payload.recipe_id,
        category: payload.category,
        url: decision.url,
        hashInput: `${decision.provider}:${decision.url}`,
        source: "stock",
        stockProvider: decision.provider,
        photographerName: decision.photographer,
        licenseUrl: decision.license_url
      });
      await linkRecipeImage(payload.recipe_id, user.id, stored.id);
      logInfo("image_stock_stored", {
        requestId,
        recipeId: payload.recipe_id,
        imageId: stored.id,
        provider: decision.provider
      });
      return jsonResponse({
        image_url: stored.url,
        source: "stock",
        cache_hit: false
      });
    }

    if (decision.source === "generated") {
      const systemLimit = await getOrCreateSystemLimit(currentMonth);
      if (!systemLimit.allow_generation || exceedsBudget(systemLimit)) {
        const fallbackUrl = await getPlaceholderUrl(
          payload.category ?? "default"
        );
        const placeholderStored = await storePlaceholder(
          payload,
          user.id,
          fallbackUrl
        );
        logInfo("image_budget_race_placeholder", {
          requestId,
          recipeId: payload.recipe_id,
          imageId: placeholderStored?.id,
          month: currentMonth
        });
        return jsonResponse(
          {
            error: {
              code: "402_BUDGET_CAP_IMAGE_GEN",
              message: "Image generation disabled by budget controls"
            },
            image_url: placeholderStored?.url ?? fallbackUrl,
            source: "placeholder"
          },
          402
        );
      }

      const generatedImage = await storeImage({
        recipeId: payload.recipe_id,
        category: payload.category,
        url: decision.url,
        hashInput: decision.url,
        source: "generated",
        prompt: decision.prompt,
        styleVersion: Deno.env.get("IMAGE_STYLE_VERSION") || "v1.0",
        costEstimate: decision.cost_estimate
      });

      await linkRecipeImage(payload.recipe_id, user.id, generatedImage.id);

      await updateSystemSpend(systemLimit, decision.cost_estimate);
      await incrementUserQuota(user.id, currentMonth, userQuota);

      await logImageCost(generatedImage.id, "openai", decision.tokens_used ?? 0, decision.cost_estimate, true);

      logInfo("image_generated", {
        requestId,
        recipeId: payload.recipe_id,
        imageId: generatedImage.id,
        cost: decision.cost_estimate,
        model: decision.model,
        tokens: decision.tokens_used ?? 0
      });

      return jsonResponse({
        image_url: generatedImage.url,
        source: "generated",
        cache_hit: false
      });
    }

    const placeholderStored = await storePlaceholder(
      payload,
      user.id,
      decision.url
    );
    const placeholderUrl = placeholderStored?.url ?? decision.url;

    if (decision.reason === "budget") {
      logInfo("image_budget_block_placeholder", {
        requestId,
        recipeId: payload.recipe_id,
        imageId: placeholderStored?.id,
        month: currentMonth
      });
      return jsonResponse(
        {
          error: {
            code: "402_BUDGET_CAP_IMAGE_GEN",
            message: "Image generation disabled by budget controls"
          },
          image_url: placeholderUrl,
          source: "placeholder"
        },
        402
      );
    }

    if (decision.reason === "fallback") {
      logInfo("image_quota_placeholder", {
        requestId,
        recipeId: payload.recipe_id,
        imageId: placeholderStored?.id
      });
      return jsonResponse(
        {
          error: {
            code: "USER_IMAGE_QUOTA_EXCEEDED",
            message: "User image generation quota reached"
          },
          image_url: placeholderUrl,
          source: "placeholder"
        },
        429
      );
    }

    await logImageCost(
      null,
      "openai",
      0,
      0,
      false,
      decision.error
    );
    logError("image_generation_placeholder_error", {
      requestId,
      recipeId: payload.recipe_id,
      error: decision.error
    });
    return jsonResponse(
      {
        error: {
          code: "IMAGE_GENERATION_FAILED",
          message: decision.error ?? "Image generation failed"
        },
        image_url: placeholderUrl,
        source: "placeholder"
      },
      500
    );

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logError("image_fetch_or_generate_failed", { requestId, error: message });
    try {
      await logImageCost(null, "system", 0, 0, false, message);
    } catch (logErr) {
      console.error("Failed to log image pipeline error", logErr);
    }
    return errorResponse("IMAGE_PIPELINE_ERROR", message, 500);
  }
});

async function getRecipe(recipeId: string, userId: string) {
  const { data, error } = await supabase
    .from("recipes")
    .select("id, user_id, image_id")
    .eq("id", recipeId)
    .maybeSingle();

  if (error) throw error;
  if (!data || data.user_id !== userId) return null;
  return data;
}

async function getImageById(imageId: string) {
  const { data, error } = await supabase
    .from("images")
    .select("id, url, source")
    .eq("id", imageId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

interface StoreImageInput {
  recipeId: string;
  category?: string;
  url: string;
  hashInput: string;
  source: "stock" | "generated" | "placeholder";
  stockProvider?: string;
  photographerName?: string;
  licenseUrl?: string;
  prompt?: string;
  styleVersion?: string;
  costEstimate?: number;
}

async function storeImage(input: StoreImageInput): Promise<StoredImageRow> {
  const now = new Date().toISOString();
  const hash = await hashString(input.hashInput);
  const costEstimate =
    typeof input.costEstimate === "number"
      ? Number(input.costEstimate.toFixed(2))
      : input.costEstimate;

  const insertPayload = {
    recipe_id: input.recipeId,
    category: input.category,
    url: input.url,
    hash,
    source: input.source,
    stock_provider: input.stockProvider,
    photographer_name: input.photographerName,
    license_url: input.licenseUrl,
    prompt: input.prompt,
    style_version: input.styleVersion,
    cost_estimate: costEstimate,
    last_used: now
  };

  const { data, error } = await supabase
    .from("images")
    .insert(insertPayload)
    .select("id, url")
    .single();

  if (error) throw error;
  return data;
}

async function linkRecipeImage(recipeId: string, userId: string, imageId: string) {
  const { error } = await supabase
    .from("recipes")
    .update({ image_id: imageId })
    .eq("id", recipeId)
    .eq("user_id", userId);
  if (error) throw error;
}

function buildPrompt(name: string, category?: string, ingredient?: string) {
  const details = [
    name,
    category ? `${category} recipe` : null,
    ingredient ? `featuring ${ingredient}` : null
  ]
    .filter(Boolean)
    .join(", ");

  return `Photorealistic overhead shot of ${details}. Natural diffused daylight, rustic tabletop, shallow depth of field, styled plating, cinematic, ultra realistic food photography.`;
}

async function storePlaceholder(payload: RequestPayload, userId: string, url: string) {
  try {
    const stored = await storeImage({
      recipeId: payload.recipe_id,
      category: payload.category,
      url,
      hashInput: `placeholder:${payload.recipe_id}:${url}`,
      source: "placeholder"
    });
    await linkRecipeImage(payload.recipe_id, userId, stored.id);
    return stored;
  } catch (err) {
    console.warn("Failed to store placeholder image", err);
    return null;
  }
}

function formatMonth(date: Date) {
  return date.toISOString().slice(0, 7);
}

async function getOrCreateSystemLimit(month: string): Promise<SystemLimitRow> {
  const { data, error } = await supabase
    .from("system_limits")
    .select("*")
    .eq("month", month)
    .maybeSingle();

  if (error) throw error;
  if (data) return data;

  const { data: inserted, error: insertErr } = await supabase
    .from("system_limits")
    .insert({ month })
    .select("*")
    .single();

  if (insertErr) throw insertErr;
  return inserted as SystemLimitRow;
}

function exceedsBudget(limit: SystemLimitRow) {
  const current = Number(limit.current_spend || 0);
  const maximum = Number(limit.max_monthly_spend || 0);
  return maximum > 0 && current >= maximum;
}

async function updateSystemSpend(limit: SystemLimitRow, delta: number) {
  const current = Number(limit.current_spend || 0);
  const updatedSpend = Number((current + (delta || 0)).toFixed(2));

  const { error } = await supabase
    .from("system_limits")
    .update({
      current_spend: updatedSpend,
      updated_at: new Date().toISOString()
    })
    .eq("id", limit.id);
  if (error) throw error;
}

async function getOrResetUserQuota(userId: string, month: string): Promise<UserImageQuotaRow | null> {
  const { data, error } = await supabase
    .from("user_image_quota")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  if (data.month !== month) {
    const { data: reset, error: resetErr } = await supabase
      .from("user_image_quota")
      .update({ month, images_generated: 0, last_reset: new Date().toISOString() })
      .eq("user_id", userId)
      .select("*")
      .single();
    if (resetErr) throw resetErr;
    return reset as UserImageQuotaRow;
  }

  return data as UserImageQuotaRow;
}

async function incrementUserQuota(userId: string, month: string, existing: UserImageQuotaRow | null) {
  if (!existing) {
    const { error } = await supabase.from("user_image_quota").insert({
      user_id: userId,
      month,
      images_generated: 1
    });
    if (error) throw error;
    return;
  }

  const { error } = await supabase
    .from("user_image_quota")
    .update({ images_generated: existing.images_generated + 1 })
    .eq("user_id", userId);
  if (error) throw error;
}
