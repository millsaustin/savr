import { NextRequest, NextResponse } from 'next/server';
import { createMiddlewareSupabase } from './lib/auth/supabase-server';

const PROTECTED_PATHS = ['/dashboard'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if the current path is protected
  const isProtectedRoute = PROTECTED_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );

  // Check for Supabase session using the proper middleware client
  const { supabase, response } = createMiddlewareSupabase(request);

  const { data: { user } } = await supabase.auth.getUser();

  // If accessing a protected route without a session, redirect to login
  if (isProtectedRoute && !user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If logged in and trying to access login page, redirect to dashboard
  if (pathname === '/login' && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/dashboard/:path*', '/login'],
};
