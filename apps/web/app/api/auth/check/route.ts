import { NextResponse } from 'next/server';
import { createServerSupabase } from '../../../../lib/auth/supabase-server';

export async function GET() {
  try {
    const supabase = createServerSupabase();

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { authenticated: true, user: { id: user.id, email: user.email } },
      { status: 200 }
    );
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json(
      { authenticated: false, message: 'An error occurred' },
      { status: 500 }
    );
  }
}
