import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Helper to get authenticated user
async function getAuthenticatedUser(request: NextRequest) {
  const cookieStore = cookies();
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        cookie: cookieStore.toString(),
      },
    },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

// GET /api/favorites - Get user's favorite recipes
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Get user's favorites with recipe details
    const { data, error } = await supabase
      .from('user_favorites')
      .select(`
        id,
        collection,
        notes,
        created_at,
        recipe:shared_recipes (
          id,
          name,
          description,
          cuisine,
          category,
          cook_time,
          servings,
          calories,
          protein,
          carbs,
          fat,
          tags,
          ingredients,
          instructions,
          image_id,
          images (
            url,
            source,
            stock_provider
          )
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[favorites] Error fetching favorites:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ favorites: data });
  } catch (error) {
    console.error('[favorites] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/favorites - Add recipe to favorites
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { recipe_id, collection, notes } = body;

    if (!recipe_id) {
      return NextResponse.json({ error: 'Missing recipe_id' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { data, error } = await supabase
      .from('user_favorites')
      .insert({
        user_id: user.id,
        recipe_id,
        collection,
        notes,
      })
      .select()
      .single();

    if (error) {
      // Check if it's a duplicate
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Recipe already in favorites' },
          { status: 409 }
        );
      }

      console.error('[favorites] Error adding favorite:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ favorite: data });
  } catch (error) {
    console.error('[favorites] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/favorites?recipe_id=xxx - Remove from favorites
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const recipe_id = searchParams.get('recipe_id');

    if (!recipe_id) {
      return NextResponse.json({ error: 'Missing recipe_id' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { error } = await supabase
      .from('user_favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('recipe_id', recipe_id);

    if (error) {
      console.error('[favorites] Error removing favorite:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[favorites] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
