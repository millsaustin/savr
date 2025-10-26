import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { withGuards, type GuardedRequest, type NextRouteHandlerContext } from '../../../../src/guards/withGuards';

// Mock user data - in production, fetch from database
function getUserContext(email: string) {
  // This would fetch from your database
  return {
    email,
    pantryItems: [
      'chicken breast',
      'brown rice',
      'broccoli',
      'eggs',
      'olive oil',
      'garlic',
      'onions'
    ],
    dietaryPreferences: ['high protein', 'low carb'],
    goals: {
      calories: 2000,
      protein: 150,
      carbs: 150,
      fat: 65
    },
    restrictions: [] as string[],
  };
}

async function personalizedAssistantHandler(request: GuardedRequest, _context: NextRouteHandlerContext) {
  // Check authentication
  const session = cookies().get('session');

  if (!session) {
    return NextResponse.json(
      { error: { message: 'Authentication required for personalized responses' } },
      { status: 401 }
    );
  }

  // Decode session to get user info
  let userEmail = '';
  try {
    const sessionData = JSON.parse(
      Buffer.from(session.value, 'base64').toString()
    );
    userEmail = sessionData.email;
  } catch (error) {
    return NextResponse.json(
      { error: { message: 'Invalid session' } },
      { status: 401 }
    );
  }

  // Get user context
  const userContext = getUserContext(userEmail);

  const sanitizedPrompt = request.savr?.sanitizedPrompt || '';
  const intent = request.savr?.guard?.intent || 'UNKNOWN';

  // Build personalized context for the AI
  const contextPrompt = `
User Profile:
- Email: ${userContext.email}
- Pantry Items: ${userContext.pantryItems.join(', ')}
- Dietary Preferences: ${userContext.dietaryPreferences.join(', ')}
- Daily Goals: ${userContext.goals.calories} calories, ${userContext.goals.protein}g protein, ${userContext.goals.carbs}g carbs, ${userContext.goals.fat}g fat
${userContext.restrictions.length > 0 ? `- Restrictions: ${userContext.restrictions.join(', ')}` : ''}

User Request: ${sanitizedPrompt}
`;

  // For now, return a demo response showing personalization
  // In production, this would call OpenAI with the contextPrompt
  return NextResponse.json({
    result: `[PERSONALIZED DEMO] Based on your pantry (${userContext.pantryItems.slice(0, 3).join(', ')}, and more) and your goal of ${userContext.goals.calories} calories with ${userContext.goals.protein}g protein per day:\n\n${generateMockPersonalizedResponse(sanitizedPrompt, userContext, intent)}`,
    intent,
    onTopicScore: request.savr?.guard?.onTopicScore,
    personalized: true,
    userContext: {
      pantryItemCount: userContext.pantryItems.length,
      hasGoals: true,
    }
  });
}

function generateMockPersonalizedResponse(prompt: string, context: any, intent: string): string {
  const lowerPrompt = prompt.toLowerCase();

  if (lowerPrompt.includes('pantry') || lowerPrompt.includes('have')) {
    return `Great! I can see you have ${context.pantryItems.slice(0, 3).join(', ')}, and more in your pantry. Here's a personalized meal idea:\n\n**Garlic Chicken with Broccoli & Brown Rice**\n- Uses your chicken breast, broccoli, brown rice, garlic, and olive oil\n- Fits your high protein, low carb preference\n- Approximately 550 calories, 45g protein, 50g carbs, 15g fat\n\nWould you like the full recipe?`;
  }

  if (lowerPrompt.includes('week') || lowerPrompt.includes('plan')) {
    return `Based on your ${context.goals.calories} calorie goal and preference for high protein meals, I'd suggest:\n\n**Monday-Friday Meal Plan**\nUsing ingredients from your pantry:\n- Breakfast: Scrambled eggs with sautéed vegetables\n- Lunch: Grilled chicken with brown rice and broccoli\n- Dinner: Baked chicken breast with roasted vegetables\n\nThis plan maximizes your existing pantry items and hits your macro targets!`;
  }

  if (lowerPrompt.includes('grocery') || lowerPrompt.includes('shopping')) {
    return `Looking at your current pantry items and your ${context.goals.protein}g daily protein goal, here's what I recommend adding:\n\n**Suggested Additions:**\n- Greek yogurt (for protein snacks)\n- Sweet potatoes (complex carbs)\n- Spinach (micronutrients)\n- Salmon or tuna (omega-3s and protein variety)\n\nThis will give you more meal variety while staying aligned with your goals!`;
  }

  if (lowerPrompt.includes('prep') || lowerPrompt.includes('meal prep')) {
    return `Perfect for your high protein goals! Here's a meal prep strategy using your pantry:\n\n**Sunday Prep:**\n1. Cook 3 lbs chicken breast (portion for 6 meals)\n2. Prep 6 cups brown rice\n3. Steam 4 cups broccoli\n\nThis gives you easy-to-reheat meals hitting ${context.goals.protein}g protein daily. Each meal: ~450 cal, 40g protein, 45g carbs, 10g fat.`;
  }

  return `I'd be happy to help with that! Based on your preferences for ${context.dietaryPreferences.join(' and ')} meals, and your pantry items, I can create personalized suggestions.\n\nYour current pantry includes: ${context.pantryItems.slice(0, 5).join(', ')}, and more.\n\nIn production, I would use AI to generate a detailed, personalized response here!`;
}

export const POST = withGuards(personalizedAssistantHandler);
