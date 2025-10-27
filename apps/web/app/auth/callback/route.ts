import { NextResponse } from 'next/server';
import { createRouteHandlerSupabase } from '../../../lib/auth/supabase-server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = createRouteHandlerSupabase();

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return to login if something went wrong
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
