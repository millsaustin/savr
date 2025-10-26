// imageService.ts - Stock-first image pipeline with free AI generation fallback
// Zero-cost image acquisition for recipe images

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { crypto } from 'https://deno.land/std@0.177.0/crypto/mod.ts';

/////////////////////////////
// TYPES & EXPORTED CONTRACT
/////////////////////////////

export type RecipeImageMeta = {
  recipeId: string;          // UUID of recipes.id
  name: string;              // "Harissa Chicken with Couscous"
  tags: string[];            // ["chicken", "harissa", "couscous", "mediterranean", "dinner"]
  category?: string;         // e.g., "high-protein"
  cuisine?: string;          // e.g., "Mediterranean"
};

export type ImageResult = {
  imageUrl: string;          // public URL
  source: 'stock' | 'generated' | 'placeholder';
  provider?: 'pexels' | 'unsplash' | 'pixabay';
  imageId: string;           // images.id
};

/////////////////////////////
// CONFIGURATION
/////////////////////////////

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const PEXELS_API_KEY = Deno.env.get('PEXELS_API_KEY');
const UNSPLASH_ACCESS_KEY = Deno.env.get('UNSPLASH_ACCESS_KEY');
const PIXABAY_KEY = Deno.env.get('PIXABAY_KEY');
const REPLICATE_API_KEY = Deno.env.get('REPLICATE_API_KEY');
const HUGGINGFACE_API_KEY = Deno.env.get('HUGGINGFACE_API_KEY');
const DIFFUSION_ENDPOINT = Deno.env.get('DIFFUSION_ENDPOINT') || 'http://local-diffusion:7861';

const STORAGE_BUCKET = 'Recipes';
const DEFAULT_PLACEHOLDER = '/placeholders/default.png';

/////////////////////////////
// HELPERS - STOCK DECISION
/////////////////////////////

function isGoodForStockPhotos(meta: RecipeImageMeta): boolean {
  const nameLower = meta.name.toLowerCase();

  // Simple, single-ingredient dishes work well with stock photos
  const simpleIngredients = [
    'avocado toast', 'salmon', 'eggs', 'oatmeal', 'pancakes', 'waffles',
    'smoothie', 'salad', 'yogurt', 'fruit', 'vegetables', 'coffee', 'tea'
  ];

  if (simpleIngredients.some(ing => nameLower.includes(ing))) {
    console.log('[isGoodForStockPhotos] Simple ingredient detected, using stock');
    return true;
  }

  // Complex recipes with specific names should use AI
  // These have multiple words and specific dish names
  const wordCount = meta.name.split(/[\s-]+/).length;

  if (wordCount >= 3) {
    // 3+ words = too specific (e.g., "Spicy Thai Green Curry")
    console.log('[isGoodForStockPhotos] Complex recipe (3+ words), using AI');
    return false;
  }

  if (wordCount === 2) {
    // 2 words - check if it's a generic combination
    const genericDishes = ['chicken breast', 'beef steak', 'grilled salmon', 'baked chicken'];
    if (genericDishes.some(dish => nameLower === dish)) {
      console.log('[isGoodForStockPhotos] Generic 2-word dish, using stock');
      return true;
    }

    // Otherwise too specific (e.g., "Turkey Chili", "Pad Thai")
    console.log('[isGoodForStockPhotos] Specific 2-word recipe, using AI');
    return false;
  }

  // Default: try stock for simple names
  return true;
}

/////////////////////////////
// PUBLIC ENTRY POINT
/////////////////////////////

