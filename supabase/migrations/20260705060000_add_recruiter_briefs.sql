-- Recruiter role briefs + candidate invite redemptions

alter table public.profiles
  add column if not exists account_type text not null default 'candidate'
  check (account_type in ('candidate', 'recruiter'));

create table if not exists public.role_briefs (
  id uuid primary key default gen_random_uuid(),
  recruiter_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  company text not null default '',
  description text not null default '',
  requirements text not null default '',
  invite_token text not null unique,
  status text not null default 'active' check (status in ('draft', 'active', 'closed')),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists role_briefs_recruiter_id_idx on public.role_briefs (recruiter_id);
create index if not exists role_briefs_invite_token_idx on public.role_briefs (invite_token);

create table if not exists public.invite_redemptions (
  id uuid primary key default gen_random_uuid(),
  brief_id uuid not null references public.role_briefs(id) on delete cascade,
  candidate_user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'started' check (status in ('started', 'completed', 'approved')),
  recruiter_notes text not null default '',
  redeemed_at timestamptz not null default now(),
  completed_at timestamptz,
  approved_at timestamptz,
  unique (brief_id, candidate_user_id)
);

create index if not exists invite_redemptions_brief_id_idx on public.invite_redemptions (brief_id);
create index if not exists invite_redemptions_candidate_user_id_idx on public.invite_redemptions (candidate_user_id);

alter table public.cv_drafts
  add column if not exists active_brief_id uuid references public.role_briefs(id) on delete set null;

alter table public.role_briefs enable row level security;
alter table public.invite_redemptions enable row level security;

create policy "Recruiters can view their own briefs"
  on public.role_briefs for select
  using (
    auth.uid() = recruiter_id
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.account_type = 'recruiter'
    )
  );

create policy "Recruiters can insert their own briefs"
  on public.role_briefs for insert
  with check (
    auth.uid() = recruiter_id
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.account_type = 'recruiter'
    )
  );

create policy "Recruiters can update their own briefs"
  on public.role_briefs for update
  using (
    auth.uid() = recruiter_id
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.account_type = 'recruiter'
    )
  );

create policy "Recruiters can view redemptions for their briefs"
  on public.invite_redemptions for select
  using (
    exists (
      select 1 from public.role_briefs b
      join public.profiles p on p.id = b.recruiter_id
      where b.id = invite_redemptions.brief_id
        and b.recruiter_id = auth.uid()
        and p.account_type = 'recruiter'
    )
  );

create policy "Recruiters can update redemptions for their briefs"
  on public.invite_redemptions for update
  using (
    exists (
      select 1 from public.role_briefs b
      join public.profiles p on p.id = b.recruiter_id
      where b.id = invite_redemptions.brief_id
        and b.recruiter_id = auth.uid()
        and p.account_type = 'recruiter'
    )
  );

create policy "Candidates can view their own redemptions"
  on public.invite_redemptions for select
  using (auth.uid() = candidate_user_id);

create policy "Candidates can insert their own redemptions"
  on public.invite_redemptions for insert
  with check (auth.uid() = candidate_user_id);

create policy "Candidates can update their own redemptions"
  on public.invite_redemptions for update
  using (auth.uid() = candidate_user_id);
