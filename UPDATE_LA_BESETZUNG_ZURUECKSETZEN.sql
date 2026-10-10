begin;
create or replace function public.kompass_la_reset_room(p_grade smallint,p_room text)
returns integer language plpgsql security definer set search_path=public as $$
declare v_role text; v_payload jsonb; v_pupils jsonb; v_updated jsonb; v_count integer;
begin
 select role into v_role from public.kompass_profiles where id=auth.uid() and active=true;
 if v_role not in ('teacher','admin','lernatelier') or not public.can_access_lernatelier(p_grade)
 then raise exception 'Kein Zugriff'; end if;
 if p_room not in ('LA 1','LA 2','LA 3') then raise exception 'Ungueltiges Lernatelier'; end if;
 select payload into v_payload from public.kompass_lernatelier_state where grade=p_grade for update;
 if v_payload is null then raise exception 'Lernatelier nicht gefunden'; end if;
 select count(*) into v_count from jsonb_array_elements(coalesce(v_payload->'pupils','[]'::jsonb)) x
 where x->>'learningAtelier'=p_room and coalesce(x->>'archived','false')<>'true'
 and (coalesce(x->>'learningPlace','Lernatelier')<>'Lernatelier' or x ? 'laRequest');
 select coalesce(jsonb_agg(case
  when x->>'learningAtelier'=p_room and coalesce(x->>'archived','false')<>'true'
  then jsonb_set(x-'laRequest','{learningPlace}',to_jsonb('Lernatelier'::text),true)
  else x end order by ord),'[]'::jsonb) into v_updated
 from jsonb_array_elements(coalesce(v_payload->'pupils','[]'::jsonb)) with ordinality t(x,ord);
 update public.kompass_lernatelier_state
 set payload=jsonb_set(v_payload,'{pupils}',v_updated),updated_at=now() where grade=p_grade;
 return v_count;
end;
$$;
revoke all on function public.kompass_la_reset_room(smallint,text) from public;
grant execute on function public.kompass_la_reset_room(smallint,text) to authenticated;
commit;