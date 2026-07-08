-- Run this in Supabase Dashboard -> SQL Editor -> New query.
-- Safe to re-run: uses "if not exists" and "drop policy if exists".

-- ============ Log tables (one row per entry) ============
create table if not exists weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  weight_kg numeric not null,
  created_at timestamptz default now(),
  unique(user_id, date)
);

create table if not exists workout_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  type text not null,
  exercises jsonb default '[]',
  cardio_mins integer default 0,
  created_at timestamptz default now()
);

create table if not exists food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  name text not null,
  protein numeric default 0,
  calories numeric default 0,
  carbs numeric default 0,
  fat numeric default 0,
  estimated boolean default false,
  source text default 'manual',
  created_at timestamptz default now()
);

-- ============ Per-user settings (one JSON blob per user) ============
-- Stores targets, peaks, lift targets, and protein sources together.
-- Mirrors the original app's client-side "profile / macro-targets / lift-targets /
-- protein-sources" stores, kept as JSON so the UI logic is unchanged.
create table if not exists user_settings (
  user_id uuid references auth.users(id) on delete cascade primary key,
  data jsonb not null default '{}',
  updated_at timestamptz default now()
);

-- ============ Row Level Security ============
alter table weight_logs   enable row level security;
alter table workout_logs  enable row level security;
alter table food_logs     enable row level security;
alter table user_settings enable row level security;

drop policy if exists "weight_logs_owner"   on weight_logs;
drop policy if exists "workout_logs_owner"  on workout_logs;
drop policy if exists "food_logs_owner"     on food_logs;
drop policy if exists "user_settings_owner" on user_settings;

create policy "weight_logs_owner" on weight_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "workout_logs_owner" on workout_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "food_logs_owner" on food_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user_settings_owner" on user_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
