// Supabase Edge Function: fetch-recipe-image
// POST /api/images/fetch-or-generate
// Fetches or creates an image for a recipe using stock-first + AI fallback pipeline

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { fetchOrCreateRecipeImage, type RecipeImageMeta, type ImageResult } from '../_shared/imageService.ts';

/////////////////////////////
// REQUEST VALIDATION
/////////////////////////////

interface RequestBody extends RecipeImageMeta {
  // All fields from RecipeImageMeta
}

function validateRequestBody(body: any): { valid: boolean; error?: string; data?: RequestBody } {
  // Check required fields
  if (!body.recipeId || typeof body.recipeId !== 'string') {
    return { valid: false, error: 'Missing or invalid recipeId (must be UUID string)' };
  }

  if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
    return { valid: false, error: 'Missing or invalid name (must be non-empty string)' };
  }

  if (!Array.isArray(body.tags)) {
    return { valid: false, error: 'Missing or invalid tags (must be array)' };
  }

  // Validate UUID format (basic check)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(body.recipeId)) {
    return { valid: false, error: 'Invalid recipeId format (must be valid UUID)' };
  }

  // Optional fields validation
  if (body.category !== undefined && typeof body.category !== 'string') {
    return { valid: false, error: 'Invalid category (must be string if provided)' };
  }

  if (body.cuisine !== undefined && typeof body.cuisine !== 'string') {
    return { valid: false, error: 'Invalid cuisine (must be string if provided)' };
  }

  return {
    valid: true,
    data: {
      recipeId: body.recipeId,
      name: body.name.trim(),
      tags: body.tags.filter((t: any) => typeof t === 'string' && t.trim().length > 0),
      category: body.category?.trim() || undefined,
      cuisine: body.cuisine?.trim() || undefined,
    },
  };
}

/////////////////////////////
// AUTHENTICATION (OPTIONAL)
/////////////////////////////

function validateAuth(req: Request): { authorized: boolean; error?: string } {
  // Option 1: Allow service role key (server-to-server)
  const authHeader = req.headers.get('Authorization');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (authHeader && serviceRoleKey) {
    const token = authHeader.replace('Bearer ', '');
    if (token === serviceRoleKey) {
      return { authorized: true };
    }
  }

  // Option 2: Allow API key (custom header)
  const apiKey = req.headers.get('X-API-Key');
  const validApiKey = Deno.env.get('IMAGE_API_KEY');

  if (apiKey && validApiKey && apiKey === validApiKey) {
    return { authorized: true };
  }

  // Option 3: Allow unauthenticated requests (for development)
  const allowPublic = Deno.env.get('ALLOW_PUBLIC_IMAGE_REQUESTS') === 'true';

  if (allowPublic) {
    console.warn('[Auth] Public requests are allowed (development mode)');
    return { authorized: true };
  }

  return { authorized: false, error: 'Unauthorized: Missing or invalid authentication' };
}

/////////////////////////////
// MAIN HANDLER
/////////////////////////////

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({
          error: 'Method not allowed',
          message: 'Only POST requests are accepted',
        }),
        {
          status: 405,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Validate authentication
    const authResult = validateAuth(req);
    if (!authResult.authorized) {
      return new Response(
        JSON.stringify({
          error: 'Unauthorized',
          message: authResult.error || 'Authentication required',
        }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Parse request body
    let body: any;
    try {
      body = await req.json();
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: 'Invalid JSON',
          message: 'Request body must be valid JSON',
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Validate request body
    const validation = validateRequestBody(body);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({
          error: 'Validation failed',
          message: validation.error,
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const meta = validation.data!;
    const forceRegenerate = body.forceRegenerate === true;

    // Log the request
    console.log(`[fetch-recipe-image] Processing request for recipe: ${meta.recipeId}`);
    console.log(`[fetch-recipe-image] Recipe name: ${meta.name}`);
    console.log(`[fetch-recipe-image] Tags: ${meta.tags.join(', ')}`);
    console.log(`[fetch-recipe-image] Force regenerate: ${forceRegenerate}`);

    // Call the image service
    const startTime = Date.now();
    const result: ImageResult = await fetchOrCreateRecipeImage(meta, forceRegenerate);
    const duration = Date.now() - startTime;

    console.log(`[fetch-recipe-image] Success! Source: ${result.source}, Duration: ${duration}ms`);

    // Return success response
    return new Response(
      JSON.stringify({
        image_url: result.imageUrl,
        source: result.source,
        provider: result.provider,
        image_id: result.imageId,
        processing_time_ms: duration,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    // Log the error
    console.error('[fetch-recipe-image] Error:', error);

    // Determine error type and status code
    let status = 500;
    let errorMessage = 'Internal server error';
    let errorDetails = error instanceof Error ? error.message : String(error);

    // Specific error handling
    if (errorDetails.includes('not found')) {
      status = 404;
      errorMessage = 'Resource not found';
    } else if (errorDetails.includes('timeout')) {
      status = 504;
      errorMessage = 'Request timeout';
    } else if (errorDetails.includes('network') || errorDetails.includes('fetch')) {
      status = 502;
      errorMessage = 'External service error';
    }

    return new Response(
      JSON.stringify({
        error: errorMessage,
        message: errorDetails,
        details: error instanceof Error ? {
          name: error.name,
          stack: Deno.env.get('DENO_ENV') === 'development' ? error.stack : undefined,
        } : undefined,
      }),
      {
        status,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
