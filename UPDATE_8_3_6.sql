-- KOMPASS 8.3.6 – konkrete Coachinggruppen je Stufe
-- Einmal im Supabase SQL Editor ausführen.
alter table public.kompass_profiles
  add column if not exists coach_teams jsonb not null default '{}'::jsonb,
  add column if not exists coaching_groups jsonb not null default '{}'::jsonb;
