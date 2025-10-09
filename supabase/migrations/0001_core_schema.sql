-- Supabase core schema for AI Meal Prep Assistant.
-- Ensures secure, per-user data isolation leveraging Supabase Auth.

-- Enable required extension for UUID generation.
create extension if not exists "pgcrypto" with schema public;

-- Table Definitions --------------------------------------------------------

create table if not exists recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  category text,
  ingredients jsonb not null,
  instructions text not null,
  macros jsonb,
  cost_estimate numeric(10,2),
  created_at timestamptz default now()
);

create table if not exists meal_gen_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  prompt_hash text not null,
  model text not null,
  tokens_used int,
  cost_estimate numeric(10,2),
  created_at timestamptz default now()
);

create table if not exists user_pantry (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  ingredient_name text not null,
  quantity text,
  location text check (location in ('pantry','fridge','freezer')),
  last_updated timestamptz default now()
);

-- Row Level Security -------------------------------------------------------

alter table recipes enable row level security;
alter table meal_gen_log enable row level security;
alter table user_pantry enable row level security;

-- SECURITY POLICIES --------------------------------------------------------

-- Recipes policies
create policy "Users can view own recipes"
  on recipes for select
  using (auth.uid() = user_id);

create policy "Users can insert own recipes"
  on recipes for insert
  with check (auth.uid() = user_id);

create policy "Users can update own recipes"
  on recipes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Meal generation log policies
create policy "Users can view own meal logs"
  on meal_gen_log for select
  using (auth.uid() = user_id);

create policy "Users can insert own meal logs"
  on meal_gen_log for insert
  with check (auth.uid() = user_id);

-- Pantry policies
create policy "Users can view own pantry items"
  on user_pantry for select
  using (auth.uid() = user_id);

create policy "Users can modify own pantry items"
  on user_pantry for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Indexes ------------------------------------------------------------------

create index idx_recipes_user_id on recipes(user_id);
create index idx_meal_gen_log_user_id on meal_gen_log(user_id);
create index idx_user_pantry_user_id on user_pantry(user_id);
