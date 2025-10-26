-- Shared Recipes System
-- Creates global recipe database that all users can access
-- Users save recipes to their personal favorites instead of creating duplicates

-- 1. Create shared_recipes table (globally accessible)
create table if not exists shared_recipes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  cuisine text,
  category text,
  cook_time text,
  servings int,
  calories int,
  protein int,
  carbs int,
  fat int,
  tags jsonb default '[]'::jsonb,
  ingredients jsonb not null,
  instructions jsonb not null,
  image_id uuid references images(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create unique index on lowercase name (prevents duplicate recipe names)
create unique index if not exists idx_shared_recipes_name_unique on shared_recipes(lower(name));

-- 2. Create user_favorites table (per-user recipe saves)
create table if not exists user_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  recipe_id uuid references shared_recipes(id) on delete cascade not null,
  collection text, -- e.g., "Weeknight Dinners", "Meal Prep"
  notes text, -- User's personal notes about this recipe
  created_at timestamptz default now(),

  -- Prevent duplicate favorites
  constraint unique_user_recipe unique (user_id, recipe_id)
);

-- 3. Row Level Security
alter table shared_recipes enable row level security;
alter table user_favorites enable row level security;

-- 4. Policies for shared_recipes
-- Everyone can read shared recipes
drop policy if exists "Anyone can view shared recipes" on shared_recipes;
create policy "Anyone can view shared recipes"
  on shared_recipes for select
  using (true);

-- Only authenticated users can create recipes (via API)
drop policy if exists "Authenticated users can create shared recipes" on shared_recipes;
create policy "Authenticated users can create shared recipes"
  on shared_recipes for insert
  with check (auth.role() = 'authenticated');

-- No one can update or delete shared recipes directly
-- (only via API with proper validation)

-- 5. Policies for user_favorites
drop policy if exists "Users can view own favorites" on user_favorites;
create policy "Users can view own favorites"
  on user_favorites for select
  using (auth.uid() = user_id);

drop policy if exists "Users can manage own favorites" on user_favorites;
create policy "Users can manage own favorites"
  on user_favorites for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 6. Indexes for performance
create index if not exists idx_shared_recipes_cuisine on shared_recipes(cuisine);
create index if not exists idx_shared_recipes_category on shared_recipes(category);
create index if not exists idx_shared_recipes_image_id on shared_recipes(image_id);
create index if not exists idx_user_favorites_user_id on user_favorites(user_id);
create index if not exists idx_user_favorites_recipe_id on user_favorites(recipe_id);

-- 7. View for recipes with image URLs (convenience)
create or replace view recipes_with_images as
select
  sr.*,
  i.url as image_url,
  i.source as image_source,
  i.stock_provider as image_provider
from shared_recipes sr
left join images i on sr.image_id = i.id;

-- 8. Grant permissions
grant select on recipes_with_images to authenticated, anon;
