import { NextRequest, NextResponse } from 'next/server';

const PROTECTED_PATHS = ['/assistant', '/dashboard'];

function requiresAuth(request: NextRequest) {
  const envToggle = process.env.REQUIRE_AUTH;
  if (envToggle?.toLowerCase() !== 'true') return false;

  const pathname = request.nextUrl.pathname;
  return PROTECTED_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

export function middleware(request: NextRequest) {
  if (!requiresAuth(request)) {
    return NextResponse.next();
  }

  const loginUrl = new URL('/login', request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/assistant/:path*', '/dashboard/:path*'],
};
