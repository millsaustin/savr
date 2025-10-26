'use client';

import { Drawer } from './drawer';
import { useState } from 'react';

type Recipe = {
  id: string;
  name: string;
  description: string;
  cookTime: string;
  servings: number;
  calories: number;
  protein: number;
  tags: string[];
  collection?: string;
  image_url?: string;
  image_source?: 'stock' | 'generated' | 'placeholder';
  image_provider?: string;
  cuisine?: string;
  category?: string;
};

type FavoritesDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
};

// Mock data - in production, fetch from database
const MOCK_RECIPES: Recipe[] = [
  {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Garlic Chicken with Broccoli',
    description: 'High-protein meal with tender chicken and crispy broccoli',
    cookTime: '25 min',
    servings: 4,
    calories: 450,
    protein: 45,
    tags: ['chicken', 'garlic', 'broccoli', 'dinner', 'high-protein'],
    collection: 'Weeknight Dinners',
    cuisine: 'Mediterranean',
    category: 'high-protein',
  },
  {
    id: '223e4567-e89b-12d3-a456-426614174001',
    name: 'Meal Prep Rice Bowls',
    description: 'Perfect for batch cooking - chicken, rice, and roasted vegetables',
    cookTime: '45 min',
    servings: 6,
    calories: 520,
    protein: 40,
    tags: ['chicken', 'rice', 'vegetables', 'meal-prep', 'batch-cook'],
    collection: 'Meal Prep',
    cuisine: 'Asian',
    category: 'meal-prep',
  },
  {
    id: '323e4567-e89b-12d3-a456-426614174002',
    name: 'Greek Yogurt Parfait',
    description: 'Protein-packed breakfast with berries and granola',
    cookTime: '5 min',
    servings: 1,
    calories: 320,
    protein: 25,
    tags: ['breakfast', 'yogurt', 'berries', 'quick', 'high-protein'],
    collection: 'Breakfast Favorites',
    category: 'breakfast',
  },
  {
    id: '423e4567-e89b-12d3-a456-426614174003',
    name: 'Baked Salmon with Asparagus',
    description: 'Omega-3 rich dinner with perfectly roasted asparagus',
    cookTime: '30 min',
    servings: 2,
    calories: 380,
    protein: 42,
    tags: ['salmon', 'asparagus', 'healthy', 'low-carb', 'omega-3'],
    collection: 'Date Night',
    cuisine: 'Mediterranean',
    category: 'healthy',
  },
  {
    id: '523e4567-e89b-12d3-a456-426614174004',
    name: 'Veggie Stir-Fry',
    description: 'Colorful mix of vegetables in a savory sauce',
    cookTime: '15 min',
    servings: 3,
    calories: 280,
    protein: 12,
    tags: ['vegetarian', 'stir-fry', 'vegetables', 'quick', 'low-cal'],
    collection: 'Weeknight Dinners',
    cuisine: 'Asian',
    category: 'vegetarian',
  },
  {
    id: '623e4567-e89b-12d3-a456-426614174005',
    name: 'Turkey Chili',
    description: 'Hearty and warming with lean ground turkey and beans',
    cookTime: '40 min',
    servings: 8,
    calories: 340,
    protein: 32,
    tags: ['turkey', 'chili', 'high-protein', 'comfort-food', 'batch-cook'],
    collection: 'Meal Prep',
    cuisine: 'American',
    category: 'comfort-food',
  },
  {
    id: '723e4567-e89b-12d3-a456-426614174006',
    name: 'Thai Green Curry',
    description: 'Creamy coconut curry with vegetables and Thai basil',
    cookTime: '35 min',
    servings: 4,
    calories: 380,
    protein: 18,
    tags: ['curry', 'thai', 'coconut', 'vegetables', 'dinner'],
    collection: 'Weeknight Dinners',
    cuisine: 'Thai',
    category: 'vegetarian',
  },
  {
    id: '823e4567-e89b-12d3-a456-426614174007',
    name: 'Spaghetti Carbonara',
    description: 'Classic Italian pasta with eggs, cheese, and pancetta',
    cookTime: '20 min',
    servings: 2,
    calories: 620,
    protein: 28,
    tags: ['pasta', 'italian', 'eggs', 'cheese', 'dinner'],
    collection: 'Date Night',
    cuisine: 'Italian',
    category: 'comfort-food',
  },
  {
    id: '923e4567-e89b-12d3-a456-426614174008',
    name: 'Breakfast Burrito',
    description: 'Scrambled eggs, cheese, and salsa wrapped in a tortilla',
    cookTime: '15 min',
    servings: 1,
    calories: 480,
    protein: 24,
    tags: ['breakfast', 'eggs', 'cheese', 'mexican', 'quick'],
    collection: 'Breakfast Favorites',
    cuisine: 'Mexican',
    category: 'breakfast',
  },
  {
    id: 'a23e4567-e89b-12d3-a456-426614174009',
    name: 'Grilled Steak Fajitas',
    description: 'Sizzling beef strips with peppers and onions',
    cookTime: '25 min',
    servings: 4,
    calories: 520,
    protein: 42,
    tags: ['beef', 'steak', 'peppers', 'mexican', 'dinner'],
    collection: 'Weeknight Dinners',
    cuisine: 'Mexican',
    category: 'high-protein',
  },
  {
    id: 'b23e4567-e89b-12d3-a456-426614174010',
    name: 'Buddha Bowl',
    description: 'Quinoa bowl with roasted vegetables and tahini dressing',
    cookTime: '30 min',
    servings: 2,
    calories: 420,
    protein: 16,
    tags: ['quinoa', 'vegetables', 'healthy', 'vegan', 'lunch'],
    collection: 'Weeknight Dinners',
    cuisine: 'Mediterranean',
    category: 'vegan',
  },
  {
    id: 'c23e4567-e89b-12d3-a456-426614174011',
    name: 'Teriyaki Salmon Bowl',
    description: 'Glazed salmon over rice with edamame and cucumber',
    cookTime: '25 min',
    servings: 2,
    calories: 560,
    protein: 38,
    tags: ['salmon', 'rice', 'fish', 'japanese', 'dinner'],
    collection: 'Date Night',
    cuisine: 'Japanese',
    category: 'high-protein',
  },
  {
    id: 'd23e4567-e89b-12d3-a456-426614174012',
    name: 'Chicken Tikka Masala',
    description: 'Tender chicken in creamy tomato curry sauce',
    cookTime: '40 min',
    servings: 6,
    calories: 490,
    protein: 36,
    tags: ['chicken', 'curry', 'indian', 'dinner', 'spicy'],
    collection: 'Meal Prep',
    cuisine: 'Indian',
    category: 'comfort-food',
  },
  {
    id: 'e23e4567-e89b-12d3-a456-426614174013',
    name: 'Avocado Toast',
    description: 'Smashed avocado on sourdough with everything bagel seasoning',
    cookTime: '10 min',
    servings: 1,
    calories: 320,
    protein: 12,
    tags: ['avocado', 'toast', 'breakfast', 'quick', 'healthy'],
    collection: 'Breakfast Favorites',
    cuisine: 'American',
    category: 'breakfast',
  },
  {
    id: 'f23e4567-e89b-12d3-a456-426614174014',
    name: 'Pad Thai',
    description: 'Stir-fried rice noodles with shrimp, peanuts, and lime',
    cookTime: '30 min',
    servings: 3,
    calories: 540,
    protein: 26,
    tags: ['noodles', 'shrimp', 'thai', 'peanuts', 'dinner'],
    collection: 'Weeknight Dinners',
    cuisine: 'Thai',
    category: 'high-protein',
  },
  {
    id: '023e4567-e89b-12d3-a456-426614174015',
    name: 'Caprese Salad',
    description: 'Fresh mozzarella, tomatoes, and basil with balsamic glaze',
    cookTime: '10 min',
    servings: 2,
    calories: 280,
    protein: 14,
    tags: ['salad', 'mozzarella', 'tomatoes', 'italian', 'lunch'],
    collection: 'Date Night',
    cuisine: 'Italian',
    category: 'vegetarian',
  },
];

