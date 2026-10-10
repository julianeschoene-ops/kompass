begin;
create or replace function public.kompass_la_publish(
 p_grade smallint,
 p_daily_board jsonb default '{}'::jsonb,
 p_places jsonb default '{}'::jsonb,
 p_noise jsonb default '{}'::jsonb,
 p_calendar jsonb default '[]'::jsonb
) returns void
language plpgsql security definer set search_path=public
as $$
declare v_role text; v_payload jsonb;
begin
 select role into v_role from public.kompass_profiles
 where id=auth.uid() and active=true;
 if v_role not in ('admin','teacher')
    or not public.has_kompass_grade_access(p_grade,'leitung') then
   raise exception 'Nur Stufenleitung darf Lernatelier-Infos veröffentlichen';
 end if;
 if jsonb_typeof(p_daily_board)<>'object'
    or jsonb_typeof(p_places)<>'object'
    or jsonb_typeof(p_noise)<>'object'
    or jsonb_typeof(p_calendar)<>'array' then
   raise exception 'Ungueltiges Format';
 end if;
 if pg_column_size(p_daily_board)>100000 or pg_column_size(p_calendar)>100000 then
   raise exception 'Lernatelier-Daten zu gross';
 end if;
 select payload into v_payload from public.kompass_lernatelier_state
 where grade=p_grade for update;
 if v_payload is null then raise exception 'Lernatelier-Daten fehlen'; end if;
 update public.kompass_lernatelier_state
 set payload=jsonb_set(jsonb_set(jsonb_set(jsonb_set(
       v_payload,'{dailyBoard}',p_daily_board,true),
       '{places}',p_places,true),'{noise}',p_noise,true),
       '{calendarEvents}',p_calendar,true),
     updated_at=now()
 where grade=p_grade;
end;
$$;
revoke all on function public.kompass_la_publish(smallint,jsonb,jsonb,jsonb,jsonb) from public;
grant execute on function public.kompass_la_publish(smallint,jsonb,jsonb,jsonb,jsonb) to authenticated;
commit;