# How to Set Yourself as Admin

## Step 1: Run the Migration

First, apply the migration to add the `is_admin` column:

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Navigate to **SQL Editor**
4. Copy and paste the content from `supabase/migrations/0007_admin_users.sql`
5. Click **Run**

## Step 2: Set Your Account as Admin

After creating your account through the signup page, you need to mark yourself as admin.

### Option A: Using SQL Editor (Recommended)

1. First, **sign up** for an account at http://localhost:3000/signup
2. Go to Supabase Dashboard → **SQL Editor**
3. Run this query to find your user ID:

```sql
-- Find your user ID
SELECT id, email FROM auth.users;
```

4. Copy your user ID, then run:

```sql
-- Replace 'your-user-id-here' with your actual user ID from step 3
-- Replace 'your-email@example.com' with your actual email

-- First, create a preferences record if it doesn't exist
INSERT INTO user_preferences (user_id)
SELECT id FROM auth.users WHERE email = 'your-email@example.com'
ON CONFLICT (user_id) DO NOTHING;

-- Then set yourself as admin
UPDATE user_preferences
SET is_admin = true
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'your-email@example.com'
);
```

5. Verify it worked:

```sql
-- Check admin status
SELECT u.email, p.is_admin
FROM auth.users u
LEFT JOIN user_preferences p ON u.id = p.user_id
WHERE u.email = 'your-email@example.com';
```

You should see `is_admin` = `true`

### Option B: Quick One-Liner (After signup)

```sql
-- Replace your-email@example.com with your actual email
INSERT INTO user_preferences (user_id, is_admin)
SELECT id, true FROM auth.users WHERE email = 'your-email@example.com'
ON CONFLICT (user_id) DO UPDATE SET is_admin = true;
```

## Step 3: Test It

1. Go to http://localhost:3000/login
2. Sign in with your account
3. Go to http://localhost:3000/dashboard
4. Try generating a recipe - it should work!

## Adding More Admins Later

To add another admin user, just run:

```sql
UPDATE user_preferences
SET is_admin = true
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'their-email@example.com'
);
```

## Removing Admin Access

```sql
UPDATE user_preferences
SET is_admin = false
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'their-email@example.com'
);
```

## Security Notes

- ✅ Only admin users can generate AI recipes
- ✅ Non-admin users will see: "AI recipe generation is currently in beta and limited to admin users only"
- ✅ All signups are still allowed, but they can't use AI features
- ✅ You control who gets admin access via SQL
- ✅ Easy to add/remove admin users anytime

## Troubleshooting

**"User preferences not found"**
- Make sure you've signed up for an account first
- Run the INSERT query to create a preferences record

**"Still getting 403 error"**
- Verify `is_admin = true` with the check query above
- Clear browser cookies and sign in again
- Check server logs for errors

**"Can't find my user ID"**
- Check the `auth.users` table with: `SELECT * FROM auth.users;`
- Your ID should be there after signup
