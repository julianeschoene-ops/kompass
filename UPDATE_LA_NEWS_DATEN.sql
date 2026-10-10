begin;
with school as (
  select payload from public.kompass_shared_state where id='school'
), updates as (
  select l.grade,
    coalesce(s.payload->'settings'->(
      case when l.grade=6 then 'laDailyBoard'
           else 'laDailyBoardGrade'||l.grade::text end
    ),'{}'::jsonb) as board,
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'date',e->>'date','endDate',e->>'endDate',
        'title',e->>'title','time',e->>'time',
        'location',e->>'location'
      ))
      from jsonb_array_elements(coalesce(s.payload->'calendarEvents','[]'::jsonb)) e
      where coalesce(e->>'visibility','all') in ('all','students')
        and (e->>'grade' is null or e->>'grade'='all' or e->>'grade'=l.grade::text)
    ),'[]'::jsonb) as events
  from public.kompass_lernatelier_state l cross join school s
)
update public.kompass_lernatelier_state l
set payload=jsonb_set(jsonb_set(l.payload,'{dailyBoard}',u.board),'{calendarEvents}',u.events),
    updated_at=now()
from updates u where u.grade=l.grade;
commit;