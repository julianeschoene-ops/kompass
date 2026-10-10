begin;
create or replace function public.kompass_la_assign_week(p_grade smallint,p_week text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
 v_role text; v_payload jsonb; v_history jsonb; v_assign jsonb:='{}'::jsonb;
 v_people jsonb; v_duty text; v_room text; v_team text; v_id text;
 v_used text[]:='{}'; v_teams text[]; v_count integer; v_slot integer;
 v_pupil jsonb; v_new jsonb:='[]'::jsonb;
begin
 select role into v_role from public.kompass_profiles where id=auth.uid() and active=true;
 if v_role not in ('admin','teacher') or not public.can_access_lernatelier(p_grade)
 then raise exception 'Nur Lehrkraefte koennen Dienste einteilen'; end if;
 if p_week !~ '^20[0-9]{2}-W[0-9]{2}$' then raise exception 'Ungueltige Kalenderwoche'; end if;
 select payload into v_payload from public.kompass_lernatelier_state where grade=p_grade for update;
 if v_payload is null then raise exception 'Lernatelier nicht gefunden'; end if;
 v_history:=coalesce(v_payload->'dutyHistory','{}'::jsonb);
 if v_history ? p_week then return v_history->p_week; end if;
 v_people:=coalesce(v_payload->'pupils','[]'::jsonb);
 foreach v_room in array array['LA 1','LA 2','LA 3'] loop
  foreach v_duty in array array['broom','book','hall','trash'] loop
   v_teams:='{}';
   for v_slot in 1..3 loop
    select p->>'id',p->>'team' into v_id,v_team
    from jsonb_array_elements(v_people) p
    where p->>'learningAtelier'=v_room
      and coalesce(p->>'archived','false')<>'true'
      and nullif(p->>'team','') is not null
      and not (p->>'id'=any(v_used))
      and not (p->>'team'=any(v_teams))
    order by (
      select count(*) from jsonb_each(v_history) h
      where h.value->'assignments'->(p->>'id') ? v_duty
    ),(
      select count(*) from jsonb_each(v_history) h
      where h.value->'assignments' ? (p->>'id')
    ),p->>'id'
    limit 1;
    exit when v_id is null;
    v_assign:=jsonb_set(v_assign,array[v_id],jsonb_build_array(v_duty),true);
    v_used:=array_append(v_used,v_id);
    v_teams:=array_append(v_teams,v_team);
    v_id:=null;
   end loop;
  end loop;
 end loop;
 select coalesce(jsonb_agg(
  jsonb_set(p,'{laDuties}',coalesce(v_assign->(p->>'id'),'[]'::jsonb),true)
  order by ord
 ),'[]'::jsonb) into v_new
 from jsonb_array_elements(v_people) with ordinality t(p,ord);
 v_history:=jsonb_set(v_history,array[p_week],jsonb_build_object('createdAt',now(),'assignments',v_assign),true);
 update public.kompass_lernatelier_state
 set payload=jsonb_set(jsonb_set(v_payload,'{pupils}',v_new),'{dutyHistory}',v_history),updated_at=now()
 where grade=p_grade;
 return v_history->p_week;
end;
$$;
revoke all on function public.kompass_la_assign_week(smallint,text) from public;
grant execute on function public.kompass_la_assign_week(smallint,text) to authenticated;
commit;