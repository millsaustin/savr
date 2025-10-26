'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import Button from "./ui/button";
import { Logo } from "./logo";
import { useDrawer } from "../contexts/DrawerContext";

export function Navigation() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const pathname = usePathname();
  const { isDrawerOpen } = useDrawer();

  useEffect(() => {
    // Check authentication status
    fetch('/api/auth/check')
      .then(res => {
        if (!res.ok) {
          setIsAuthenticated(false);
          return null;
        }
        return res.json();
      })
      .then(data => {
        if (data?.authenticated) {
          setIsAuthenticated(true);
        }
      })
      .catch(() => {
        setIsAuthenticated(false);
      });
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const isDashboard = pathname === '/dashboard';

  return (
    <nav className="border-b border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/95">
      <div className={`px-6 transition-all duration-500 ${
        isDashboard && isDrawerOpen ? 'lg:w-[30%] lg:ml-0' : 'mx-auto max-w-7xl'
      }`}>
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Logo size="md" />
          </Link>

          <div className="flex items-center gap-3 text-sm font-medium">
            {isAuthenticated ? (
              <>
                {pathname !== '/dashboard' && (
                  <Link
                    href="/dashboard"
                    className="text-gray-700 transition hover:text-brand-primary"
                  >
                    Dashboard
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="text-gray-700 transition hover:text-brand-primary"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-gray-700 transition hover:text-brand-primary"
                >
                  Login
                </Link>
                <Button href="/login">Get Started</Button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
