import { NextResponse } from 'next/server';
import { withGuards, type GuardedRequest, type NextRouteHandlerContext } from '../../../src/guards/withGuards';
import { generateRecipeWithAI } from '../../../lib/ai/recipe-generator';

type Recipe = {
  id: string;
  name: string;
  description: string;
  cookTime: string;
  servings: number;
  calories: number;
  protein: number;
  carbs?: number;
  fat?: number;
  tags: string[];
  cuisine: string;
  category: string;
  ingredients: string[];
  instructions: string[];
};

async function assistantHandler(request: GuardedRequest, _context: NextRouteHandlerContext) {
  // TODO: Add authentication check once auth system is fully tested

  const sanitizedPrompt = request.savr?.sanitizedPrompt || '';
  const intent = request.savr?.guard?.intent || 'UNKNOWN';

  // Generate recipe using AI
  let aiRecipe;
  try {
    aiRecipe = await generateRecipeWithAI({
      prompt: sanitizedPrompt,
    });
  } catch (error) {
    console.error('[assistant] AI generation failed:', error);
    return NextResponse.json(
      { error: { message: 'Failed to generate recipe. Please try again.' } },
      { status: 500 }
    );
  }

  // Save recipe to database (or get existing one)
  try {
    const saveResponse = await fetch(`${request.url.split('/api')[0]}/api/recipes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: aiRecipe.name,
        description: aiRecipe.description,
        cuisine: aiRecipe.cuisine,
        category: aiRecipe.category,
        cook_time: aiRecipe.cook_time,
        servings: aiRecipe.servings,
        calories: aiRecipe.calories,
        protein: aiRecipe.protein,
        carbs: aiRecipe.carbs,
        fat: aiRecipe.fat,
        tags: aiRecipe.tags,
        ingredients: aiRecipe.ingredients,
        instructions: aiRecipe.instructions,
      }),
    });

    if (!saveResponse.ok) {
      console.error('[assistant] Failed to save recipe to database');
    } else {
      const { recipe: savedRecipe, existed } = await saveResponse.json();
      console.log(
        `[assistant] Recipe "${savedRecipe.name}" ${existed ? 'already existed' : 'created'} in database`
      );

      // Return the saved recipe with database ID
      return NextResponse.json({
        result: `Here's a delicious recipe for you!`,
        intent,
        onTopicScore: request.savr?.guard?.onTopicScore,
        recipe: {
          id: savedRecipe.id,
          name: savedRecipe.name,
          description: savedRecipe.description,
          cookTime: savedRecipe.cook_time,
          servings: savedRecipe.servings,
          calories: savedRecipe.calories,
          protein: savedRecipe.protein,
          carbs: savedRecipe.carbs,
          fat: savedRecipe.fat,
          tags: savedRecipe.tags,
          cuisine: savedRecipe.cuisine,
          category: savedRecipe.category,
          ingredients: savedRecipe.ingredients,
          instructions: savedRecipe.instructions,
        },
      });
    }
  } catch (error) {
    console.error('[assistant] Error saving recipe:', error);
    // Continue with temporary ID if database save fails
  }

  // Fallback if database save fails
  return NextResponse.json({
    result: `Here's a delicious recipe for you!`,
    intent,
    onTopicScore: request.savr?.guard?.onTopicScore,
    recipe: {
      id: `recipe-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: aiRecipe.name,
      description: aiRecipe.description,
      cookTime: aiRecipe.cook_time,
      servings: aiRecipe.servings,
      calories: aiRecipe.calories,
      protein: aiRecipe.protein,
      carbs: aiRecipe.carbs,
      fat: aiRecipe.fat,
      tags: aiRecipe.tags,
      cuisine: aiRecipe.cuisine,
      category: aiRecipe.category,
      ingredients: aiRecipe.ingredients,
      instructions: aiRecipe.instructions,
    },
  });
}

export const POST = withGuards(assistantHandler);
