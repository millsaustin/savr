'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Logo } from '../../components/logo';
import { signIn, signInWithGoogle } from '../../lib/auth/supabase-auth';

console.log('🔥🔥🔥 LOGIN PAGE LOADED 🔥🔥🔥');

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // PREVENT DEFAULT FIRST
    console.log('🚀 handleSubmit called!', {
      email,
      emailLength: email.length,
      passwordLength: password.length,
      emailIsValid: email.includes('@')
    });
    setIsLoading(true);
    setError('');

    try {
      const { data, error: signInError } = await signIn(email, password);

      console.log('Sign in response:', { data, error: signInError });

      if (signInError) {
        console.error('Sign in error:', signInError);
        setError(signInError.message);
        setIsLoading(false);
        return;
      }

      if (data?.session) {
        console.log('Session found, redirecting...');
        // Use router.replace to avoid adding to history
        await router.replace('/dashboard');
      } else {
        console.log('No session returned:', data);
        setError('Sign in failed. Please check your email and password.');
        setIsLoading(false);
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const { error: googleError } = await signInWithGoogle();

      if (googleError) {
        setError(googleError.message);
      }
    } catch (err) {
      console.error('Google sign-in error:', err);
      setError('Failed to sign in with Google');
    }
  };

  return (
    <div className="flex-1 bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo and heading */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <Logo size="sm" />
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-semibold text-teal-900">Welcome back</h1>
            <p className="text-sm text-gray-600">Sign in to your Savr account</p>
          </div>
        </div>

        {/* Login form */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Error message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Email field */}
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition"
              />
            </div>

            {/* Password field */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <Link href="/forgot-password" className="text-xs text-brand-primary hover:text-brand-dark transition">
                  Forgot?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition"
              />
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-brand-primary text-white py-2 text-sm rounded-lg font-semibold hover:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-wide">
              <span className="px-2 bg-white text-gray-500">Or continue with</span>
            </div>
          </div>

          {/* Social login buttons */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-2 border border-gray-300 rounded-lg py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
          >
            <svg className="h-4 w-4" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              <path fill="none" d="M0 0h48v48H0z"/>
            </svg>
            Continue with Google
          </button>
        </div>

        {/* Sign up link */}
        <p className="text-center text-sm text-gray-600">
          Don't have an account?{' '}
          <Link href="/signup" className="text-brand-primary font-semibold hover:text-brand-dark transition">
            Sign up for free
          </Link>
        </p>
      </div>
    </div>
  );
}
