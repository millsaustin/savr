'use client';

import { useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import Button from './ui/button';
import { Logo } from './logo';

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

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  recipe?: Recipe;
};

type ResponseStatus =
  | { state: 'idle' }
  | { state: 'loading' }
  | { state: 'error'; message: string };

export function HomeChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [status, setStatus] = useState<ResponseStatus>({ state: 'idle' });
  const [favoritingRecipe, setFavoritingRecipe] = useState<string | null>(null);
  const [favoritedRecipes, setFavoritedRecipes] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFavoriteRecipe = useCallback(async (recipe: Recipe) => {
    setFavoritingRecipe(recipe.id);

    try {
      const response = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipe_id: recipe.id }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to favorite recipe');
      }

      setFavoritedRecipes(prev => new Set([...prev, recipe.id]));
    } catch (error) {
      console.error('Error favoriting recipe:', error);
      alert(error instanceof Error ? error.message : 'Failed to save recipe to favorites');
    } finally {
      setFavoritingRecipe(null);
    }
  }, []);

  const quickActions = [
    { label: 'Suggest a meal', prompt: 'Can you suggest a healthy dinner idea for tonight?' },
    { label: 'Create grocery list', prompt: 'Help me create a grocery list for this week\'s meals' },
    { label: 'Meal prep tips', prompt: 'Give me some meal prep tips for the week' },
    { label: 'Quick breakfast ideas', prompt: 'What are some quick and healthy breakfast options?' },
  ];

  const handleQuickAction = useCallback((prompt: string) => {
    handleSend(prompt);
  }, []);

  const handleSend = useCallback(async (text: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setStatus({ state: 'loading' });

    try {
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Check if authentication is required
        if (response.status === 401 && data.error?.requiresAuth) {
          setStatus({
            state: 'error',
            message: 'Please sign in to use AI recipe generation. Sign up for free to get started!',
          });

          // Show login prompt after a short delay
          setTimeout(() => {
            if (confirm('Sign in required. Would you like to create a free account now?')) {
              window.location.href = '/signup';
            }
          }, 1000);
          return;
        }

        setStatus({
          state: 'error',
          message: data.error?.message || data.message || 'Unable to process your request',
        });
        return;
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.result || 'I received your message!',
        recipe: data.recipe, // Include recipe data if present
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setStatus({ state: 'idle' });
    } catch (error) {
      setStatus({
        state: 'error',
        message: error instanceof Error ? error.message : 'Network error occurred',
      });
    }
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (inputValue.trim() && status.state !== 'loading') {
        handleSend(inputValue);
      }
    },
    [inputValue, status, handleSend]
  );

  const isLoading = status.state === 'loading';

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-gray-200 overflow-hidden" style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(0, 0, 0, 0.05)' }}>
      {/* Auth required banner */}
      <div className="bg-yellow-50 border-b border-yellow-200 p-3 text-center">
        <p className="text-sm text-yellow-900">
          <svg className="inline h-4 w-4 mr-1 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <strong>Free account required</strong> to generate AI recipes.{' '}
          <Link href="/signup" className="font-semibold underline hover:text-brand-primary">
            Sign up in 30 seconds
          </Link>
          {' '}or{' '}
          <Link href="/login" className="font-semibold underline hover:text-brand-primary">
            Sign in
          </Link>
        </p>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4 max-w-3xl mx-auto">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <p className="text-3xl text-gray-600 mb-4">Welcome to</p>
              <div className="flex justify-center items-center mb-4">
                <Logo size="xl" />
              </div>
              <p className="text-gray-600 mb-6">
                I'm your AI meal prep assistant. Ask me anything about recipes, meal planning, or cooking tips!
              </p>

              <div className="mb-6">
                <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
                  <div className="flex gap-2">
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder="Ask me about recipes, meal planning, or cooking tips..."
                      disabled={isLoading}
                      className="flex-1 border-2 border-brand-primary/30 focus:border-brand-primary rounded-lg shadow-lg h-12 text-base px-4 focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                    />
                    <button
                      type="submit"
                      disabled={isLoading || !inputValue.trim()}
                      className="h-12 px-6 shadow-lg bg-gradient-to-r from-brand-primary to-brand-dark text-white rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      {isLoading ? (
                        <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
                {quickActions.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => handleQuickAction(action.prompt)}
                    className="h-auto py-3 px-4 text-left border border-gray-200 rounded-lg hover:border-brand-primary hover:bg-brand-secondary/10 transition text-sm font-medium text-gray-700 hover:text-brand-primary"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {status.state === 'error' && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">Error: {status.message}</p>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && (
                <div className="h-8 w-8 rounded-full bg-brand-primary flex items-center justify-center flex-shrink-0">
                  <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
              )}

              <div
                className={`p-4 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-brand-primary text-white max-w-[80%]'
                    : 'bg-gray-100 text-gray-800 border border-gray-200 max-w-2xl'
                }`}
              >
                <div className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</div>

                {/* Recipe Card */}
                {message.recipe && (
                  <div className="mt-4 bg-white border border-gray-300 rounded-lg overflow-hidden shadow-sm">
                    {/* Recipe Header */}
                    <div className="p-4 bg-brand-primary/5 border-b border-gray-200">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-teal-900">{message.recipe.name}</h3>
                          <p className="text-sm text-gray-600 mt-1">{message.recipe.description}</p>
                        </div>
                        <button
                          onClick={() => handleFavoriteRecipe(message.recipe!)}
                          disabled={favoritingRecipe === message.recipe.id || favoritedRecipes.has(message.recipe.id)}
                          className={`ml-3 p-2 rounded-lg transition ${
                            favoritedRecipes.has(message.recipe.id)
                              ? 'bg-red-50 text-red-500'
                              : 'bg-white text-gray-400 hover:text-red-500 hover:bg-red-50'
                          } ${favoritingRecipe === message.recipe.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <svg className="h-6 w-6 fill-current" viewBox="0 0 24 24">
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                          </svg>
                        </button>
                      </div>

                      {/* Recipe Metadata */}
                      <div className="flex gap-4 mt-3 text-sm">
                        <div className="flex items-center gap-1">
                          <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-gray-700">{message.recipe.cookTime}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          <span className="text-gray-700">{message.recipe.servings} servings</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-gray-700">{message.recipe.calories} cal</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-gray-700">{message.recipe.protein}g protein</span>
                        </div>
                      </div>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-2 mt-3">
                        {message.recipe.tags.slice(0, 5).map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-brand-secondary/20 text-brand-primary text-xs font-medium rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Ingredients & Instructions */}
                    <div className="p-4 grid md:grid-cols-2 gap-4">
                      {/* Ingredients */}
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">Ingredients</h4>
                        <ul className="space-y-1.5 text-sm text-gray-700">
                          {message.recipe.ingredients.map((ingredient, idx) => (
                            <li key={idx} className="flex items-start">
                              <span className="text-brand-primary mr-2">•</span>
                              {ingredient}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Instructions */}
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">Instructions</h4>
                        <ol className="space-y-2 text-sm text-gray-700">
                          {message.recipe.instructions.map((instruction, idx) => (
                            <li key={idx} className="flex items-start">
                              <span className="text-brand-primary font-semibold mr-2">{idx + 1}.</span>
                              <span>{instruction}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    </div>

                    {/* Favorite Status */}
                    {favoritedRecipes.has(message.recipe.id) && (
                      <div className="px-4 py-2 bg-green-50 border-t border-green-200 text-center">
                        <p className="text-sm text-green-700 font-medium">✓ Saved to Favorites!</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {message.role === 'user' && (
                <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
                  <svg className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="h-8 w-8 rounded-full bg-brand-primary flex items-center justify-center flex-shrink-0">
                <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div className="p-4 rounded-lg bg-gray-100 border border-gray-200">
                <svg className="h-4 w-4 animate-spin text-gray-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input area when messages exist */}
      {messages.length > 0 && (
        <div className="border-t border-gray-200 p-4 bg-gradient-to-r from-brand-primary/5 via-brand-primary/10 to-brand-primary/5">
          <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask me about recipes, meal planning, or cooking tips..."
                disabled={isLoading}
                className="flex-1 border-2 border-brand-primary/30 focus:border-brand-primary rounded-lg shadow-md h-12 text-base px-4 focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
              />
              <button
                type="submit"
                disabled={isLoading || !inputValue.trim()}
                className="h-12 px-6 shadow-md bg-gradient-to-r from-brand-primary to-brand-dark text-white rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {isLoading ? (
                  <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
