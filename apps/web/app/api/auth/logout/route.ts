import { NextResponse } from 'next/server';
import { createRouteHandlerSupabase } from '../../../../lib/auth/supabase-server';

export async function POST() {
  try {
    const supabase = createRouteHandlerSupabase();

    // Sign out from Supabase - this will automatically clear the auth cookies
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Logout error:', error);
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Logout successful' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred during logout' },
      { status: 500 }
    );
  }
}
