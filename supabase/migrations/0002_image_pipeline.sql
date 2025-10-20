-- Migration 0002: Image pipeline schema and spend tracking

-- Table Definitions --------------------------------------------------------

create table if not exists images (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid references recipes(id) on delete cascade,
  category text,
  url text not null,
  hash text,
  source text check (source in ('stock','generated','placeholder')),
  stock_provider text,
  photographer_name text,
  license_url text,
  prompt text,
  style_version text,
  cost_estimate numeric(10,2),
  generated_at timestamptz default now(),
  last_used timestamptz
);

create table if not exists image_gen_log (
  id uuid primary key default gen_random_uuid(),
  image_id uuid references images(id) on delete cascade,
  api_provider text,
  tokens_used int,
  cost_estimate numeric(10,2),
  success boolean,
  error_message text,
  created_at timestamptz default now()
);

create table if not exists system_limits (
  id serial primary key,
  month text,
  max_monthly_spend numeric(10,2) default 300.00,
  current_spend numeric(10,2) default 0.00,
  allow_generation boolean default true,
  updated_at timestamptz default now()
);

create table if not exists user_image_quota (
  user_id uuid primary key references auth.users(id) on delete cascade,
  month text,
  images_generated int default 0,
  quota_limit int default 20,
  last_reset timestamptz default now()
);

-- Indexes ------------------------------------------------------------------

create index if not exists idx_images_recipe_id on images(recipe_id);
create index if not exists idx_image_gen_log_image_id on image_gen_log(image_id);

-- Row Level Security -------------------------------------------------------

alter table images enable row level security;
alter table image_gen_log enable row level security;
alter table user_image_quota enable row level security;

-- SECURITY POLICIES --------------------------------------------------------

-- Images policies
create policy "Users can view own images"
  on images for select
  using (
    exists (
      select 1
      from recipes r
      where r.id = images.recipe_id
        and r.user_id = auth.uid()
    )
  );

create policy "Users can insert images for own recipes"
  on images for insert
  with check (
    exists (
      select 1
      from recipes r
      where r.id = images.recipe_id
        and r.user_id = auth.uid()
    )
  );

create policy "Users can modify own images"
  on images for update
  using (
    exists (
      select 1
      from recipes r
      where r.id = images.recipe_id
        and r.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from recipes r
      where r.id = images.recipe_id
        and r.user_id = auth.uid()
    )
  );

create policy "Users can delete own images"
  on images for delete
  using (
    exists (
      select 1
      from recipes r
      where r.id = images.recipe_id
        and r.user_id = auth.uid()
    )
  );

-- Image generation logs policies
create policy "Users can view own image generation logs"
  on image_gen_log for select
  using (
    exists (
      select 1
      from images i
      join recipes r on r.id = i.recipe_id
      where i.id = image_gen_log.image_id
        and r.user_id = auth.uid()
    )
  );

create policy "Users can insert own image generation logs"
  on image_gen_log for insert
  with check (
    exists (
      select 1
      from images i
      join recipes r on r.id = i.recipe_id
      where i.id = image_gen_log.image_id
        and r.user_id = auth.uid()
    )
  );

create policy "Users can modify own image generation logs"
  on image_gen_log for update
  using (
    exists (
      select 1
      from images i
      join recipes r on r.id = i.recipe_id
      where i.id = image_gen_log.image_id
        and r.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from images i
      join recipes r on r.id = i.recipe_id
      where i.id = image_gen_log.image_id
        and r.user_id = auth.uid()
    )
  );

create policy "Users can delete own image generation logs"
  on image_gen_log for delete
  using (
    exists (
      select 1
      from images i
      join recipes r on r.id = i.recipe_id
      where i.id = image_gen_log.image_id
        and r.user_id = auth.uid()
    )
  );

-- User image quota policies
create policy "Users can view own image quota"
  on user_image_quota for select
  using (auth.uid() = user_id);

create policy "Users can insert own image quota"
  on user_image_quota for insert
  with check (auth.uid() = user_id);

create policy "Users can modify own image quota"
  on user_image_quota for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own image quota"
  on user_image_quota for delete
  using (auth.uid() = user_id);
