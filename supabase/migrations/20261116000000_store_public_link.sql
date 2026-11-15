alter table public.stores
  add column public_url text not null default '',
  add column peek_text text not null default '',
  add column peek_at text not null default '';
