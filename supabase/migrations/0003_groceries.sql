-- Migration 0003: Meal plans and grocery list normalization

create table if not exists meal_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  title text,
  created_at timestamptz default now()
);

create table if not exists meal_plan_items (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid references meal_plans(id) on delete cascade,
  recipe_id uuid references recipes(id) on delete cascade,
  position int,
  created_at timestamptz default now()
);

create table if not exists grocery_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  plan_id uuid references meal_plans(id) on delete set null,
  estimated_total_cost numeric(10,2),
  created_at timestamptz default now()
);

create table if not exists grocery_list_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid references grocery_lists(id) on delete cascade,
  name text not null,
  amount numeric,
  unit text,
  notes text,
  source_meal_ids uuid[] default '{}',
  created_at timestamptz default now()
);

create index if not exists idx_meal_plan_items_plan on meal_plan_items(plan_id);
create index if not exists idx_grocery_list_items_list on grocery_list_items(list_id);

alter table meal_plans enable row level security;
alter table meal_plan_items enable row level security;
alter table grocery_lists enable row level security;
alter table grocery_list_items enable row level security;

create policy "meal_plans_owner_rw" on meal_plans
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "meal_plan_items_rw" on meal_plan_items
  for all using (
    exists (
      select 1
      from meal_plans mp
      where mp.id = plan_id
        and mp.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1
      from meal_plans mp
      where mp.id = plan_id
        and mp.user_id = auth.uid()
    )
  );

create policy "grocery_lists_owner_rw" on grocery_lists
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "grocery_list_items_rw" on grocery_list_items
  for all using (
    exists (
      select 1
      from grocery_lists gl
      where gl.id = list_id
        and gl.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1
      from grocery_lists gl
      where gl.id = list_id
        and gl.user_id = auth.uid()
    )
  );
