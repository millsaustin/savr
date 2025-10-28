import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { Inter, Outfit } from "next/font/google";
import { Navigation } from "../components/navigation";
import { Footer } from "../components/footer";
import { DrawerProvider } from "../contexts/DrawerContext";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-body",
});

const outfit = Outfit({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-heading",
});

export const metadata: Metadata = {
  title: "Savr — AI Meal Prep Assistant",
  description: "Smarter meals, better results. Budget-savvy, macro-aware plans.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable}`}>
      <body className="min-h-screen bg-white text-gray-800 antialiased">
        <DrawerProvider>
          <div className="min-h-screen flex flex-col">
            <Navigation />
            <main className="flex-1 flex flex-col">
              {children}
            </main>
            <Footer />
          </div>
        </DrawerProvider>
      </body>
    </html>
  );
}
