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
