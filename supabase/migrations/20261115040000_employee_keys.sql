-- Kunci API per karyawan AI. Kunci hanya bisa ditulis dari browser; yang bisa dibaca hanya 4 karakter terakhir.
-- Edge Function membaca kunci utuh memakai service role.
create table public.employee_keys (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  employee text not null,
  api_key text not null,
  last4 text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, employee)
);
alter table public.employee_keys enable row level security;
create policy "owner_all" on public.employee_keys for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
revoke all on table public.employee_keys from anon, authenticated;
grant insert, update, delete on table public.employee_keys to authenticated;
grant select (user_id, employee, last4, updated_at) on table public.employee_keys to authenticated;
