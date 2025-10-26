import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export type RecipeRequest = {
  prompt: string;
  userContext?: {
    pantryItems?: string[];
    dietaryRestrictions?: string[];
    favoriteCuisines?: string[];
    dislikedIngredients?: string[];
    dailyCalories?: number;
    dailyProtein?: number;
    dailyCarbs?: number;
    dailyFat?: number;
    cookingSkillLevel?: string;
    availableCookTime?: number;
  };
};

export type GeneratedRecipe = {
  name: string;
  description: string;
  cuisine: string;
  category: string;
  cook_time: string;
  servings: number;
  calories: number;
  protein: number;
  carbs?: number;
  fat?: number;
  tags: string[];
  ingredients: string[];
  instructions: string[];
};

export async function generateRecipeWithAI(
  request: RecipeRequest
): Promise<GeneratedRecipe> {
  const { prompt, userContext } = request;

  // Build context string
  let contextString = '';
  if (userContext) {
    const parts: string[] = [];

    if (userContext.pantryItems && userContext.pantryItems.length > 0) {
      parts.push(`Available Pantry Items: ${userContext.pantryItems.join(', ')}`);
    }

    if (userContext.dietaryRestrictions && userContext.dietaryRestrictions.length > 0) {
      parts.push(`Dietary Restrictions: ${userContext.dietaryRestrictions.join(', ')}`);
    }

    if (userContext.dislikedIngredients && userContext.dislikedIngredients.length > 0) {
      parts.push(`Avoid These Ingredients: ${userContext.dislikedIngredients.join(', ')}`);
    }

    if (userContext.favoriteCuisines && userContext.favoriteCuisines.length > 0) {
      parts.push(`Preferred Cuisines: ${userContext.favoriteCuisines.join(', ')}`);
    }

    if (userContext.dailyCalories) {
      parts.push(`Daily Calorie Target: ${userContext.dailyCalories} cal`);
    }

    if (userContext.dailyProtein) {
      parts.push(`Daily Protein Goal: ${userContext.dailyProtein}g`);
    }

    if (userContext.cookingSkillLevel) {
      parts.push(`Cooking Skill: ${userContext.cookingSkillLevel}`);
    }

    if (userContext.availableCookTime) {
      parts.push(`Available Cook Time: ${userContext.availableCookTime} minutes`);
    }

    if (parts.length > 0) {
      contextString = `\n\nUser Context:\n${parts.join('\n')}`;
    }
  }

  const systemPrompt = `You are a professional chef and nutritionist AI assistant for Savr, a meal planning app. Your job is to generate delicious, healthy recipes based on user requests.

IMPORTANT: You must respond with ONLY a valid JSON object. Do not include any markdown formatting, code blocks, or additional text.

The JSON must have this exact structure:
{
  "name": "Recipe Name",
  "description": "Brief description",
  "cuisine": "Cuisine type (e.g., Italian, Mexican, Asian, Mediterranean)",
  "category": "Category (e.g., high-protein, vegan, keto, comfort-food)",
  "cook_time": "Time with unit (e.g., 30 min, 1 hour)",
  "servings": 4,
  "calories": 450,
  "protein": 30,
  "carbs": 40,
  "fat": 15,
  "tags": ["tag1", "tag2", "tag3"],
  "ingredients": ["ingredient 1", "ingredient 2"],
  "instructions": ["step 1", "step 2"]
}

Guidelines:
- Prefer using pantry items if provided
- Respect dietary restrictions and avoid disliked ingredients
- Match the user's skill level (simpler recipes for beginners)
- Keep cook time within available time if specified
- Make recipes nutritionally balanced
- Include specific measurements in ingredients
- Make instructions clear and concise`;

  const userPrompt = `${prompt}${contextString}`;

  console.log('[AI] Generating recipe with Claude...');
  console.log('[AI] User prompt:', userPrompt);

  const message = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: userPrompt,
      },
    ],
    system: systemPrompt,
  });

  const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
  console.log('[AI] Raw response:', responseText);

  // Parse the JSON response
  try {
    // Remove markdown code blocks if present
    const cleanedResponse = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const recipe = JSON.parse(cleanedResponse) as GeneratedRecipe;

    console.log('[AI] Successfully generated recipe:', recipe.name);
    return recipe;
  } catch (error) {
    console.error('[AI] Failed to parse recipe JSON:', error);
    console.error('[AI] Response was:', responseText);
    throw new Error('Failed to generate valid recipe format');
  }
}
