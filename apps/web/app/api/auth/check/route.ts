import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const session = cookies().get('session');

    if (!session) {
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      );
    }

    // Decode and validate session token
    try {
      const sessionData = JSON.parse(
        Buffer.from(session.value, 'base64').toString()
      );

      // Check if session is still valid (within 7 days)
      const sessionAge = Date.now() - sessionData.timestamp;
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

      if (sessionAge > maxAge) {
        cookies().delete('session');
        return NextResponse.json(
          { authenticated: false, message: 'Session expired' },
          { status: 401 }
        );
      }

      return NextResponse.json(
        { authenticated: true, email: sessionData.email },
        { status: 200 }
      );
    } catch (decodeError) {
      cookies().delete('session');
      return NextResponse.json(
        { authenticated: false, message: 'Invalid session' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json(
      { authenticated: false, message: 'An error occurred' },
      { status: 500 }
    );
  }
}
