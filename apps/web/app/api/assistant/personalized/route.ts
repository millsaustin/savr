import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { withGuards, type GuardedRequest, type NextRouteHandlerContext } from '../../../../src/guards/withGuards';
import { generateRecipeWithAI } from '../../../../lib/ai/recipe-generator';
import { getUserContext as fetchUserContext } from '../../../../lib/db/user-context';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function personalizedAssistantHandler(request: GuardedRequest, _context: NextRouteHandlerContext) {
  // Get authenticated user
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
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: { message: 'Authentication required for personalized responses' } },
      { status: 401 }
    );
  }

  const sanitizedPrompt = request.savr?.sanitizedPrompt || '';
  const intent = request.savr?.guard?.intent || 'UNKNOWN';

  // Fetch real user context from database
  let userContext;
  try {
    userContext = await fetchUserContext(user.id);
  } catch (error) {
    console.error('[personalized-assistant] Error fetching user context:', error);
    userContext = {
      pantryItems: [],
      dietaryRestrictions: [],
      favoriteCuisines: [],
      dislikedIngredients: [],
    };
  }

  // Check if user is asking for a recipe
  const lowerPrompt = sanitizedPrompt.toLowerCase();
  const isRecipeRequest =
    lowerPrompt.includes('recipe') ||
    lowerPrompt.includes('make') ||
    lowerPrompt.includes('cook') ||
    lowerPrompt.includes('meal') ||
    lowerPrompt.includes('dinner') ||
    lowerPrompt.includes('lunch') ||
    lowerPrompt.includes('breakfast');

  if (isRecipeRequest) {
    // Generate a personalized recipe using AI
    try {
      const aiRecipe = await generateRecipeWithAI({
        prompt: sanitizedPrompt,
        userContext,
      });

      // Save recipe to database
      const saveResponse = await fetch(`${request.url.split('/api')[0]}/api/recipes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

      if (saveResponse.ok) {
        const { recipe: savedRecipe, existed } = await saveResponse.json();
        console.log(`[personalized-assistant] Recipe "${savedRecipe.name}" ${existed ? 'already existed' : 'created'}`);

        return NextResponse.json({
          result: `Here's a personalized recipe based on your ${userContext.pantryItems.length > 0 ? 'pantry items and ' : ''}preferences!`,
          intent,
          onTopicScore: request.savr?.guard?.onTopicScore,
          personalized: true,
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
      console.error('[personalized-assistant] Error generating recipe:', error);
      return NextResponse.json(
        { error: { message: 'Failed to generate personalized recipe' } },
        { status: 500 }
      );
    }
  }

  // For non-recipe requests, provide contextual text responses
  const contextSummary = buildContextSummary(userContext);
  const responseText = `Based on your profile:\n${contextSummary}\n\n${generateContextualResponse(sanitizedPrompt, userContext)}`;

  return NextResponse.json({
    result: responseText,
    intent,
    onTopicScore: request.savr?.guard?.onTopicScore,
    personalized: true,
    userContext: {
      pantryItemCount: userContext.pantryItems.length,
      hasGoals: !!(userContext.dailyCalories || userContext.dailyProtein),
    },
  });
}

function buildContextSummary(context: any): string {
  const parts: string[] = [];

  if (context.pantryItems.length > 0) {
    parts.push(`${context.pantryItems.length} pantry items`);
  }

  if (context.dailyCalories) {
    parts.push(`${context.dailyCalories} cal/day goal`);
  }

  if (context.dailyProtein) {
    parts.push(`${context.dailyProtein}g protein goal`);
  }

  if (context.dietaryRestrictions.length > 0) {
    parts.push(`dietary restrictions: ${context.dietaryRestrictions.join(', ')}`);
  }

  return parts.length > 0 ? parts.join(' • ') : 'No profile data yet';
}

function generateContextualResponse(prompt: string, context: any): string {
  const lowerPrompt = prompt.toLowerCase();

  if (lowerPrompt.includes('pantry')) {
    if (context.pantryItems.length === 0) {
      return "You haven't added any pantry items yet! Add items to your pantry in the dashboard to get personalized meal suggestions.";
    }
    return `Your pantry includes: ${context.pantryItems.slice(0, 10).join(', ')}${context.pantryItems.length > 10 ? `, and ${context.pantryItems.length - 10} more items` : ''}. I can help you create recipes using these ingredients!`;
  }

  if (lowerPrompt.includes('goal') || lowerPrompt.includes('macro')) {
    if (!context.dailyCalories && !context.dailyProtein) {
      return "You haven't set your macro goals yet! Visit your profile settings to set daily calorie and macro targets.";
    }
    const goals = [];
    if (context.dailyCalories) goals.push(`${context.dailyCalories} calories`);
    if (context.dailyProtein) goals.push(`${context.dailyProtein}g protein`);
    if (context.dailyCarbs) goals.push(`${context.dailyCarbs}g carbs`);
    if (context.dailyFat) goals.push(`${context.dailyFat}g fat`);
    return `Your daily goals are: ${goals.join(', ')}. I can create meal plans that help you hit these targets!`;
  }

  return `I can help you with meal planning, recipes, grocery lists, and more! Try asking me to create a recipe, plan meals for the week, or suggest what to make with your pantry items.`;
}

export const POST = withGuards(personalizedAssistantHandler);
