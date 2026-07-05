-- LinkedIn connection metadata on profiles
alter table public.profiles
  add column if not exists linkedin_member_id text,
  add column if not exists linkedin_connected_at timestamptz;
