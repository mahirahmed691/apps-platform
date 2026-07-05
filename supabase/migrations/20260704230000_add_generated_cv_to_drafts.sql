-- Store the last generated CV so users don't lose it on refresh.
alter table public.cv_drafts
  add column if not exists generated_cv text;
