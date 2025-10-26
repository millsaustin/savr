import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.recipeId || !body.name || !body.tags) {
      return NextResponse.json(
        { error: 'Missing required fields: recipeId, name, and tags are required' },
        { status: 400 }
      );
    }

    // Call the real Supabase Edge Function
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing');
    }

    console.log('[fetch-recipe-image] Calling Edge Function for:', body.name);

    const response = await fetch(
      `${supabaseUrl}/functions/v1/fetch-recipe-image`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipeId: body.recipeId,
          name: body.name,
          tags: body.tags,
          category: body.category,
          cuisine: body.cuisine,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch image from Supabase');
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('[fetch-recipe-image] Error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
