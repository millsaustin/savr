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
const DIFFUSION_ENDPOINT = Deno.env.get('DIFFUSION_ENDPOINT') || 'http://local-diffusion:7861';

const STORAGE_BUCKET = 'Recipes';
const DEFAULT_PLACEHOLDER = '/placeholders/default.png';

/////////////////////////////
// PUBLIC ENTRY POINT
/////////////////////////////

export async function fetchOrCreateRecipeImage(meta: RecipeImageMeta): Promise<ImageResult> {
  console.log(`[imageService] Processing recipe: ${meta.recipeId} - ${meta.name}`);

  // 1) Short-circuit: if recipe already has image → return
  const existing = await findExistingImage(meta.recipeId);
  if (existing) {
    console.log(`[imageService] Existing image found: ${existing.imageId}`);
    await updateLastUsed(existing.imageId);
    return existing;
  }

  // 2) Try stock search (pexels → unsplash → pixabay)
  console.log('[imageService] Attempting stock image search...');
  const stockImage = await tryStock(meta);

  if (stockImage) {
    console.log(`[imageService] Stock image found from ${stockImage.provider}`);
    const processed = await postProcess(stockImage.buffer);
    const hash = sha256(processed);

    // Check for duplicate by hash
    const existingByHash = await findImageByHash(hash);
    if (existingByHash) {
      console.log(`[imageService] Duplicate image found, reusing: ${existingByHash.imageId}`);
      await linkRecipeImage(meta.recipeId, existingByHash.imageId);
      await updateLastUsed(existingByHash.imageId);
      return existingByHash;
    }

    const { publicUrl } = await storeToSupabase(processed, `${meta.recipeId}/${hash}.png`);

    const { id: imageId } = await upsertImageRow({
      recipe_id: meta.recipeId,
      url: publicUrl,
      source: 'stock',
      stock_provider: stockImage.provider,
      photographer_name: stockImage.photographer,
      license_url: stockImage.licenseUrl,
      hash,
    });

    await linkRecipeImage(meta.recipeId, imageId);

    return {
      imageUrl: publicUrl,
      source: 'stock',
      provider: stockImage.provider,
      imageId,
    };
  }

  // 3) If none found, call local diffusion microservice
  console.log('[imageService] Stock search failed, attempting AI generation...');
  const generatedBuffer = await generateLocal(meta);

  if (generatedBuffer) {
    console.log('[imageService] AI image generated successfully');
    const processed = await postProcess(generatedBuffer);
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
      style_version: 'v1.0-rustic-light',
      prompt: `${prompt}\n\nNegative: ${negative}`,
    });

    await linkRecipeImage(meta.recipeId, imageId);

    return {
      imageUrl: publicUrl,
      source: 'generated',
      imageId,
    };
  }

  // 4) If that fails, return placeholder by category
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
          // Filter: width >= 1024, food-related
          if (photo.width >= 1024 && isFoodRelated(photo.alt || '')) {
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
          // Filter: width >= 1024, food-related
          if (photo.width >= 1024 && isFoodRelated(photo.description || photo.alt_description || '')) {
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
          // Filter: width >= 1024, food-related
          if (photo.imageWidth >= 1024 && isFoodRelated(photo.tags || '')) {
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

  // Primary: dish name + protein + meal type
  const protein = meta.tags.find(t => ['chicken', 'beef', 'pork', 'fish', 'tofu', 'salmon', 'shrimp'].includes(t.toLowerCase()));
  const mealType = meta.tags.find(t => ['breakfast', 'lunch', 'dinner', 'dessert', 'snack'].includes(t.toLowerCase()));

  if (protein && mealType) {
    queries.push(`${meta.name} ${protein} ${mealType} food`);
  }

  // Fallback: dish name
  queries.push(`${meta.name} food dish`);

  // Fallback: cuisine + category
  if (meta.cuisine) {
    queries.push(`${meta.cuisine} cuisine food`);
  }

  // Fallback: category
  if (meta.category) {
    queries.push(`${meta.category} food meal`);
  }

  return queries;
}

function isFoodRelated(text: string): boolean {
  const lowerText = text.toLowerCase();
  const foodKeywords = ['food', 'meal', 'dish', 'recipe', 'cuisine', 'cooking', 'plate', 'bowl', 'delicious', 'gourmet', 'culinary'];
  const excludeKeywords = ['illustration', 'logo', 'watermark', 'cartoon', 'drawing', 'vector'];

  // Must have food keyword
  const hasFood = foodKeywords.some(kw => lowerText.includes(kw));

  // Must not have exclude keyword
  const hasExclude = excludeKeywords.some(kw => lowerText.includes(kw));

  return hasFood && !hasExclude;
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
// INTERNAL HELPERS - LOCAL AI GENERATION
/////////////////////////////

export async function generateLocal(meta: RecipeImageMeta): Promise<Uint8Array | null> {
  try {
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
    console.error('[generateLocal] Error:', error);
    return null;
  }
}

export function buildPrompt(meta: RecipeImageMeta): { prompt: string; negative: string } {
  const dishName = meta.name;
  const cuisine = meta.cuisine || 'international';

  const prompt = `Photorealistic overhead shot of a plated ${dishName}, ${cuisine} style, natural daylight, rustic wooden table, shallow depth of field, appetizing, sharp focus, professional food photography, high quality, detailed, vibrant colors`;

  const negative = 'hands, text, watermark, logo, frame, extra limbs, distorted, grotesque, lowres, blurry, ugly, deformed, disfigured, poorly drawn, bad anatomy, wrong anatomy, extra limb, missing limb';

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
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const slug = category?.toLowerCase().replace(/\s+/g, '-') || 'default';

  const { data, error } = await supabase
    .from('placeholders')
    .select('url')
    .eq('category_slug', slug)
    .single();

  if (error || !data) {
    console.log(`[getPlaceholderUrl] Category ${slug} not found, using default`);
    return DEFAULT_PLACEHOLDER;
  }

  return data.url;
}
