export interface Macros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface Ingredient {
  name: string;
  amount: string;
  unit?: string;
  cost_estimate?: number;
}

export interface Recipe {
  id: string;
  user_id: string;
  name: string;
  category?: string;
  ingredients: Ingredient[];
  instructions: string;
  macros?: Macros;
  cost_estimate?: number;
  created_at?: string;
}

export interface PantryItem {
  id: string;
  user_id: string;
  ingredient_name: string;
  quantity?: string;
  location?: 'pantry' | 'fridge' | 'freezer';
  last_updated?: string;
}

export interface MealGenLog {
  id: string;
  user_id: string;
  prompt_hash: string;
  model: string;
  tokens_used?: number;
  cost_estimate?: number;
  created_at?: string;
}
