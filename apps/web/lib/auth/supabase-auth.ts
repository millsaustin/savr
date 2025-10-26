import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Client-side Supabase client for auth operations
export function createClientSupabase() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

// Sign up with email and password
export async function signUp(email: string, password: string) {
  const supabase = createClientSupabase();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  return { data, error };
}

// Sign in with email and password
export async function signIn(email: string, password: string) {
  const supabase = createClientSupabase();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  return { data, error };
}

// Sign in with Google OAuth
export async function signInWithGoogle() {
  const supabase = createClientSupabase();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  return { data, error };
}

// Sign out
export async function signOut() {
  const supabase = createClientSupabase();

  const { error } = await supabase.auth.signOut();

  return { error };
}

// Get current session
export async function getSession() {
  const supabase = createClientSupabase();

  const { data: { session }, error } = await supabase.auth.getSession();

  return { session, error };
}

// Get current user
export async function getUser() {
  const supabase = createClientSupabase();

  const { data: { user }, error } = await supabase.auth.getUser();

  return { user, error };
}
