import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// GET /api/recipes - Get all shared recipes or search by name
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');
    const cuisine = searchParams.get('cuisine');
    const category = searchParams.get('category');

    let query = supabase.from('recipes_with_images').select('*');

    if (name) {
      query = query.ilike('name', `%${name}%`);
    }
    if (cuisine) {
      query = query.eq('cuisine', cuisine);
    }
    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query.order('created_at', { ascending: false }).limit(50);

    if (error) {
      console.error('[recipes] Error fetching recipes:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ recipes: data });
  } catch (error) {
    console.error('[recipes] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/recipes - Create or get existing shared recipe
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body = await request.json();

    const {
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
    } = body;

    // Validate required fields
    if (!name || !ingredients || !instructions) {
      return NextResponse.json(
        { error: 'Missing required fields: name, ingredients, instructions' },
        { status: 400 }
      );
    }

    // Check if recipe already exists (by name, case-insensitive)
    const { data: existingRecipes, error: searchError } = await supabase
      .from('shared_recipes')
      .select('*')
      .ilike('name', name)
      .limit(1);

    if (searchError) {
      console.error('[recipes] Error searching for existing recipe:', searchError);
      return NextResponse.json({ error: searchError.message }, { status: 500 });
    }

    // If recipe exists, return it
    if (existingRecipes && existingRecipes.length > 0) {
      console.log(`[recipes] Recipe "${name}" already exists, returning existing`);
      return NextResponse.json({
        recipe: existingRecipes[0],
        existed: true,
      });
    }

    // Create new recipe
    const { data: newRecipe, error: insertError } = await supabase
      .from('shared_recipes')
      .insert({
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
        tags: tags || [],
        ingredients,
        instructions,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[recipes] Error creating recipe:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    console.log(`[recipes] Created new recipe: ${name}`);

    return NextResponse.json({
      recipe: newRecipe,
      existed: false,
    });
  } catch (error) {
    console.error('[recipes] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