const COLLECTIONS = ['All', 'Weeknight Dinners', 'Meal Prep', 'Breakfast Favorites', 'Date Night'];

export function FavoritesDrawer({ isOpen, onClose }: FavoritesDrawerProps) {
  const [recipes, setRecipes] = useState<Recipe[]>(MOCK_RECIPES);
  const [selectedCollection, setSelectedCollection] = useState('All');
  const [loadingImages, setLoadingImages] = useState<Record<string, boolean>>({});
  const [imageErrors, setImageErrors] = useState<Record<string, string>>({});

  const filteredRecipes = selectedCollection === 'All'
    ? recipes
    : recipes.filter(recipe => recipe.collection === selectedCollection);

  // TEMPORARILY DISABLED - Working on recipe database architecture first
  const fetchRecipeImage = async (recipe: Recipe, forceRegenerate: boolean = false) => {
    console.log('Image generation temporarily disabled - focusing on recipe database');
    return;

    /* COMMENTED OUT UNTIL RECIPE SYSTEM IS COMPLETE
    setLoadingImages(prev => ({ ...prev, [recipe.id]: true }));
    setImageErrors(prev => ({ ...prev, [recipe.id]: '' }));

    try {
      const response = await fetch('/api/fetch-recipe-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipeId: recipe.id,
          name: recipe.name,
          tags: recipe.tags,
          category: recipe.category,
          cuisine: recipe.cuisine,
          forceRegenerate: forceRegenerate,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch image');
      }

      const data = await response.json();

      console.log('Image fetch response:', data);

      if (!data || !data.image_url) {
        throw new Error('Invalid response from server: missing image data');
      }

      // Update the recipe with the new image data
      setRecipes(prev => prev.map(r =>
        r.id === recipe.id
          ? {
              ...r,
              image_url: data.image_url,
              image_source: data.source,
              image_provider: data.provider
            }
          : r
      ));
    } catch (error) {
      console.error('Error fetching recipe image:', error);
      setImageErrors(prev => ({
        ...prev,
        [recipe.id]: error instanceof Error ? error.message : 'Failed to fetch image'
      }));
    } finally {
      setLoadingImages(prev => ({ ...prev, [recipe.id]: false }));
    }
    */
  };

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Favorite Recipes">
      <div className="p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Total Recipes</p>
            <p className="text-3xl font-semibold text-teal-900">{recipes.length}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Collections</p>
            <p className="text-3xl font-semibold text-teal-900">{COLLECTIONS.length - 1}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Avg Cook Time</p>
            <p className="text-3xl font-semibold text-teal-900">
              {Math.round(recipes.reduce((acc, r) => acc + parseInt(r.cookTime), 0) / recipes.length)} min
            </p>
          </div>
        </div>

        {/* Collection Filter */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">Collections</p>
          <div className="flex flex-wrap gap-2">
            {COLLECTIONS.map(collection => (
              <button
                key={collection}
                onClick={() => setSelectedCollection(collection)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  selectedCollection === collection
                    ? 'bg-brand-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {collection}
              </button>
            ))}
          </div>
        </div>

        {/* Recipe Grid */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-teal-900">
              {selectedCollection === 'All' ? 'All Recipes' : selectedCollection} ({filteredRecipes.length})
            </h3>
            <button className="px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition">
              + Add Recipe
            </button>
          </div>

          {filteredRecipes.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
              No recipes in this collection
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRecipes.map(recipe => (
                <div
                  key={recipe.id}
                  className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg hover:border-brand-primary/30 transition-all"
                >
                  {/* Recipe Image */}
                  <div className="relative h-48 bg-gray-100 group">
                    {recipe.image_url ? (
                      <>
                        <img
                          src={recipe.image_url}
                          alt={recipe.name}
                          className="w-full h-full object-cover"
                        />
                        {recipe.image_source && (
                          <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/70 text-white text-xs rounded">
                            {recipe.image_source === 'stock' && recipe.image_provider
                              ? `Stock: ${recipe.image_provider}`
                              : recipe.image_source === 'generated'
                              ? 'AI Generated'
                              : 'Placeholder'}
                          </div>
                        )}
                        {/* Regenerate button - shows on hover */}
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => fetchRecipeImage(recipe, true)}
                            disabled={loadingImages[recipe.id]}
                            className="px-2 py-1 bg-brand-primary text-white text-xs font-medium rounded hover:opacity-90 transition disabled:opacity-50"
                            title="Regenerate with better AI"
                          >
                            🔄 Regenerate
                          </button>
                        </div>
                      </>
                    ) : loadingImages[recipe.id] ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary"></div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <svg className="h-16 w-16 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <button
                          onClick={() => fetchRecipeImage(recipe, false)}
                          className="px-3 py-1.5 bg-brand-primary text-white text-xs font-medium rounded hover:opacity-90 transition"
                        >
                          Fetch Image
                        </button>
                      </div>
                    )}
                    {imageErrors[recipe.id] && (
                      <div className="absolute inset-0 flex items-center justify-center bg-red-50">
                        <div className="text-center px-4">
                          <p className="text-red-600 text-xs mb-2">{imageErrors[recipe.id]}</p>
                          <button
                            onClick={() => fetchRecipeImage(recipe)}
                            className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded hover:opacity-90 transition"
                          >
                            Retry
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Recipe Content */}
                  <div className="p-5">
                    {/* Recipe Header */}
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="font-semibold text-gray-900 text-lg flex-1">{recipe.name}</h4>
                      <button className="p-1 text-red-500 hover:bg-red-50 rounded transition">
                        <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                        </svg>
                      </button>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">{recipe.description}</p>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1 mb-4">
                      {recipe.tags.slice(0, 3).map(tag => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-brand-secondary/20 text-brand-primary text-xs font-medium rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-2 text-sm border-t border-gray-200 pt-3">
                      <div>
                        <p className="text-gray-500 text-xs">Cook Time</p>
                        <p className="font-semibold text-gray-900">{recipe.cookTime}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Servings</p>
                        <p className="font-semibold text-gray-900">{recipe.servings}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Calories</p>
                        <p className="font-semibold text-gray-900">{recipe.calories}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Protein</p>
                        <p className="font-semibold text-gray-900">{recipe.protein}g</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
}
