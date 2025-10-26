import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { recipe } = body;

    if (!recipe || !recipe.id || !recipe.name) {
      return NextResponse.json(
        { error: 'Missing required recipe fields' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Insert recipe into database
    const { data, error } = await supabase
      .from('recipes')
      .insert({
        id: recipe.id,
        name: recipe.name,
        description: recipe.description,
        cook_time: parseInt(recipe.cookTime) || 30,
        servings: recipe.servings,
        calories: recipe.calories,
        protein: recipe.protein,
        tags: recipe.tags,
        cuisine: recipe.cuisine,
        category: recipe.category,
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving recipe:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      recipe: data,
    });
  } catch (error) {
    console.error('Error in favorites/add:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
