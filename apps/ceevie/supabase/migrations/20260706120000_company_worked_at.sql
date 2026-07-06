-- Track employers the candidate has worked at (distinct from follows / targets)

create table if not exists company_worked_at (
  user_id uuid not null references profiles(id) on delete cascade,
  company_id text not null references companies(id) on delete cascade,
  role_title text not null default '',
  created_at timestamptz not null default now(),
  primary key (user_id, company_id)
);

create index if not exists company_worked_at_user_id_idx on company_worked_at(user_id);

alter table company_worked_at enable row level security;

create policy "Users read own company work history"
  on company_worked_at for select
  using (auth.uid() = user_id);

create policy "Users manage own company work history"
  on company_worked_at for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
