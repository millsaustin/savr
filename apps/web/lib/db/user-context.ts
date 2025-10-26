import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export type UserContext = {
  pantryItems: string[];
  dietaryRestrictions: string[];
  favoriteCuisines: string[];
  dislikedIngredients: string[];
  dailyCalories?: number;
  dailyProtein?: number;
  dailyCarbs?: number;
  dailyFat?: number;
  cookingSkillLevel?: string;
  availableCookTime?: number;
};

export async function getUserContext(userId: string): Promise<UserContext> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Fetch pantry items
  const { data: pantryData } = await supabase
    .from('user_pantry')
    .select('item_name')
    .eq('user_id', userId);

  const pantryItems = pantryData?.map((item) => item.item_name) || [];

  // Fetch preferences
  const { data: preferencesData } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (!preferencesData) {
    // Return minimal context if no preferences set
    return {
      pantryItems,
      dietaryRestrictions: [],
      favoriteCuisines: [],
      dislikedIngredients: [],
    };
  }

  return {
    pantryItems,
    dietaryRestrictions: Array.isArray(preferencesData.dietary_restrictions)
      ? preferencesData.dietary_restrictions
      : [],
    favoriteCuisines: Array.isArray(preferencesData.favorite_cuisines)
      ? preferencesData.favorite_cuisines
      : [],
    dislikedIngredients: Array.isArray(preferencesData.disliked_ingredients)
      ? preferencesData.disliked_ingredients
      : [],
    dailyCalories: preferencesData.daily_calories || undefined,
    dailyProtein: preferencesData.daily_protein || undefined,
    dailyCarbs: preferencesData.daily_carbs || undefined,
    dailyFat: preferencesData.daily_fat || undefined,
    cookingSkillLevel: preferencesData.cooking_skill_level || 'intermediate',
    availableCookTime: preferencesData.available_cook_time || 30,
  };
}
