"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Button from "../../components/ui/button";
import { DashboardChatInterface } from "../../components/dashboard-chat-interface";
import { PantryDrawer } from "../../components/pantry-drawer";
import { FavoritesDrawer } from "../../components/favorites-drawer";
import { GroceryDrawer } from "../../components/grocery-drawer";
import { useDrawer } from "../../contexts/DrawerContext";

const cards = [
  {
    id: "favorites",
    title: "Favorites",
    description: "Pin your go-to recipes and quick saves for busy weeknights. Organize meals into collections and quickly access the recipes you love most.",
  },
  {
    id: "pantry",
    title: "Pantry Manager",
    description: "See what ingredients you have on hand and track upcoming restocks. Monitor expiration dates and never let food go to waste again.",
  },
  {
    id: "grocery",
    title: "Grocery List",
    description: "Generate a smart list with estimated spend, store sections, and swaps. Track your shopping progress and stay within budget effortlessly.",
  },
];

const fade = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0 },
};

const DashboardPage = () => {
  const [openDrawer, setOpenDrawer] = useState<string | null>(null);
  const { setIsDrawerOpen } = useDrawer();

  const handleCardClick = (cardId: string) => {
    setOpenDrawer(cardId);
  };

  const handleCloseDrawer = () => {
    setOpenDrawer(null);
  };

  const isDrawerOpen = openDrawer !== null;

  // Update context when drawer state changes
  useEffect(() => {
    setIsDrawerOpen(isDrawerOpen);
  }, [isDrawerOpen, setIsDrawerOpen]);

  // Cleanup: reset drawer state when component unmounts
  useEffect(() => {
    return () => {
      setIsDrawerOpen(false);
    };
  }, [setIsDrawerOpen]);

  return (
    <div className="flex flex-col bg-gray-50 min-h-screen">
      <motion.main
        className={`flex-1 w-full px-6 py-12 transition-all duration-500 ${
          isDrawerOpen ? 'lg:w-[30%] lg:ml-0' : 'mx-auto max-w-7xl'
        }`}
      >
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
                <h1 className={`font-semibold text-teal-900 transition-all ${isDrawerOpen ? 'text-2xl lg:text-3xl' : 'text-4xl md:text-5xl'}`}>
                  Your meal planning hub
                </h1>
                {!isDrawerOpen && (
                  <p className="max-w-2xl text-base text-gray-700">
                    Keep tabs on the meals you love, ingredients you have, and the groceries you still need.
                  </p>
                )}
              </div>
              {!isDrawerOpen && (
                <div className="flex flex-wrap gap-3">
                  <Button variant="outline" href="/">
                    Back to home
                  </Button>
                </div>
              )}
            </motion.div>

            {/* Main content grid - Chat with cards around it */}
            <motion.div variants={fade} className={`grid gap-6 ${isDrawerOpen ? 'lg:grid-cols-1' : 'lg:grid-cols-3'}`}>
              {/* Left/Top - Chat Interface */}
              <div className={`h-[600px] ${isDrawerOpen ? '' : 'lg:col-span-2'}`}>
                <DashboardChatInterface />
              </div>

              {/* Right - Feature Cards - Hide on desktop when drawer is open */}
              {!isDrawerOpen && (
                <div className="h-[600px] flex flex-col justify-center space-y-4">
                  {cards.map((card) => (
                    <motion.article
                      key={card.title}
                      variants={fade}
                      onClick={() => handleCardClick(card.id)}
                      className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md hover:border-brand-primary/30 cursor-pointer group flex flex-col justify-between"
                    >
                      <div>
                        <h2 className="text-lg font-semibold text-teal-900 group-hover:text-brand-primary transition">
                          {card.title}
                        </h2>
                        <p className="mt-2 text-sm text-gray-700 leading-relaxed">{card.description}</p>
                      </div>
                      <div className="mt-4 flex items-center gap-2 text-xs uppercase tracking-widest text-brand-primary">
                        <span>Open</span>
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </motion.article>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        </div>
      </motion.main>

      {/* Drawers */}
      <FavoritesDrawer isOpen={openDrawer === 'favorites'} onClose={handleCloseDrawer} />
      <PantryDrawer isOpen={openDrawer === 'pantry'} onClose={handleCloseDrawer} />
      <GroceryDrawer isOpen={openDrawer === 'grocery'} onClose={handleCloseDrawer} />
    </div>
  );
};

export default DashboardPage;
