import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { Inter, Outfit } from "next/font/google";

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
        <header className="border-b border-gray-200 bg-white">
          <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4">
            <Link href="/" className="text-xl font-semibold text-brand-primary">
              Savr
            </Link>
            <div className="flex items-center gap-6 text-sm font-medium">
              <Link
                href="/assistant"
                className="text-gray-700 transition hover:text-brand-primary"
              >
                Assistant
              </Link>
              <Link
                href="/dashboard"
                className="rounded-lg bg-brand-primary px-4 py-2 text-white shadow-sm transition hover:bg-brand-dark"
              >
                Dashboard
              </Link>
            </div>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-7xl px-6 py-12 md:py-16">{children}</main>
      </body>
    </html>
  );
}
