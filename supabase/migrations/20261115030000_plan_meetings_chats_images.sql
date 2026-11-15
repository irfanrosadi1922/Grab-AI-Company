-- Jadwal pemasaran, catatan rapat, riwayat chat, dan penyimpanan gambar pemasaran.
create table public.plan_items (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  plan_date date not null,
  title text not null,
  channel text not null,
  kind text not null check (kind in ('Konten','Kampanye')),
  created_at timestamptz not null default now()
);

create table public.meetings (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  type text not null,
  type_label text not null,
  started_at text not null default '',
  duration_secs integer not null default 0,
  participants jsonb not null default '[]',
  agenda jsonb not null default '[]',
  minutes text not null default '',
  decisions jsonb not null default '[]',
  chat jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create table public.chat_threads (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  employee text not null,
  messages jsonb not null default '[]',
  created_at timestamptz not null default now()
);

alter table public.assets add column image_path text, add column cta text not null default '';

create index on public.plan_items (user_id);
create index on public.meetings (user_id);
create index on public.chat_threads (user_id);

do $$
declare t text;
begin
  foreach t in array array['plan_items','meetings','chat_threads'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "owner_all" on public.%I for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
    execute format('revoke all on table public.%I from anon, authenticated', t);
    execute format('grant select, insert, update, delete on table public.%I to authenticated', t);
  end loop;
end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('marketing-assets', 'marketing-assets', false, 8388608, array['image/png','image/jpeg','image/webp'])
on conflict (id) do nothing;

create policy "marketing_assets_select" on storage.objects for select to authenticated
  using (bucket_id = 'marketing-assets' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "marketing_assets_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'marketing-assets' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "marketing_assets_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'marketing-assets' and (storage.foldername(name))[1] = (select auth.uid())::text);
