import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Simple local credentials - in production, use proper auth
const LOCAL_CREDENTIALS = {
  email: process.env.LOCAL_AUTH_EMAIL || 'admin@savr.com',
  password: process.env.LOCAL_AUTH_PASSWORD || 'admin123',
};

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    // Validate credentials
    if (email === LOCAL_CREDENTIALS.email && password === LOCAL_CREDENTIALS.password) {
      // Create a simple session token
      const sessionToken = Buffer.from(
        JSON.stringify({ email, timestamp: Date.now() })
      ).toString('base64');

      // Set cookie with session token
      cookies().set('session', sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
      });

      return NextResponse.json(
        { success: true, message: 'Login successful' },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        { success: false, message: 'Invalid email or password' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred during login' },
      { status: 500 }
    );
  }
}
