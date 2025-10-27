-- Add admin flag to user preferences
-- This allows restricting AI features to admin users only

-- Add is_admin column to user_preferences
alter table user_preferences
  add column if not exists is_admin boolean default false;

-- Create index for faster admin lookups
create index if not exists idx_user_preferences_is_admin
  on user_preferences(user_id)
  where is_admin = true;

-- Comment
comment on column user_preferences.is_admin is
  'Admin flag: only admin users can access AI recipe generation features';
