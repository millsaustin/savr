# Supabase Authentication Setup Guide

This guide will walk you through setting up secure authentication for Savr using Supabase Auth.

## ✅ What You Get

- **Secure password hashing** - Supabase uses bcrypt with automatic salting
- **Email/password authentication** - Users can sign up with email
- **Google OAuth** - One-click sign-in with Google
- **Session management** - Secure JWT tokens, automatic refresh
- **Email verification** (optional) - Confirm user emails
- **Password reset** - Built-in forgot password flow

## 📋 Setup Steps

### 1. Enable Email Authentication

1. Go to your [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Navigate to **Authentication** → **Providers**
4. Find **Email** provider
5. **Enable** it
6. **Disable** "Confirm email" if you want to allow instant signups (recommended for development)
7. Click **Save**

### 2. Set Up Google OAuth (Optional but Recommended)

#### Get Google OAuth Credentials:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth client ID**
5. Select **Web application**
6. Add these **Authorized redirect URIs**:
   ```
   https://YOUR_SUPABASE_PROJECT_ID.supabase.co/auth/v1/callback
   ```
   Replace `YOUR_SUPABASE_PROJECT_ID` with your actual project ID from Supabase URL
7. Copy the **Client ID** and **Client Secret**

#### Configure in Supabase:

1. Back in Supabase Dashboard → **Authentication** → **Providers**
2. Find **Google** provider
3. **Enable** it
4. Paste your **Client ID** and **Client Secret**
5. Click **Save**

### 3. Configure Redirect URLs

1. In Supabase Dashboard → **Authentication** → **URL Configuration**
2. Add your app URLs to **Redirect URLs**:
   ```
   http://localhost:3000/auth/callback
   https://your-production-domain.com/auth/callback
   ```
3. Add **Site URL**:
   ```
   http://localhost:3000 (for development)
   https://your-production-domain.com (for production)
   ```
4. Click **Save**

### 4. Email Templates (Optional)

Customize email templates for better branding:

1. Go to **Authentication** → **Email Templates**
2. Customize:
   - Confirmation email
   - Password reset email
   - Magic link email
3. Click **Save** for each template

## 🚀 Testing Your Setup

### Test Email/Password Signup:

1. Start your dev server: `npm run dev`
2. Go to http://localhost:3000/signup
3. Create an account with your email
4. If email confirmation is enabled, check your inbox
5. Try logging in at http://localhost:3000/login

### Test Google OAuth:

1. Go to http://localhost:3000/login
2. Click "Continue with Google"
3. Select your Google account
4. You should be redirected back and logged in

## 🔒 Security Features

Supabase Auth provides enterprise-grade security out of the box:

- ✅ **Password hashing**: bcrypt with automatic salting
- ✅ **Rate limiting**: Prevents brute force attacks
- ✅ **JWT tokens**: Secure session management
- ✅ **PKCE flow**: Enhanced OAuth security
- ✅ **Email verification**: Optional user validation
- ✅ **Password policies**: Enforce strong passwords (min 8 chars by default)

## 🛡️ Adding Auth Protection to Endpoints

Once auth is working, you can protect your API endpoints. Example for the AI recipe generation:

```typescript
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// In your API route
const cookieStore = cookies();
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    headers: {
      cookie: cookieStore.toString(),
    },
  },
});

const { data: { user }, error } = await supabase.auth.getUser();

if (!user) {
  return NextResponse.json(
    { error: 'Please sign in to use this feature' },
    { status: 401 }
  );
}
```

## 📝 Next Steps

After setting up auth:

1. ✅ Test signup and login flows
2. ✅ Add auth protection to AI endpoints (prevents abuse!)
3. ✅ Set up your Anthropic API key
4. ✅ Test the full recipe generation flow
5. ✅ Deploy to production with proper environment variables

## 🐛 Troubleshooting

**"Email not confirmed"**: Disable email confirmation in Supabase Auth settings for development

**Google OAuth not working**: Check redirect URLs match exactly (including http/https)

**Session not persisting**: Clear browser cookies and try again

**401 errors after login**: Check that cookies are being set properly (inspect Network tab)

## 📚 Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Google OAuth Setup](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Password Policies](https://supabase.com/docs/guides/auth/passwords)
