// imageUtils.ts - Image processing and storage utilities for Supabase Edge Functions
// Deno-compatible version (no sharp - edge functions don't support it)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { crypto } from 'https://deno.land/std@0.177.0/crypto/mod.ts';

/////////////////////////////
// TYPES
/////////////////////////////

export type ImageResult = {
  imageUrl: string;
  source: 'stock' | 'generated' | 'placeholder';
  provider?: 'pexels' | 'unsplash' | 'pixabay';
  imageId: string;
};

/////////////////////////////
// CONFIGURATION
/////////////////////////////

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const STORAGE_BUCKET = 'Recipes';
const DEFAULT_PLACEHOLDER = '/placeholders/default.png';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

/////////////////////////////
// IMAGE PROCESSING
/////////////////////////////

/**
 * Post-process an image buffer
 * Note: Deno Edge Functions don't support sharp library
 * This is a placeholder that passes through the buffer
 * For actual processing, use a separate Node.js service or processing function
 */
export async function postProcess(buffer: Uint8Array): Promise<Uint8Array> {
  // Edge Functions limitation: sharp is not available in Deno runtime
  // For production, you have two options:
  // 1. Use a separate Node.js processing service
  // 2. Use ImageMagick via Deno subprocess (complex)
  // 3. Accept images as-is and process them asynchronously later

  // For now, return buffer as-is
  // Stock images are already high quality and appropriate size
  console.log('[postProcess] Pass-through (sharp not available in Edge Functions)');
  return buffer;
}

/**
 * Calculate SHA-256 hash of a buffer
 */
export function sha256(buffer: Uint8Array): string {
  const hashBuffer = crypto.subtle.digestSync('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/////////////////////////////
// STORAGE
/////////////////////////////

/**
 * Upload image buffer to Supabase Storage
 * Includes retry logic for network failures
 */
export async function storeToSupabase(
  buffer: Uint8Array,
  pathHint: string
): Promise<{ publicUrl: string; path: string }> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const path = pathHint;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[storeToSupabase] Upload attempt ${attempt}/${MAX_RETRIES}: ${path}`);

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(path, buffer, {
          contentType: 'image/png',
          upsert: true,
          cacheControl: '31536000', // 1 year cache
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(path);

      console.log(`[storeToSupabase] Upload successful: ${urlData.publicUrl}`);

      return {
        publicUrl: urlData.publicUrl,
        path,
      };
    } catch (error) {
      lastError = error as Error;
      console.error(`[storeToSupabase] Attempt ${attempt} failed:`, error);

      if (attempt < MAX_RETRIES) {
        const delay = RETRY_DELAY_MS * attempt;
        console.log(`[storeToSupabase] Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(`Failed to upload image after ${MAX_RETRIES} attempts: ${lastError?.message}`);
}

/////////////////////////////
// DATABASE OPERATIONS
/////////////////////////////

/**
 * Get placeholder image URL for a category
 * Falls back to default if category not found
 */
export async function getPlaceholderUrl(category?: string): Promise<string> {
  if (!category) {
    console.log('[getPlaceholderUrl] No category provided, using default');
    return DEFAULT_PLACEHOLDER;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Normalize category to slug format
  const slug = category.toLowerCase().replace(/\s+/g, '-');

  try {
    const { data, error } = await supabase
      .from('placeholders')
      .select('url')
      .eq('category_slug', slug)
      .single();

    if (error || !data) {
      console.log(`[getPlaceholderUrl] Category '${slug}' not found, using default`);
      return DEFAULT_PLACEHOLDER;
    }

    console.log(`[getPlaceholderUrl] Found placeholder for '${slug}': ${data.url}`);
    return data.url;
  } catch (error) {
    console.error('[getPlaceholderUrl] Error fetching placeholder:', error);
    return DEFAULT_PLACEHOLDER;
  }
}

/**
 * Find existing image linked to a recipe
 * Returns null if no image is linked
 */
export async function findExistingImage(recipeId: string): Promise<ImageResult | null> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    const { data, error } = await supabase
      .from('recipes')
      .select(`
        image_id,
        images!inner(
          id,
          url,
          source,
          stock_provider
        )
      `)
      .eq('id', recipeId)
      .single();

    if (error || !data || !data.image_id) {
      return null;
    }

    const image = data.images as any;

    // Update last_used timestamp
    await supabase
      .from('images')
      .update({ last_used: new Date().toISOString() })
      .eq('id', image.id);

    return {
      imageUrl: image.url,
      source: image.source,
      provider: image.stock_provider || undefined,
      imageId: image.id,
    };
  } catch (error) {
    console.error('[findExistingImage] Error:', error);
    return null;
  }
}

/**
 * Insert or update an image record
 * Returns the image ID
 */
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

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[upsertImageRow] Insert attempt ${attempt}/${MAX_RETRIES}`);

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
        throw error;
      }

      console.log(`[upsertImageRow] Image inserted: ${data.id}`);
      return { id: data.id };
    } catch (error) {
      lastError = error as Error;
      console.error(`[upsertImageRow] Attempt ${attempt} failed:`, error);

      if (attempt < MAX_RETRIES) {
        const delay = RETRY_DELAY_MS * attempt;
        console.log(`[upsertImageRow] Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(`Failed to insert image after ${MAX_RETRIES} attempts: ${lastError?.message}`);
}

/**
 * Link a recipe to an image
 * Updates the recipe.image_id field
 */
export async function linkRecipeImage(recipeId: string, imageId: string): Promise<void> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[linkRecipeImage] Link attempt ${attempt}/${MAX_RETRIES}`);

      const { error } = await supabase
        .from('recipes')
        .update({ image_id: imageId })
        .eq('id', recipeId);

      if (error) {
        throw error;
      }

      console.log(`[linkRecipeImage] Recipe ${recipeId} linked to image ${imageId}`);
      return;
    } catch (error) {
      lastError = error as Error;
      console.error(`[linkRecipeImage] Attempt ${attempt} failed:`, error);

      if (attempt < MAX_RETRIES) {
        const delay = RETRY_DELAY_MS * attempt;
        console.log(`[linkRecipeImage] Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(`Failed to link recipe after ${MAX_RETRIES} attempts: ${lastError?.message}`);
}

/**
 * Find image by hash (for deduplication)
 * Returns image ID if found, null otherwise
 */
export async function findImageByHash(hash: string): Promise<string | null> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    const { data, error } = await supabase
      .from('images')
      .select('id')
      .eq('hash', hash)
      .single();

    if (error || !data) {
      return null;
    }

    console.log(`[findImageByHash] Found duplicate image: ${data.id}`);
    return data.id;
  } catch (error) {
    console.error('[findImageByHash] Error:', error);
    return null;
  }
}

/**
 * Update last_used timestamp for an image
 */
export async function updateLastUsed(imageId: string): Promise<void> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    await supabase
      .from('images')
      .update({ last_used: new Date().toISOString() })
      .eq('id', imageId);
  } catch (error) {
    // Non-critical - log but don't throw
    console.error('[updateLastUsed] Error:', error);
  }
}
