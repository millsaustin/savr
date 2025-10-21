import Link from 'next/link';

export default function HomePage() {
  return (
    <>
      <div className="space-y-20">
        {/* Hero Section */}
        <section className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div className="space-y-6">
            <h1 className="text-5xl font-bold leading-tight tracking-tight text-teal-900 lg:text-6xl">
              Smarter meals
              <br />
              <span className="text-brand-primary">Better results</span>
            </h1>
            <p className="text-lg leading-relaxed text-gray-700">
              Savr creates personalized weekly plans with easy recipes, clear portions, and a short grocery list.
            </p>
            <Link
              href="/dashboard"
              className="inline-block rounded-lg bg-brand-primary px-8 py-3 text-base font-semibold text-white transition hover:bg-brand-dark"
            >
              Create your plan
            </Link>
            <div className="flex items-center gap-3 pt-2">
              <span className="text-sm text-gray-600">⭐ Trusted by 24,000+ people</span>
            </div>
          </div>
          <div className="relative flex justify-center lg:justify-end">
            <div className="text-center text-gray-500">
              [Hero image placeholder]
            </div>
          </div>
        </section>
      </div>

      {/* Stats Bar - Full Width */}
      <section className="w-screen relative left-1/2 right-1/2 -mx-[50vw] bg-brand-primary py-12">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-2 gap-8 text-center text-white md:grid-cols-4">
            <div>
              <div className="text-3xl font-bold">24k+</div>
              <div className="text-sm opacity-90">USERS</div>
            </div>
            <div>
              <div className="text-3xl font-bold">4.8</div>
              <div className="text-sm opacity-90">AVG RATING</div>
            </div>
            <div>
              <div className="text-3xl font-bold">500k+</div>
              <div className="text-sm opacity-90">MEALS PLANNED</div>
            </div>
            <div>
              <div className="text-3xl font-bold">92%</div>
              <div className="text-sm opacity-90">STICK WITH PLAN</div>
            </div>
          </div>
        </div>
      </section>

      <div className="space-y-20">

      {/* How it Works */}
      <section className="space-y-12">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-teal-900">How Savr works</h2>
          <p className="mt-3 text-lg text-gray-700">
            Personalized AI meal planning for weight loss, muscle gain and better health. AI recipe generator builds menus with tailored calories, macros and portions without manual calorie counting.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-brand-secondary text-xl font-bold text-brand-primary">
              1
            </div>
            <h3 className="mb-3 text-xl font-semibold text-teal-900">Take the quick quiz</h3>
            <p className="text-gray-700">
              Answer a few quick questions and we set calories, balance macros and adapt portions to your metrics. Add preferences like diet, allergies or eating window.
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-brand-secondary text-xl font-bold text-brand-primary">
              2
            </div>
            <h3 className="mb-3 text-xl font-semibold text-teal-900">Get your 7-day meal plan</h3>
            <p className="text-gray-700">
              Receive a weekly menu with no repeats. Recipes, portions and daily macros done for you. Built for busy routines and simple shopping.
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-brand-secondary text-xl font-bold text-brand-primary">
              3
            </div>
            <h3 className="mb-3 text-xl font-semibold text-teal-900">Follow the menu and short grocery list</h3>
            <p className="text-gray-700">
              Prep once, cook fast and stay consistent with a simple weekly list and smart swaps. Generate ideas from your fridge when short on ingredients.
            </p>
          </div>
        </div>
      </section>

      {/* Popular Meal Plans */}
      <section className="space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-teal-900">Popular meal plans</h2>
          <p className="mt-3 text-gray-700">
            Keto, Mediterranean, Vegetarian, High-protein, Low-carb, Gluten-free, Paleo, Balanced. Built for results by Savr with macros, portions and a smart grocery list.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {[
            { name: 'Mediterranean', color: 'bg-orange-100', intent: 'mediterranean' },
            { name: 'High-Protein', color: 'bg-green-100', intent: 'high-protein' },
            { name: 'Keto', color: 'bg-yellow-100', intent: 'keto' },
          ].map((plan) => (
            <Link
              key={plan.name}
              href={`/assistant?intent=${plan.intent}`}
              className={`block rounded-xl ${plan.color} p-6 text-center transition hover:shadow-md`}
            >
              <div className="mb-4 h-40 rounded-lg bg-white/50"></div>
              <h3 className="text-xl font-semibold text-teal-900">{plan.name}</h3>
            </Link>
          ))}
        </div>
      </section>
      </div>
    </>
  );
}
