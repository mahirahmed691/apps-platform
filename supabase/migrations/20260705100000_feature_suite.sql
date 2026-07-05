-- Ceevie feature suite: versions, shares, exports, orgs, referrals, recruiter extensions

alter table public.profiles
  add column if not exists preferred_language text not null default 'en',
  add column if not exists coach_mode boolean not null default true,
  add column if not exists slow_speech_mode boolean not null default false,
  add column if not exists linkedin_auto_sync boolean not null default true,
  add column if not exists referral_code text unique,
  add column if not exists referred_by uuid references public.profiles(id) on delete set null,
  add column if not exists bonus_generations integer not null default 0,
  add column if not exists recruiter_plan text not null default 'free',
  add column if not exists org_id uuid;

alter table public.role_briefs
  add column if not exists brand_name text not null default '',
  add column if not exists logo_url text not null default '',
  add column if not exists accent_color text not null default '#ffffff',
  add column if not exists welcome_message text not null default '';

alter table public.invite_redemptions
  add column if not exists rejection_reason text not null default '',
  add column if not exists pipeline_stage text not null default 'applied',
  add column if not exists tags text[] not null default '{}',
  add column if not exists rejected_at timestamptz;

alter table public.invite_redemptions drop constraint if exists invite_redemptions_status_check;
alter table public.invite_redemptions
  add constraint invite_redemptions_status_check
  check (status in ('started', 'completed', 'approved', 'rejected'));

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  org_type text not null default 'team' check (org_type in ('team', 'agency', 'university')),
  seat_limit integer not null default 5,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  billing_plan text not null default 'free',
  created_at timestamptz not null default now()
);

create table if not exists public.org_members (
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member', 'recruiter')),
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

create table if not exists public.cv_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  label text not null,
  content text not null,
  cover_letter text not null default '',
  job_target text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists cv_versions_user_id_idx on public.cv_versions (user_id, created_at desc);

create table if not exists public.cv_exports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  export_type text not null check (export_type in ('cv', 'cover_letter', 'pdf', 'txt')),
  label text not null default '',
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists cv_exports_user_id_idx on public.cv_exports (user_id, created_at desc);

create table if not exists public.cv_shares (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  token text not null unique,
  content text not null,
  label text not null default 'Shared CV',
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists cv_shares_token_idx on public.cv_shares (token);

create table if not exists public.cv_review_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  status text not null default 'pending' check (status in ('pending', 'in_review', 'completed', 'cancelled')),
  created_at timestamptz not null default now()
);

create table if not exists public.bulk_invite_entries (
  id uuid primary key default gen_random_uuid(),
  brief_id uuid not null references public.role_briefs(id) on delete cascade,
  email text not null,
  invite_token text not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'accepted')),
  created_at timestamptz not null default now()
);

create index if not exists bulk_invite_entries_brief_id_idx on public.bulk_invite_entries (brief_id);

alter table public.profiles
  drop constraint if exists profiles_org_id_fkey;
alter table public.profiles
  add constraint profiles_org_id_fkey foreign key (org_id) references public.organizations(id) on delete set null;

alter table public.cv_versions enable row level security;
alter table public.cv_exports enable row level security;
alter table public.cv_shares enable row level security;
alter table public.cv_review_requests enable row level security;
alter table public.organizations enable row level security;
alter table public.org_members enable row level security;
alter table public.bulk_invite_entries enable row level security;

create policy "Users manage own cv versions"
  on public.cv_versions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage own cv exports"
  on public.cv_exports for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage own cv shares"
  on public.cv_shares for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Public can read active cv shares"
  on public.cv_shares for select
  using (expires_at is null or expires_at > now());

create policy "Users manage own review requests"
  on public.cv_review_requests for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Org members can view org"
  on public.organizations for select
  using (
    owner_id = auth.uid()
    or exists (
      select 1 from public.org_members m
      where m.org_id = organizations.id and m.user_id = auth.uid()
    )
  );

create policy "Org owners manage org"
  on public.organizations for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "Org members view membership"
  on public.org_members for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.organizations o
      where o.id = org_members.org_id and o.owner_id = auth.uid()
    )
  );

create policy "Recruiters manage bulk invites for own briefs"
  on public.bulk_invite_entries for all
  using (
    exists (
      select 1 from public.role_briefs b
      join public.profiles p on p.id = b.recruiter_id
      where b.id = bulk_invite_entries.brief_id
        and b.recruiter_id = auth.uid()
        and p.account_type = 'recruiter'
    )
  )
  with check (
    exists (
      select 1 from public.role_briefs b
      where b.id = bulk_invite_entries.brief_id and b.recruiter_id = auth.uid()
    )
  );
