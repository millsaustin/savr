export default function AboutPage() {
  return (
    <div className="flex flex-col bg-gray-50">
      {/* Hero Section */}
      <section className="pt-12 pb-12 sm:pt-20 sm:pb-16 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="text-4xl sm:text-5xl font-bold text-teal-900 mb-6">
              About Savr
            </h1>
            <p className="text-lg sm:text-xl text-gray-700 max-w-3xl mx-auto leading-relaxed">
              We're on a mission to make meal planning effortless, affordable, and personalized for everyone.
              Savr combines AI technology with practical tools to help you eat better, save money, and reduce food waste.
            </p>
          </div>
        </div>
      </section>

      {/* Our Story Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-3xl sm:text-4xl font-bold text-teal-900 mb-6">
              Our Story
            </h2>
            <div className="space-y-4 text-gray-700 leading-relaxed text-lg">
              <p>
                Savr was born from a simple observation: meal planning is hard. Between busy schedules,
                dietary restrictions, budget constraints, and the endless question of "what's for dinner?",
                many people struggle to maintain healthy eating habits.
              </p>
              <p>
                We built Savr to solve this problem using AI technology. Our platform understands your
                unique needs—whether you're tracking macros for fitness goals, managing food allergies,
                staying within a budget, or simply trying to waste less food—and creates personalized meal
                plans that actually work for your life.
              </p>
              <p>
                Today, Savr helps thousands of people plan meals, manage their pantry, and make smarter
                grocery decisions. We're constantly improving our AI to make meal planning even easier
                and more personalized.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-3xl sm:text-4xl font-bold text-teal-900 mb-12 text-center">
              Our Values
            </h2>
            <div className="grid gap-8 md:grid-cols-3">
              <div className="text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-secondary mx-auto">
                  <svg className="h-8 w-8 text-brand-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="mb-3 text-xl font-semibold text-teal-900">Simplicity</h3>
                <p className="text-gray-700">
                  We believe meal planning should be simple and stress-free. Our AI handles the complexity
                  so you can focus on cooking and enjoying great food.
                </p>
              </div>

              <div className="text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-secondary mx-auto">
                  <svg className="h-8 w-8 text-brand-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h3 className="mb-3 text-xl font-semibold text-teal-900">Personalization</h3>
                <p className="text-gray-700">
                  Everyone's needs are different. Savr adapts to your dietary preferences, nutritional goals,
                  and lifestyle to create meal plans that work for you.
                </p>
              </div>

              <div className="text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-secondary mx-auto">
                  <svg className="h-8 w-8 text-brand-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="mb-3 text-xl font-semibold text-teal-900">Sustainability</h3>
                <p className="text-gray-700">
                  We help reduce food waste by suggesting recipes based on what you already have and
                  tracking ingredient expiration dates.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-teal-900 mb-6">
              Built by a passionate team
            </h2>
            <p className="text-lg text-gray-700 leading-relaxed mb-8">
              Our team combines expertise in AI, nutrition, and software engineering to create
              the best meal planning experience. We're food lovers, home cooks, and tech enthusiasts
              who believe everyone deserves access to personalized, healthy meal planning.
            </p>
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-primary/20 px-6 py-3 text-sm font-medium text-brand-primary border border-brand-primary/20">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span>Join our growing community of home cooks</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
