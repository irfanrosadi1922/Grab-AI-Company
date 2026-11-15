-- Grab AI Company: skema awal. Setiap baris dimiliki satu pengguna (user_id) dan dilindungi RLS.
-- Sudah diterapkan ke project Supabase "Grab AI Company".

create table public.tasks (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  description text not null default '',
  assignee text not null,
  priority text not null check (priority in ('Low','Medium','High','Urgent')),
  status text not null check (status in ('Pending','Assigned','In Progress','Review','Completed','Failed','Requires Approval')),
  deadline date not null,
  result text,
  history jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create table public.approvals (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  requested_by text not null,
  category text not null,
  summary text not null default '',
  recommendation text not null default '',
  risk text not null check (risk in ('Rendah','Sedang','Tinggi')),
  created_at_label text not null default '',
  decision text check (decision in ('Approved','Rejected')),
  decided_at text,
  reason text,
  created_at timestamptz not null default now()
);

create table public.stores (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  city text not null,
  merchant_id text not null default '',
  is_open boolean not null default false,
  connection text not null default 'Belum terhubung',
  last_sync text,
  demo jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table public.assets (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  format text not null,
  template text not null,
  headline text not null,
  sub text not null default '',
  accent text not null,
  created_at_label text not null default '',
  created_at timestamptz not null default now()
);

create table public.user_settings (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  data jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

create index on public.tasks (user_id);
create index on public.approvals (user_id);
create index on public.stores (user_id);
create index on public.assets (user_id);

do $$
declare t text;
begin
  foreach t in array array['tasks','approvals','stores','assets','user_settings'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "owner_all" on public.%I for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
  end loop;
end $$;
