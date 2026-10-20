-- KOMPASS cloud sync v2 (DRAFT; DO NOT EXECUTE UNTIL DATA BACKUP AND REVIEW)
-- Additive only. Existing kompass_grade_state remains unchanged.
create table if not exists public.kompass_creative_visits_v2 (
  grade smallint not null check (grade in (5,6,7)),
  visit_key text not null,
  pupil_id text not null,
  activity_id text not null,
  visit jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid(),
  primary key (grade,visit_key)
);
create table if not exists public.kompass_creative_assessments_v2 (
  grade smallint not null check (grade in (5,6,7)),
  record_key text not null,
  pupil_id text not null,
  activity_id text not null,
  assessment jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid(),
  primary key (grade,record_key)
);
alter table public.kompass_creative_visits_v2 enable row level security;
alter table public.kompass_creative_assessments_v2 enable row level security;
grant select,insert,update on public.kompass_creative_visits_v2 to authenticated;
grant select,insert,update on public.kompass_creative_assessments_v2 to authenticated;
create policy creative_visits_read_v2 on public.kompass_creative_visits_v2
  for select to authenticated using (public.has_kompass_grade_access(grade,'teacher'));
create policy creative_visits_insert_v2 on public.kompass_creative_visits_v2
  for insert to authenticated with check (public.has_kompass_grade_access(grade,'teacher'));
create policy creative_visits_update_v2 on public.kompass_creative_visits_v2
  for update to authenticated
  using (public.has_kompass_grade_access(grade,'teacher'))
  with check (public.has_kompass_grade_access(grade,'teacher'));
create policy creative_assessments_read_v2 on public.kompass_creative_assessments_v2
  for select to authenticated using (public.has_kompass_grade_access(grade,'teacher'));
create policy creative_assessments_insert_v2 on public.kompass_creative_assessments_v2
  for insert to authenticated with check (public.has_kompass_grade_access(grade,'teacher'));
create policy creative_assessments_update_v2 on public.kompass_creative_assessments_v2
  for update to authenticated
  using (public.has_kompass_grade_access(grade,'teacher'))
  with check (public.has_kompass_grade_access(grade,'teacher'));
-- No deletion policies: historical visits remain protected.
-- Backfill requires separate idempotent migration after backup and field inspection.