export async function fetchOrCreateRecipeImage(meta: RecipeImageMeta, forceRegenerate: boolean = false): Promise<ImageResult> {
  console.log(`[imageService] Processing recipe: ${meta.recipeId} - ${meta.name} (forceRegenerate: ${forceRegenerate})`);

  // 1) Short-circuit: if recipe already has image → return (unless force regenerate)
  if (!forceRegenerate) {
    const existing = await findExistingImage(meta.recipeId);
    if (existing) {
      console.log(`[imageService] Existing image found: ${existing.imageId}`);
      await updateLastUsed(existing.imageId);
      return existing;
    }
  } else {
    console.log(`[imageService] Force regenerate requested, skipping cache check`);
  }

  // 2) Skip stock photos - use Replicate for everything
  console.log('[imageService] Skipping stock photos - using Replicate AI for all images');

  // 3) Try Replicate API first (best quality)
  console.log(`[imageService] REPLICATE_API_KEY configured: ${REPLICATE_API_KEY ? 'YES' : 'NO'}`);

  if (REPLICATE_API_KEY) {
    console.log('[imageService] Attempting Replicate AI generation...');
    const replicateBuffer = await generateWithReplicate(meta);

    if (replicateBuffer) {
      console.log('[imageService] Replicate image generated successfully');
      const processed = await postProcess(replicateBuffer);
      const hash = sha256(processed);

      // Check for duplicate by hash
      const existingByHash = await findImageByHash(hash);
      if (existingByHash) {
        console.log(`[imageService] Duplicate generated image, reusing: ${existingByHash.imageId}`);
        await linkRecipeImage(meta.recipeId, existingByHash.imageId);
        await updateLastUsed(existingByHash.imageId);
        return existingByHash;
      }

      const { publicUrl } = await storeToSupabase(processed, `${meta.recipeId}/${hash}.png`);
      const { prompt, negative } = buildPrompt(meta);

      const { id: imageId } = await upsertImageRow({
        recipe_id: meta.recipeId,
        url: publicUrl,
        source: 'generated',
        hash,
        style_version: 'v1.0-replicate-sdxl',
        prompt: `${prompt}\n\nNegative: ${negative}`,
      });

      await linkRecipeImage(meta.recipeId, imageId);

      return {
        imageUrl: publicUrl,
        source: 'generated',
        imageId,
      };
    }
  }

  // 4) Skip Hugging Face fallback - Replicate only
  console.log('[imageService] Hugging Face disabled - using Replicate only');

  // 5) Skip local diffusion - not configured
  console.log('[imageService] Local diffusion disabled');

  // 6) If Replicate fails, return placeholder by category
  console.log('[imageService] All generation failed, using placeholder');
  const placeholderUrl = await getPlaceholderUrl(meta.category);

  const { id: imageId } = await upsertImageRow({
    recipe_id: meta.recipeId,
    url: placeholderUrl,
    source: 'placeholder',
  });

  await linkRecipeImage(meta.recipeId, imageId);

  return {
    imageUrl: placeholderUrl,
    source: 'placeholder',
    imageId,
  };
}

/////////////////////////////
// INTERNAL HELPERS - DATABASE
/////////////////////////////

export async function findExistingImage(recipeId: string): Promise<ImageResult | null> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { data, error } = await supabase
    .from('recipes')
    .select('image_id, images!inner(id, url, source, stock_provider)')
    .eq('id', recipeId)
    .single();

  if (error || !data || !data.image_id) {
    return null;
  }

  const image = data.images as any;

  return {
    imageUrl: image.url,
    source: image.source,
    provider: image.stock_provider || undefined,
    imageId: image.id,
  };
}

export async function upsertImageRow(row: {
  recipe_id: string;
  url: string;
  source: 'stock' | 'generated' | 'placeholder';
  stock_provider?: 'pexels' | 'unsplash' | 'pixabay';
  photographer_name?: string;
  license_url?: string;
  hash?: string;
  style_version?: string;
  prompt?: string;
}): Promise<{ id: string }> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { data, error } = await supabase
    .from('images')
    .insert({
      recipe_id: row.recipe_id,
      url: row.url,
      source: row.source,
      stock_provider: row.stock_provider || null,
      photographer_name: row.photographer_name || null,
      license_url: row.license_url || null,
      hash: row.hash || null,
      style_version: row.style_version || null,
      prompt: row.prompt || null,
      generated_at: new Date().toISOString(),
      last_used: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) {
    console.error('[imageService] Error inserting image:', error);
    throw new Error(`Failed to insert image: ${error.message}`);
  }

  console.log(`[imageService] Image inserted: ${data.id}`);
  return { id: data.id };
}

export async function linkRecipeImage(recipeId: string, imageId: string): Promise<void> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { error } = await supabase
    .from('recipes')
    .update({ image_id: imageId })
    .eq('id', recipeId);

  if (error) {
    console.error('[imageService] Error linking recipe to image:', error);
    throw new Error(`Failed to link recipe to image: ${error.message}`);
  }

  console.log(`[imageService] Recipe ${recipeId} linked to image ${imageId}`);
}

export async function findImageByHash(hash: string): Promise<ImageResult | null> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { data, error } = await supabase
    .from('images')
    .select('id, url, source, stock_provider')
    .eq('hash', hash)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    imageUrl: data.url,
    source: data.source as 'stock' | 'generated' | 'placeholder',
    provider: data.stock_provider as 'pexels' | 'unsplash' | 'pixabay' | undefined,
    imageId: data.id,
  };
}

