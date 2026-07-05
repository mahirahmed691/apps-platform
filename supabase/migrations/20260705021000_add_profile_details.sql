-- CV contact/profile details on the shared profiles row
alter table public.profiles
  add column if not exists full_name text,
  add column if not exists phone text,
  add column if not exists location text,
  add column if not exists linkedin_url text,
  add column if not exists portfolio_url text,
  add column if not exists headline text,
  add column if not exists profile_updated_at timestamptz;
