import { NextResponse } from 'next/server';
import { withGuards, type GuardedRequest, type NextRouteHandlerContext } from '../../../src/guards/withGuards';

type Recipe = {
  id: string;
  name: string;
  description: string;
  cookTime: string;
  servings: number;
  calories: number;
  protein: number;
  tags: string[];
  cuisine: string;
  category: string;
  ingredients: string[];
  instructions: string[];
};

// Demo recipe templates
const RECIPE_TEMPLATES: Recipe[] = [
  {
    id: '',
    name: 'Lemon Herb Grilled Chicken',
    description: 'Juicy grilled chicken with fresh herbs and lemon zest',
    cookTime: '30 min',
    servings: 4,
    calories: 380,
    protein: 42,
    tags: ['chicken', 'grilled', 'healthy', 'high-protein', 'dinner'],
    cuisine: 'Mediterranean',
    category: 'high-protein',
    ingredients: [
      '4 chicken breasts',
      '3 tbsp olive oil',
      '2 lemons (zest and juice)',
      '4 cloves garlic, minced',
      '2 tbsp fresh rosemary',
      '2 tbsp fresh thyme',
      'Salt and pepper to taste'
    ],
    instructions: [
      'Mix olive oil, lemon zest, lemon juice, garlic, rosemary, and thyme in a bowl',
      'Season chicken breasts with salt and pepper',
      'Coat chicken with the herb mixture and marinate for 15 minutes',
      'Preheat grill to medium-high heat',
      'Grill chicken for 6-7 minutes per side until internal temperature reaches 165°F',
      'Let rest for 5 minutes before serving'
    ]
  },
  {
    id: '',
    name: 'Spicy Thai Basil Tofu',
    description: 'Crispy tofu stir-fried with Thai basil and chilies',
    cookTime: '25 min',
    servings: 3,
    calories: 320,
    protein: 18,
    tags: ['tofu', 'thai', 'vegan', 'spicy', 'dinner'],
    cuisine: 'Thai',
    category: 'vegan',
    ingredients: [
      '14 oz firm tofu, cubed',
      '2 tbsp vegetable oil',
      '4 cloves garlic, minced',
      '2 red chilies, sliced',
      '1 cup Thai basil leaves',
      '2 tbsp soy sauce',
      '1 tbsp dark soy sauce',
      '1 tsp sugar',
      '1 bell pepper, sliced'
    ],
    instructions: [
      'Press tofu to remove excess water, then cube it',
      'Heat oil in a wok over high heat',
      'Fry tofu until golden and crispy, about 5-7 minutes',
      'Add garlic and chilies, stir-fry for 30 seconds',
      'Add bell pepper and cook for 2 minutes',
      'Add soy sauce, dark soy sauce, and sugar',
      'Toss in Thai basil and stir until wilted',
      'Serve immediately with rice'
    ]
  },
  {
    id: '',
    name: 'Quinoa Power Bowl',
    description: 'Nutrient-packed bowl with quinoa, roasted vegetables, and tahini dressing',
    cookTime: '35 min',
    servings: 2,
    calories: 450,
    protein: 16,
    tags: ['quinoa', 'vegetables', 'healthy', 'vegan', 'lunch'],
    cuisine: 'Mediterranean',
    category: 'vegan',
    ingredients: [
      '1 cup quinoa',
      '2 cups vegetable broth',
      '1 sweet potato, cubed',
      '1 cup chickpeas',
      '2 cups kale, chopped',
      '3 tbsp tahini',
      '2 tbsp lemon juice',
      '1 tbsp olive oil',
      'Salt, pepper, cumin to taste'
    ],
    instructions: [
      'Cook quinoa in vegetable broth according to package directions',
      'Preheat oven to 400°F',
      'Toss sweet potato and chickpeas with olive oil, salt, pepper, and cumin',
      'Roast for 25 minutes until crispy',
      'Massage kale with a bit of olive oil',
      'Mix tahini with lemon juice and water to make dressing',
      'Assemble bowls with quinoa, roasted vegetables, and kale',
      'Drizzle with tahini dressing'
    ]
  }
];

function generateMockRecipe(prompt: string): Recipe {
  // Simple logic to pick a recipe based on keywords in prompt
  const lowerPrompt = prompt.toLowerCase();

  let template: Recipe;
  if (lowerPrompt.includes('chicken') || lowerPrompt.includes('meat') || lowerPrompt.includes('protein')) {
    template = RECIPE_TEMPLATES[0];
  } else if (lowerPrompt.includes('vegan') || lowerPrompt.includes('vegetarian') || lowerPrompt.includes('plant')) {
    template = RECIPE_TEMPLATES[lowerPrompt.includes('thai') || lowerPrompt.includes('spicy') ? 1 : 2];
  } else {
    // Random selection
    template = RECIPE_TEMPLATES[Math.floor(Math.random() * RECIPE_TEMPLATES.length)];
  }

  // Generate unique ID
  return {
    ...template,
    id: `recipe-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  };
}

async function assistantHandler(request: GuardedRequest, _context: NextRouteHandlerContext) {
  const sanitizedPrompt = request.savr?.sanitizedPrompt || '';
  const intent = request.savr?.guard?.intent || 'UNKNOWN';

  // Generate a mock recipe
  const mockRecipe = generateMockRecipe(sanitizedPrompt);

  // Save recipe to database (or get existing one)
  try {
    const saveResponse = await fetch(`${request.url.split('/api')[0]}/api/recipes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: mockRecipe.name,
        description: mockRecipe.description,
        cuisine: mockRecipe.cuisine,
        category: mockRecipe.category,
        cook_time: mockRecipe.cookTime,
        servings: mockRecipe.servings,
        calories: mockRecipe.calories,
        protein: mockRecipe.protein,
        tags: mockRecipe.tags,
        ingredients: mockRecipe.ingredients,
        instructions: mockRecipe.instructions,
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
          ...mockRecipe,
          id: savedRecipe.id, // Use database ID
        },
      });
    }
  } catch (error) {
    console.error('[assistant] Error saving recipe:', error);
    // Continue with mock ID if database save fails
  }

  return NextResponse.json({
    result: `Here's a delicious recipe for you!`,
    intent,
    onTopicScore: request.savr?.guard?.onTopicScore,
    recipe: mockRecipe, // Include the structured recipe data
  });
}

export const POST = withGuards(assistantHandler);
