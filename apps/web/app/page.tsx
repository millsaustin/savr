'use client';

import { HomeChatInterface } from "../components/home-chat-interface";
import { useEffect, useState } from "react";

export default function HomePage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="flex flex-col bg-gray-50">
      <section className="pt-12 pb-12 sm:pt-20 sm:pb-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl text-center mb-8">
            <h1 className={`text-4xl sm:text-5xl font-bold text-teal-900 mb-4 transition-all duration-700 ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
            }`}>
              Your AI Meal Prep Assistant
            </h1>
            <p className={`text-lg sm:text-xl text-gray-700 max-w-3xl mx-auto transition-all duration-700 delay-100 ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
            }`}>
              Get personalized recipe suggestions, meal plans, and cooking tips powered by AI.
            </p>
          </div>

          <div className={`mx-auto max-w-4xl mb-8 transition-all duration-700 delay-200 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}>
            {/* Chat container with floating shadow effect */}
            <div className="h-[600px]">
              <HomeChatInterface />
            </div>
          </div>

          <div className={`text-center mb-8 transition-all duration-700 delay-300 ${
            mounted ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          }`}>
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-primary/20 px-4 py-2 text-sm font-medium text-brand-primary border border-brand-primary/20">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
              <span>Try it free • No credit card required</span>
            </div>
          </div>
        </div>
      </section>

      {/* How Savr Works Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className={`text-center mb-12 transition-all duration-700 delay-400 ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}>
              <h2 className="text-3xl sm:text-4xl font-bold text-teal-900 mb-4">
                How Savr Works
              </h2>
              <p className="text-lg text-gray-700 max-w-2xl mx-auto">
                Personalized AI meal planning for weight loss, muscle gain and better health. AI recipe generator builds menus with tailored calories, macros and portions without manual calorie counting.
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
              <div className={`text-center transition-all duration-700 delay-500 ${
                mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}>
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-secondary text-2xl font-bold text-brand-primary mx-auto transition-transform duration-300 hover:scale-110">
                  1
                </div>
                <h3 className="mb-3 text-xl font-semibold text-teal-900">Chat with AI</h3>
                <p className="text-gray-700">
                  Tell Savr your preferences, dietary needs, and goals. Our AI understands what you want and creates personalized meal plans instantly.
                </p>
              </div>

              <div className={`text-center transition-all duration-700 delay-600 ${
                mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}>
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-secondary text-2xl font-bold text-brand-primary mx-auto transition-transform duration-300 hover:scale-110">
                  2
                </div>
                <h3 className="mb-3 text-xl font-semibold text-teal-900">Get Your Plan</h3>
                <p className="text-gray-700">
                  Receive a complete meal plan with recipes, portions, and daily macros. Built for busy routines with simple ingredients and quick prep times.
                </p>
              </div>

              <div className={`text-center transition-all duration-700 delay-700 ${
                mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}>
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-secondary text-2xl font-bold text-brand-primary mx-auto transition-transform duration-300 hover:scale-110">
                  3
                </div>
                <h3 className="mb-3 text-xl font-semibold text-teal-900">Shop & Cook</h3>
                <p className="text-gray-700">
                  Get a smart grocery list organized by store sections. Follow easy recipes and track your pantry to reduce waste and save money.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className={`text-center mb-12 transition-all duration-700 delay-[800ms] ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}>
              <h2 className="text-3xl sm:text-4xl font-bold text-teal-900 mb-4">
                Everything you need to master meal prep
              </h2>
              <p className="text-lg text-gray-700">
                Savr combines AI-powered assistance with smart tools to make meal planning effortless
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
              {/* AI Chat Assistant */}
              <div className={`group rounded-xl border border-gray-200 bg-white p-8 shadow-sm hover:shadow-lg hover:border-brand-primary/30 hover:-translate-y-1 transition-all duration-700 delay-[900ms] ease-out ${
                mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}>
                <div className="flex items-start gap-4 mb-4">
                  <div className="flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                    <svg className="h-10 w-10 text-brand-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-semibold text-teal-900">AI Chat Assistant</h3>
                </div>
                <p className="text-gray-700 leading-relaxed">
                  Chat naturally with our AI to get instant meal suggestions, recipe ideas, and cooking tips. Ask questions, request modifications, and get personalized recommendations based on your preferences and dietary needs.
                </p>
              </div>

              {/* Smart Pantry Management */}
              <div className={`group rounded-xl border border-gray-200 bg-white p-8 shadow-sm hover:shadow-lg hover:border-brand-primary/30 hover:-translate-y-1 transition-all duration-700 delay-[1000ms] ease-out ${
                mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}>
                <div className="flex items-start gap-4 mb-4">
                  <div className="flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                    <svg className="h-10 w-10 text-brand-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-semibold text-teal-900">Smart Pantry Management</h3>
                </div>
                <p className="text-gray-700 leading-relaxed">
                  Keep track of what is in your pantry and fridge. Savr suggests recipes based on ingredients you already have, helps reduce food waste, and reminds you when items are running low or expiring soon.
                </p>
              </div>

              {/* Intelligent Grocery Lists */}
              <div className={`group rounded-xl border border-gray-200 bg-white p-8 shadow-sm hover:shadow-lg hover:border-brand-primary/30 hover:-translate-y-1 transition-all duration-700 delay-[1100ms] ease-out ${
                mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}>
                <div className="flex items-start gap-4 mb-4">
                  <div className="flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                    <svg className="h-10 w-10 text-brand-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-semibold text-teal-900">Intelligent Grocery Lists</h3>
                </div>
                <p className="text-gray-700 leading-relaxed">
                  Generate organized shopping lists automatically from your meal plans. Items are sorted by store sections for efficient shopping, with estimated costs and smart suggestions for ingredient substitutions.
                </p>
              </div>

              {/* Personalized Experience */}
              <div className={`group rounded-xl border border-gray-200 bg-white p-8 shadow-sm hover:shadow-lg hover:border-brand-primary/30 hover:-translate-y-1 transition-all duration-700 delay-[1200ms] ease-out ${
                mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}>
                <div className="flex items-start gap-4 mb-4">
                  <div className="flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                    <svg className="h-10 w-10 text-brand-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-semibold text-teal-900">Personalized Experience</h3>
                </div>
                <p className="text-gray-700 leading-relaxed">
                  Savr learns your tastes, dietary restrictions, and nutritional goals. Get meal plans tailored to your lifestyle whether you are focusing on weight loss, muscle gain, or just eating healthier with balanced macros.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
