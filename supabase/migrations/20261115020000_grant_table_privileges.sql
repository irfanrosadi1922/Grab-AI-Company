-- Tabel yang dibuat lewat migrasi tidak otomatis memberi izin ke role "authenticated" di project ini,
-- sehingga semua permintaan REST ditolak (403) walau RLS sudah benar. Sudah diterapkan.
-- TRUNCATE dicabut karena melewati RLS. Role "anon" tidak punya akses.
do $$
declare t text;
begin
  foreach t in array array['tasks','approvals','stores','assets','user_settings','sales_entries','menu_items','reviews','marketing_entries'] loop
    execute format('revoke all on table public.%I from anon, authenticated', t);
    execute format('grant select, insert, update, delete on table public.%I to authenticated', t);
  end loop;
end $$;
