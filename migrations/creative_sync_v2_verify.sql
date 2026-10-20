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
