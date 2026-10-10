-- KOMPASS: Lernatelier-Erstbefuellung (keine bestehenden Zeilen ueberschreiben)
begin;
insert into public.kompass_lernatelier_state (grade,payload,updated_at)
select g.grade,
jsonb_build_object('pupils',coalesce((
 select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
 'id',p->>'id','first',p->>'first','last',p->>'last',
 'short',p->>'short','className',p->>'className',
 'year',p->'year','archived',p->'archived',
 'learningAtelier',p->>'learningAtelier',
 'graduation',p->>'graduation',
 'learningPlace',p->>'learningPlace',
 'laNeedsHelp',p->'laNeedsHelp','laRequest',p->'laRequest'
 )))
 from jsonb_array_elements(coalesce(g.payload->'pupils','[]'::jsonb)) as p
),'[]'::jsonb)),now()
from public.kompass_grade_state g
where g.grade in (5,6,7)
on conflict (grade) do nothing;
commit;
select grade,jsonb_array_length(coalesce(payload->'pupils','[]'::jsonb)) as schuelerzahl
from public.kompass_lernatelier_state order by grade;
