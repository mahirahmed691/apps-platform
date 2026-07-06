-- Track one-time studio setup (profile basics + optional voice intro) per user.

alter table public.profiles
  add column if not exists studio_setup_completed_at timestamptz;

-- Existing users with saved interview progress should not see setup again.
update public.profiles p
set studio_setup_completed_at = coalesce(p.studio_setup_completed_at, d.updated_at, now())
from public.cv_drafts d
where d.user_id = p.id
  and jsonb_array_length(coalesce(d.messages, '[]'::jsonb)) > 1
  and p.studio_setup_completed_at is null;
