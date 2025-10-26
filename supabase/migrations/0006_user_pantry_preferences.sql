-- User Pantry and Preferences System
-- Stores user's pantry items, dietary preferences, and macro goals

-- 1. User Pantry Items
create table if not exists user_pantry (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  item_name text not null,
  quantity text, -- e.g., "2 lbs", "1 package", "6 pieces"
  category text, -- e.g., "protein", "vegetables", "grains", "dairy"
  added_at timestamptz default now(),
  updated_at timestamptz default now(),

  -- Prevent duplicate items per user
  constraint unique_user_pantry_item unique (user_id, lower(item_name))
);

-- 2. User Dietary Preferences
create table if not exists user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,

  -- Dietary preferences
  dietary_restrictions jsonb default '[]'::jsonb, -- ["vegetarian", "gluten-free", etc]
  favorite_cuisines jsonb default '[]'::jsonb, -- ["italian", "mexican", "thai"]
  disliked_ingredients jsonb default '[]'::jsonb, -- ["cilantro", "mushrooms"]

  -- Macro goals
  daily_calories int,
  daily_protein int, -- grams
  daily_carbs int, -- grams
  daily_fat int, -- grams

  -- Preferences
  preferred_meal_types jsonb default '[]'::jsonb, -- ["quick", "meal-prep", "one-pot"]
  cooking_skill_level text default 'intermediate', -- "beginner", "intermediate", "advanced"
  available_cook_time int default 30, -- minutes

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. User Grocery Lists
create table if not exists user_grocery_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text default 'My Grocery List',
  items jsonb not null default '[]'::jsonb, -- [{"name": "chicken breast", "quantity": "2 lbs", "checked": false}]
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4. Row Level Security
alter table user_pantry enable row level security;
alter table user_preferences enable row level security;
alter table user_grocery_lists enable row level security;

-- 5. Policies for user_pantry
drop policy if exists "Users can view own pantry" on user_pantry;
create policy "Users can view own pantry"
  on user_pantry for select
  using (auth.uid() = user_id);

drop policy if exists "Users can manage own pantry" on user_pantry;
create policy "Users can manage own pantry"
  on user_pantry for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 6. Policies for user_preferences
drop policy if exists "Users can view own preferences" on user_preferences;
create policy "Users can view own preferences"
  on user_preferences for select
  using (auth.uid() = user_id);

drop policy if exists "Users can manage own preferences" on user_preferences;
create policy "Users can manage own preferences"
  on user_preferences for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 7. Policies for user_grocery_lists
drop policy if exists "Users can view own grocery lists" on user_grocery_lists;
create policy "Users can view own grocery lists"
  on user_grocery_lists for select
  using (auth.uid() = user_id);

drop policy if exists "Users can manage own grocery lists" on user_grocery_lists;
create policy "Users can manage own grocery lists"
  on user_grocery_lists for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 8. Indexes for performance
create index if not exists idx_user_pantry_user_id on user_pantry(user_id);
create index if not exists idx_user_pantry_category on user_pantry(category);
create index if not exists idx_user_preferences_user_id on user_preferences(user_id);
create index if not exists idx_user_grocery_lists_user_id on user_grocery_lists(user_id);

-- 9. Updated timestamp triggers
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_user_pantry_updated_at on user_pantry;
create trigger update_user_pantry_updated_at
  before update on user_pantry
  for each row
  execute function update_updated_at_column();

drop trigger if exists update_user_preferences_updated_at on user_preferences;
create trigger update_user_preferences_updated_at
  before update on user_preferences
  for each row
  execute function update_updated_at_column();

drop trigger if exists update_user_grocery_lists_updated_at on user_grocery_lists;
create trigger update_user_grocery_lists_updated_at
  before update on user_grocery_lists
  for each row
  execute function update_updated_at_column();
