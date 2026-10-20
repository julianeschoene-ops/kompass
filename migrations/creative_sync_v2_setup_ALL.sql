-- KOMPASS V2 deployment: review and back up existing grade/shared state first.
-- Run this file once in Supabase SQL Editor; it is additive and does not delete old records.

-- SECTION 1
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
drop policy if exists creative_visits_read_v2 on public.kompass_creative_visits_v2;
create policy creative_visits_read_v2 on public.kompass_creative_visits_v2
  for select to authenticated using (public.has_kompass_grade_access(grade,'teacher'));
drop policy if exists creative_visits_insert_v2 on public.kompass_creative_visits_v2;
create policy creative_visits_insert_v2 on public.kompass_creative_visits_v2
  for insert to authenticated with check (public.has_kompass_grade_access(grade,'teacher'));
drop policy if exists creative_visits_update_v2 on public.kompass_creative_visits_v2;
create policy creative_visits_update_v2 on public.kompass_creative_visits_v2
  for update to authenticated
  using (public.has_kompass_grade_access(grade,'teacher'))
  with check (public.has_kompass_grade_access(grade,'teacher'));
drop policy if exists creative_assessments_read_v2 on public.kompass_creative_assessments_v2;
create policy creative_assessments_read_v2 on public.kompass_creative_assessments_v2
  for select to authenticated using (public.has_kompass_grade_access(grade,'teacher'));
drop policy if exists creative_assessments_insert_v2 on public.kompass_creative_assessments_v2;
create policy creative_assessments_insert_v2 on public.kompass_creative_assessments_v2
  for insert to authenticated with check (public.has_kompass_grade_access(grade,'teacher'));
drop policy if exists creative_assessments_update_v2 on public.kompass_creative_assessments_v2;
create policy creative_assessments_update_v2 on public.kompass_creative_assessments_v2
  for update to authenticated
  using (public.has_kompass_grade_access(grade,'teacher'))
  with check (public.has_kompass_grade_access(grade,'teacher'));
-- No deletion policies: historical visits remain protected.
-- Backfill requires separate idempotent migration after backup and field inspection.


-- SECTION 2
-- Run only after reviewing and exporting kompass_grade_state and kompass_shared_state.
-- Idempotent import of existing Kreativband entries into v2.
-- Never deletes legacy rows; never overwrites v2 edits.
begin;
insert into public.kompass_creative_visits_v2
  (grade,visit_key,pupil_id,activity_id,visit)
select g.grade,v.key,v.value->>'pupilId',v.value->>'activityId',v.value
from public.kompass_grade_state g
cross join lateral jsonb_each(
  case when jsonb_typeof(g.payload->'dailyCreativeVisits')='object'
    then g.payload->'dailyCreativeVisits' else '{}'::jsonb end
) v
where nullif(v.value->>'pupilId','') is not null
  and nullif(v.value->>'activityId','') is not null
on conflict (grade,visit_key) do nothing;

insert into public.kompass_creative_assessments_v2
  (grade,record_key,pupil_id,activity_id,assessment)
select g.grade,r.key,r.value->>'pupilId',r.value->>'activityId',r.value->'creativeAssessment'
from public.kompass_grade_state g
cross join lateral jsonb_each(
  case when jsonb_typeof(g.payload->'activityRecords')='object'
    then g.payload->'activityRecords' else '{}'::jsonb end
) r
where jsonb_typeof(r.value->'creativeAssessment')='object'
  and nullif(r.value->>'pupilId','') is not null
  and nullif(r.value->>'activityId','') is not null
on conflict (grade,record_key) do nothing;
commit;

-- Compare with the original JSONB counts before activating the new client.
select grade,count(*) as v2_visits from public.kompass_creative_visits_v2 group by grade order by grade;


-- SECTION 3
-- KOMPASS creative v2 migration verification (read-only)
-- Run after schema and backfill scripts, before deploying the new client.
with legacy as (
 select grade,
   (select count(*) from jsonb_each(case when jsonb_typeof(payload->'dailyCreativeVisits')='object' then payload->'dailyCreativeVisits' else '{}'::jsonb end)) as visits,
   (select count(*) from jsonb_each(case when jsonb_typeof(payload->'activityRecords')='object' then payload->'activityRecords' else '{}'::jsonb end) a
      where jsonb_typeof(a.value->'creativeAssessment')='object') as assessments
 from public.kompass_grade_state
), migrated as (
 select grade,count(*) as visits from public.kompass_creative_visits_v2 group by grade
), rated as (
 select grade,count(*) as assessments from public.kompass_creative_assessments_v2 group by grade
)
select l.grade,l.visits as legacy_visits,coalesce(m.visits,0) as new_visits,
 l.assessments as legacy_assessments,coalesce(r.assessments,0) as new_assessments,
 (coalesce(m.visits,0)>=l.visits and coalesce(r.assessments,0)>=l.assessments) as counts_ok
from legacy l left join migrated m using(grade) left join rated r using(grade)
order by l.grade;
