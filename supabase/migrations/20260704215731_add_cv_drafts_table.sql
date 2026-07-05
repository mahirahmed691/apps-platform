-- cv_drafts table + chat daily limit config (applied via Supabase MCP 2026-07-04)

insert into public.app_config (key, value) values
  ('cv_chat_daily_requests', '12')
on conflict (key) do nothing;

create table if not exists public.cv_drafts (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  answers jsonb not null default '{}',
  messages jsonb not null default '[]',
  finished boolean not null default false,
  turn_count int not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.cv_drafts enable row level security;

create policy "Users can view their own cv draft"
  on public.cv_drafts for select
  using (auth.uid() = user_id);

create policy "Users can insert their own cv draft"
  on public.cv_drafts for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own cv draft"
  on public.cv_drafts for update
  using (auth.uid() = user_id);

create policy "Users can delete their own cv draft"
  on public.cv_drafts for delete
  using (auth.uid() = user_id);
