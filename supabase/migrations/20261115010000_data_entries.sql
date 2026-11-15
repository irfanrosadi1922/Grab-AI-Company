-- Data yang diisi sendiri oleh CEO. Sudah diterapkan ke project Supabase "Grab AI Company".
create table public.sales_entries (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  entry_date date not null,
  store_id text not null,
  amount numeric not null check (amount >= 0),
  orders integer not null default 0 check (orders >= 0),
  created_at timestamptz not null default now()
);
create table public.menu_items (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  orders integer not null default 0 check (orders >= 0),
  revenue numeric not null default 0 check (revenue >= 0),
  created_at timestamptz not null default now()
);
create table public.reviews (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  store_id text not null,
  rating integer not null check (rating between 1 and 5),
  body text not null default '',
  review_date date not null,
  created_at timestamptz not null default now()
);
create table public.marketing_entries (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  channel text not null,
  spend numeric not null default 0 check (spend >= 0),
  orders integer not null default 0 check (orders >= 0),
  created_at timestamptz not null default now()
);
create index on public.sales_entries (user_id, entry_date);
create index on public.menu_items (user_id);
create index on public.reviews (user_id);
create index on public.marketing_entries (user_id);
do $$
declare t text;
begin
  foreach t in array array['sales_entries','menu_items','reviews','marketing_entries'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "owner_all" on public.%I for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
  end loop;
end $$;
