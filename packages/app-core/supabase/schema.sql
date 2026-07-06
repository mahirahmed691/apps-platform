-- ============================================================
-- Shared Starter Kit — Core Schema
-- Reusable across every "AI wrapper + Stripe" app you build.
-- Apply via Supabase SQL editor or `supabase db push`.
-- ============================================================

-- ---------- Profiles (extends Supabase auth.users) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now(),
  stripe_customer_id text unique,
  plan text not null default 'free',              -- 'free' | 'active' | 'past_due' | 'canceled'
  plan_updated_at timestamptz not null default now(),
  full_name text,
  phone text,
  location text,
  linkedin_url text,
  portfolio_url text,
  headline text,
  profile_updated_at timestamptz,
  studio_setup_completed_at timestamptz
);

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create a profile row whenever a new auth user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ---------- Usage events (every AI call, for cost tracking) ----------
create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  feature text not null,               -- e.g. 'cv_tailor', 'quote_generator'
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  estimated_cost_usd numeric(10,6) not null default 0,
  latency_ms int,
  status text not null default 'success', -- 'success' | 'error' | 'timeout' | 'rate_limited'
  error_detail text,
  created_at timestamptz not null default now()
);

alter table public.usage_events enable row level security;

create policy "Users can view their own usage"
  on public.usage_events for select
  using (auth.uid() = user_id);

-- Service role (server-side) does all inserts — no insert policy for anon/authenticated.

create index if not exists idx_usage_events_user_created
  on public.usage_events (user_id, created_at desc);

create index if not exists idx_usage_events_created
  on public.usage_events (created_at desc);


-- ---------- Rate limiting counters (per user, per day) ----------
create table if not exists public.rate_limits (
  user_id uuid not null references public.profiles(id) on delete cascade,
  day date not null default current_date,
  request_count int not null default 0,
  primary key (user_id, day)
);

alter table public.rate_limits enable row level security;

create policy "Users can view their own rate limit"
  on public.rate_limits for select
  using (auth.uid() = user_id);


-- ---------- Stripe webhook idempotency ----------
-- Prevents double-processing if Stripe retries a webhook delivery.
create table if not exists public.stripe_webhook_events (
  stripe_event_id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now()
);

-- No RLS needed — only ever touched by the service role from the webhook handler.


-- ---------- Cost/spend alert threshold config ----------
-- One row per app instance; lets you tune limits without redeploying code.
create table if not exists public.app_config (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

insert into public.app_config (key, value) values
  ('daily_spend_alert_usd', '5.0'),
  ('free_tier_daily_requests', '5'),
  ('paid_tier_daily_requests', '100'),
  ('ai_generation_enabled', 'true'),     -- kill switch: flip to 'false' to disable AI calls instantly
  ('cv_chat_daily_requests', '12')       -- soft limit for conversational follow-ups (logged separately)
on conflict (key) do nothing;


-- ---------- CV drafts (per-user conversation state) ----------
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
