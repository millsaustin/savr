"use client";

import { motion } from "framer-motion";
import Button from "../../components/ui/button";

const cards = [
  {
    title: "Favorites",
    description: "Pin your go-to recipes and quick saves for busy weeknights.",
  },
  {
    title: "Pantry Manager",
    description: "See what ingredients you have on hand and track upcoming restocks.",
  },
  {
    title: "Grocery List",
    description: "Generate a smart list with estimated spend, store sections, and swaps.",
  },
];

const fade = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0 },
};

const DashboardPage = () => (
  <div className="space-y-12">
    <motion.div
      className="space-y-12"
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.12 } } }}
    >
      <motion.div variants={fade} className="flex flex-wrap items-center justify-between gap-6">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-widest text-brand-primary">
            Dashboard
          </p>
          <h1 className="text-4xl font-semibold text-teal-900 md:text-5xl">Your meal planning hub</h1>
          <p className="max-w-2xl text-base text-gray-700">
            Keep tabs on the meals you love, ingredients you have, and the groceries you still need.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button href="/assistant">Open assistant</Button>
          <Button variant="outline" href="/">
            Back to home
          </Button>
        </div>
      </motion.div>

      <div className="grid gap-6 md:grid-cols-3">
        {cards.map((card) => (
          <motion.article
            key={card.title}
            variants={fade}
            className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm transition hover:shadow-md"
          >
            <h2 className="text-xl font-semibold text-teal-900">{card.title}</h2>
            <p className="mt-3 text-sm text-gray-700">{card.description}</p>
            <div className="mt-6 text-xs uppercase tracking-widest text-brand-primary">
              Coming soon
            </div>
          </motion.article>
        ))}
      </div>
    </motion.div>
  </div>
);

export default DashboardPage;
