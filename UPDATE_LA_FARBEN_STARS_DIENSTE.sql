begin;
with source as (
  select l.grade,
    jsonb_agg(
      lp.pupil || jsonb_strip_nulls(jsonb_build_object(
        'team', gp.pupil->'team',
        'laStars', gp.pupil->'laStars',
        'laDuties', gp.pupil->'laDuties'
      )) order by lp.ordinality
    ) as pupils
  from public.kompass_lernatelier_state l
  cross join lateral jsonb_array_elements(l.payload->'pupils') with ordinality as lp(pupil,ordinality)
  join public.kompass_grade_state g on g.grade=l.grade
  left join lateral jsonb_array_elements(g.payload->'pupils') gp(pupil)
    on gp.pupil->>'id'=lp.pupil->>'id'
  group by l.grade
)
update public.kompass_lernatelier_state l
set payload=jsonb_set(l.payload,'{pupils}',s.pupils),updated_at=now()
from source s where s.grade=l.grade;
commit;