export async function updateLastUsed(imageId: string): Promise<void> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  await supabase
    .from('images')
    .update({ last_used: new Date().toISOString() })
    .eq('id', imageId);
}

/////////////////////////////
// INTERNAL HELPERS - STOCK IMAGES
/////////////////////////////

export type DownloadedImage = {
  buffer: Uint8Array;
  provider: 'pexels' | 'unsplash' | 'pixabay';
  photographer?: string;
  licenseUrl?: string;
};

export async function tryStock(meta: RecipeImageMeta): Promise<DownloadedImage | null> {
  // Try Pexels first
  if (PEXELS_API_KEY) {
    const pexelsResult = await tryPexels(meta);
    if (pexelsResult) return pexelsResult;
  }

  // Try Unsplash second
  if (UNSPLASH_ACCESS_KEY) {
    const unsplashResult = await tryUnsplash(meta);
    if (unsplashResult) return unsplashResult;
  }

  // Try Pixabay third
  if (PIXABAY_KEY) {
    const pixabayResult = await tryPixabay(meta);
    if (pixabayResult) return pixabayResult;
  }

  return null;
}

async function tryPexels(meta: RecipeImageMeta): Promise<DownloadedImage | null> {
  try {
    const queries = buildSearchQueries(meta);

    for (const query of queries) {
      console.log(`[Pexels] Searching: ${query}`);

      const response = await fetch(
        `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape`,
        {
          headers: {
            'Authorization': PEXELS_API_KEY!,
          },
        }
      );

      if (!response.ok) continue;

      const data = await response.json();

      if (data.photos && data.photos.length > 0) {
        for (const photo of data.photos) {
          // Filter: width >= 1024, food-related and matches recipe
          if (photo.width >= 1024 && isFoodRelated(photo.alt || '', meta.name)) {
            const imageUrl = photo.src.large2x || photo.src.large;
            const imageBuffer = await downloadImage(imageUrl);

            if (imageBuffer) {
              return {
                buffer: imageBuffer,
                provider: 'pexels',
                photographer: photo.photographer,
                licenseUrl: photo.url,
              };
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('[Pexels] Error:', error);
  }

  return null;
}

async function tryUnsplash(meta: RecipeImageMeta): Promise<DownloadedImage | null> {
  try {
    const queries = buildSearchQueries(meta);

    for (const query of queries) {
      console.log(`[Unsplash] Searching: ${query}`);

      const response = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape&client_id=${UNSPLASH_ACCESS_KEY}`,
      );

      if (!response.ok) continue;

      const data = await response.json();

      if (data.results && data.results.length > 0) {
        for (const photo of data.results) {
          // Filter: width >= 1024, food-related and matches recipe
          if (photo.width >= 1024 && isFoodRelated(photo.description || photo.alt_description || '', meta.name)) {
            const imageUrl = photo.urls.regular;
            const imageBuffer = await downloadImage(imageUrl);

            if (imageBuffer) {
              return {
                buffer: imageBuffer,
                provider: 'unsplash',
                photographer: photo.user.name,
                licenseUrl: photo.links.html,
              };
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('[Unsplash] Error:', error);
  }

  return null;
}

async function tryPixabay(meta: RecipeImageMeta): Promise<DownloadedImage | null> {
  try {
    const queries = buildSearchQueries(meta);

    for (const query of queries) {
      console.log(`[Pixabay] Searching: ${query}`);

      const response = await fetch(
        `https://pixabay.com/api/?key=${PIXABAY_KEY}&q=${encodeURIComponent(query)}&image_type=photo&per_page=5&orientation=horizontal`,
      );

      if (!response.ok) continue;

      const data = await response.json();

      if (data.hits && data.hits.length > 0) {
        for (const photo of data.hits) {
          // Filter: width >= 1024, food-related and matches recipe
          if (photo.imageWidth >= 1024 && isFoodRelated(photo.tags || '', meta.name)) {
            const imageUrl = photo.largeImageURL;
            const imageBuffer = await downloadImage(imageUrl);

            if (imageBuffer) {
              return {
                buffer: imageBuffer,
                provider: 'pixabay',
                photographer: photo.user,
                licenseUrl: photo.pageURL,
              };
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('[Pixabay] Error:', error);
  }

  return null;
}

function buildSearchQueries(meta: RecipeImageMeta): string[] {
  const queries: string[] = [];

  // Extract dish type (usually the last significant word)
  const nameWords = meta.name.toLowerCase().split(/[\s-]+/);
  const dishTypes = ['chili', 'soup', 'stew', 'curry', 'salad', 'bowl', 'pasta', 'tacos', 'burrito', 'pizza'];
  const dishType = nameWords.find(word => dishTypes.includes(word));

  // Primary: exact recipe name with "bowl" or "dish"
  queries.push(`${meta.name} bowl food`);
  queries.push(`${meta.name} dish`);

  // If there's a dish type, prioritize that
  if (dishType) {
    const protein = meta.tags.find(t =>
      ['chicken', 'turkey', 'beef', 'pork', 'fish', 'tofu', 'salmon', 'shrimp', 'lamb', 'duck', 'tuna'].includes(t.toLowerCase())
    );

    // For dishes like "Turkey Chili", search for "turkey chili bowl" and just "chili"
    if (protein) {
      queries.push(`${protein} ${dishType} bowl`);
    }
    queries.push(`${dishType} bowl food`);
  }

  // Fallback: cuisine + dish type
  if (meta.cuisine && dishType) {
    queries.push(`${meta.cuisine} ${dishType}`);
  }

  // Fallback: main ingredients
  const mainIngredients = meta.tags.filter(t =>
    !['high-protein', 'low-carb', 'healthy', 'comfort-food', 'batch-cook', 'meal-prep', 'quick', 'dinner', 'lunch', 'breakfast'].includes(t.toLowerCase())
  ).slice(0, 2);

  if (mainIngredients.length > 0) {
    queries.push(`${mainIngredients.join(' ')} food`);
  }

  return queries;
}

function isFoodRelated(text: string, recipeName?: string): boolean {
  const lowerText = text.toLowerCase();
  const foodKeywords = ['food', 'meal', 'dish', 'recipe', 'cuisine', 'cooking', 'plate', 'bowl', 'delicious', 'gourmet', 'culinary'];
  const excludeKeywords = [
    'illustration', 'logo', 'watermark', 'cartoon', 'drawing', 'vector', 'pattern', 'background', 'texture',
    'whole turkey', 'whole chicken', 'raw', 'uncooked', 'thanksgiving turkey', 'roast turkey', 'turkey dinner'
  ];

  // Must have food keyword
  const hasFood = foodKeywords.some(kw => lowerText.includes(kw));

  // Must not have exclude keyword
  const hasExclude = excludeKeywords.some(kw => lowerText.includes(kw));

  if (!hasFood || hasExclude) {
    return false;
  }

  // If we have a recipe name, check for keyword relevance
  if (recipeName) {
    const recipeKeywords = recipeName.toLowerCase()
      .split(/[\s-]+/) // Split on spaces and hyphens
      .filter(word => word.length > 3 && !['with', 'from', 'over', 'under'].includes(word));

    if (recipeKeywords.length === 0) {
      return true; // No significant keywords to check
    }

    // Count how many recipe keywords appear in the image description
    const matchedKeywords = recipeKeywords.filter(keyword => lowerText.includes(keyword));

    // For multi-word recipes (2+ keywords), require at least 2 matches OR the full recipe name
    if (recipeKeywords.length >= 2) {
      const hasFullRecipeName = lowerText.includes(recipeName.toLowerCase());
      const hasMultipleMatches = matchedKeywords.length >= 2;

      // Also check for the main dish keyword (last word is often the dish type)
      const dishKeyword = recipeKeywords[recipeKeywords.length - 1];
      const hasDishKeyword = lowerText.includes(dishKeyword);

      return hasFullRecipeName || (hasMultipleMatches && hasDishKeyword);
    }

    // For single-word recipes, just need one match
    return matchedKeywords.length > 0;
  }

  return true;
}

async function downloadImage(url: string): Promise<Uint8Array | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    const arrayBuffer = await response.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  } catch (error) {
    console.error('[downloadImage] Error:', error);
    return null;
  }
}

/////////////////////////////
// INTERNAL HELPERS - AI GENERATION
/////////////////////////////

export async function generateWithReplicate(meta: RecipeImageMeta): Promise<Uint8Array | null> {
  try {
    console.log('[generateWithReplicate] Starting...');

    if (!REPLICATE_API_KEY) {
      console.error('[generateWithReplicate] API key not configured!');
      return null;
    }

    console.log('[generateWithReplicate] API key found, building prompt...');
    const { prompt, negative } = buildPrompt(meta);

    console.log(`[generateWithReplicate] Prompt: ${prompt.substring(0, 100)}...`);
    console.log(`[generateWithReplicate] Calling Replicate API...`);

    // Use SDXL model for best quality
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${REPLICATE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: 'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b',
        input: {
          prompt: prompt,
          negative_prompt: negative,
          width: 1024,
          height: 1024,
          num_inference_steps: 30,
          guidance_scale: 7.5,
          scheduler: 'DPMSolverMultistep',
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[generateWithReplicate] ❌ API error (${response.status}): ${errorText}`);
      console.error(`[generateWithReplicate] Full error details:`, errorText);
      return null;
    }

    console.log('[generateWithReplicate] ✅ Prediction created successfully');

    const prediction = await response.json();
    const predictionId = prediction.id;

    console.log(`[generateWithReplicate] Prediction created: ${predictionId}, polling for result...`);

    // Poll for result (max 60 seconds)
    let attempts = 0;
    const maxAttempts = 30; // 30 attempts * 2 seconds = 60 seconds max

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds

      const statusResponse = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
        headers: {
          'Authorization': `Token ${REPLICATE_API_KEY}`,
        },
      });

      if (!statusResponse.ok) {
        console.error(`[generateWithReplicate] Status check failed: ${statusResponse.status}`);
        return null;
      }

      const status = await statusResponse.json();

      if (status.status === 'succeeded') {
        console.log('[generateWithReplicate] Generation succeeded!');

        // Get the image URL from the output
        const imageUrl = status.output?.[0];

        if (!imageUrl) {
          console.error('[generateWithReplicate] No image URL in response');
          return null;
        }

        // Download the image
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
          console.error('[generateWithReplicate] Failed to download image');
          return null;
        }

        const arrayBuffer = await imageResponse.arrayBuffer();
        const imageBuffer = new Uint8Array(arrayBuffer);

        console.log(`[generateWithReplicate] Image downloaded successfully (${imageBuffer.length} bytes)`);

        return imageBuffer;
      } else if (status.status === 'failed' || status.status === 'canceled') {
        console.error(`[generateWithReplicate] Generation failed: ${status.error || 'Unknown error'}`);
        return null;
      }

      // Still processing, continue polling
      attempts++;
      console.log(`[generateWithReplicate] Still processing... (attempt ${attempts}/${maxAttempts})`);
    }

    console.error('[generateWithReplicate] Timeout waiting for image generation');
    return null;
  } catch (error) {
    console.error('[generateWithReplicate] Error:', error);
    return null;
  }
}

export async function generateWithHuggingFace(meta: RecipeImageMeta): Promise<Uint8Array | null> {
  try {
    if (!HUGGINGFACE_API_KEY) {
      console.log('[generateWithHuggingFace] API key not configured');
      return null;
    }

    const { prompt } = buildPrompt(meta);

    console.log(`[generateWithHuggingFace] Generating image with prompt: ${prompt.substring(0, 100)}...`);

    // Use SDXL model for best quality (free on HuggingFace)
    const API_URL = 'https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0';

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          negative_prompt: buildPrompt(meta).negative,
          num_inference_steps: 25,
          guidance_scale: 7.5,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[generateWithHuggingFace] API error (${response.status}): ${errorText}`);

      // Check if model is loading
      if (response.status === 503 || errorText.includes('loading')) {
        console.log('[generateWithHuggingFace] Model is loading, this may take 20-60 seconds on first use');
      }

      return null;
    }

    // Response is binary image data
    const arrayBuffer = await response.arrayBuffer();
    const imageBuffer = new Uint8Array(arrayBuffer);

    console.log(`[generateWithHuggingFace] Image generated successfully (${imageBuffer.length} bytes)`);

    return imageBuffer;
  } catch (error) {
    console.error('[generateWithHuggingFace] Error:', error);
    return null;
  }
}

export async function generateLocal(meta: RecipeImageMeta): Promise<Uint8Array | null> {
  try {
    // Check if diffusion endpoint is configured
    if (!DIFFUSION_ENDPOINT || DIFFUSION_ENDPOINT === 'http://local-diffusion:7861') {
      console.log('[generateLocal] Diffusion service not configured, skipping AI generation');
      return null;
    }

    const { prompt, negative } = buildPrompt(meta);

    console.log(`[generateLocal] Calling diffusion service at ${DIFFUSION_ENDPOINT}`);
    console.log(`[generateLocal] Prompt: ${prompt.substring(0, 100)}...`);

    const response = await fetch(`${DIFFUSION_ENDPOINT}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        negative_prompt: negative,
        width: 1024,
        height: 1024,
        steps: 28,
        cfg: 7.5,
        seed: null,
      }),
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    if (!response.ok) {
      console.error(`[generateLocal] Diffusion service error: ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (!data.image) {
      console.error('[generateLocal] No image in response');
      return null;
    }

    // Decode base64 to buffer
    const base64Data = data.image;
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    return bytes;
  } catch (error) {
    if (error.name === 'TimeoutError') {
      console.error('[generateLocal] Diffusion service timeout (30s)');
    } else if (error.message?.includes('fetch')) {
      console.error('[generateLocal] Cannot connect to diffusion service - is it running?');
    } else {
      console.error('[generateLocal] Error:', error);
    }
    return null;
  }
}

export function buildPrompt(meta: RecipeImageMeta): { prompt: string; negative: string } {
  const dishName = meta.name;
  const cuisine = meta.cuisine || 'homestyle';

  // Extract key ingredients and dish characteristics from tags
  const ingredients = meta.tags.filter(t =>
    !['high-protein', 'low-carb', 'healthy', 'comfort-food', 'batch-cook', 'meal-prep', 'quick', 'dinner', 'lunch', 'breakfast'].includes(t.toLowerCase())
  ).slice(0, 3).join(', ');

  // Build a detailed, specific prompt
  const prompt = `Professional food photography of ${dishName}, ${cuisine} cuisine, served in a rustic ceramic bowl, overhead view, natural window lighting, wooden table background, steam rising, garnished, appetizing presentation, sharp focus on the food, shallow depth of field, 8k, high quality, detailed textures, vibrant colors, restaurant quality plating`;

  const negative = 'hands, people, fingers, text, watermark, logo, frame, blurry, out of focus, ugly, deformed, low quality, pixelated, distorted, overexposed, underexposed, duplicate, multiple bowls, cartoon, illustration, drawing, uncooked, raw meat, whole turkey, whole chicken, ingredients only';

  return { prompt, negative };
}

/////////////////////////////
// INTERNAL HELPERS - PROCESSING & STORAGE
/////////////////////////////

export async function postProcess(buffer: Uint8Array): Promise<Uint8Array> {
  // TODO: Implement with sharp library for:
  // - Crop to square (centered)
  // - Resize to min 1024x1024
  // - Apply mild tone normalization
  // For now, return as-is (sharp not available in Deno edge functions by default)
  // This would need to be done in a separate service or use Deno's image processing

  return buffer;
}

export function sha256(buffer: Uint8Array): string {
  const hashBuffer = crypto.subtle.digestSync('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

export async function storeToSupabase(
  buffer: Uint8Array,
  pathHint: string
): Promise<{ publicUrl: string; path: string }> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const path = pathHint;

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, buffer, {
      contentType: 'image/png',
      upsert: true,
    });

  if (uploadError) {
    console.error('[storeToSupabase] Upload error:', uploadError);
    throw new Error(`Failed to upload image: ${uploadError.message}`);
  }

  const { data: urlData } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(path);

  console.log(`[storeToSupabase] Image stored at: ${path}`);

  return {
    publicUrl: urlData.publicUrl,
    path,
  };
}

export async function getPlaceholderUrl(category?: string): Promise<string> {
  // Use placeholder.com for reliable placeholder images
  // These are color-coded by category for visual distinction
  const categoryColors: Record<string, string> = {
    'breakfast': 'FFD93D',      // Yellow
    'lunch': '6BCB77',          // Green
    'dinner': 'FF6B6B',         // Red
    'dessert': 'C44569',        // Pink
    'high-protein': '4D96FF',   // Blue
    'vegetarian': '95E1D3',     // Mint
    'vegan': '6BCB77',          // Green
    'comfort-food': 'F38181',   // Coral
    'healthy': '95E1D3',        // Mint
    'default': 'AAAAAA'         // Gray
  };

  const slug = category?.toLowerCase().replace(/\s+/g, '-') || 'default';
  const color = categoryColors[slug] || categoryColors['default'];

  // Use placeholder.com with category label
  const label = (category || 'Recipe').replace(/\s+/g, '+');

  return `https://via.placeholder.com/1024x1024/${color}/FFFFFF?text=${label}`;
}
