-- KOMPASS: atomare, auf LA-Felder begrenzte Schreibfunktion
-- Einmalig im Supabase SQL Editor ausfuehren.
begin;
drop policy if exists "lernatelier insert" on public.kompass_lernatelier_state;
drop policy if exists "lernatelier update" on public.kompass_lernatelier_state;
-- Die Browser-App schreibt nie ganze LA-Datensaetze zurueck.
create or replace function public.kompass_la_change(
 p_grade smallint, p_pupil_id text, p_action text, p_value text default null
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
 v_role text;
 v_payload jsonb;
 v_pupils jsonb;
 v_pupil jsonb;
 v_new jsonb;
 v_index integer;
 v_place text;
 v_request jsonb;
begin
 select role into v_role from public.kompass_profiles
 where id=auth.uid() and active=true;
 if v_role is null or v_role not in ('admin','teacher','lernatelier')
    or not public.can_access_lernatelier(p_grade) then
   raise exception 'Kein Zugriff auf dieses Lernatelier';
 end if;
 if p_action not in ('request','help','place','approve','deny') then
   raise exception 'Ungueltige Lernatelier-Aktion';
 end if;
 if p_pupil_id is null or length(p_pupil_id)>128 then
   raise exception 'Ungueltige Schuelerkennung';
 end if;
 select payload into v_payload from public.kompass_lernatelier_state
 where grade=p_grade for update;
 if v_payload is null then raise exception 'Lernatelier-Daten fehlen'; end if;
 v_pupils=coalesce(v_payload->'pupils','[]'::jsonb);
 select ordinality-1 into v_index
 from jsonb_array_elements(v_pupils) with ordinality as t(p,ordinality)
 where p->>'id'=p_pupil_id limit 1;
 if v_index is null then raise exception 'Schueler nicht gefunden'; end if;
 v_pupil=v_pupils->v_index;
 if coalesce(v_pupil->>'archived','false')='true' then
   raise exception 'Archivierter Schueler';
 end if;
 v_new=v_pupil;
 if p_action in ('request','place') then
   v_place=trim(coalesce(p_value,''));
   if length(v_place)<1 or length(v_place)>90 then
     raise exception 'Ungueltiger Lernort';
   end if;
   if p_action='request' then
     v_new=jsonb_set(v_new,'{laRequest}',
       jsonb_build_object('place',v_place,'status','pending','at',now()),true);
   else
     v_new=jsonb_set(v_new,'{learningPlace}',to_jsonb(v_place),true);
     v_new=v_new-'laRequest';
   end if;
 elsif p_action='help' then
   if p_value not in ('true','false') then raise exception 'Ungueltiger Hilfestatus'; end if;
   v_new=jsonb_set(v_new,'{laNeedsHelp}',to_jsonb(p_value='true'),true);
 else
   v_request=v_pupil->'laRequest';
   if v_request is null or v_request->>'status'<>'pending' then
     raise exception 'Keine offene Anfrage';
   end if;
   if p_action='approve' then
     v_place=v_request->>'place';
     if v_place is null then raise exception 'Lernort fehlt'; end if;
     v_new=jsonb_set(v_new,'{learningPlace}',to_jsonb(v_place),true);
   end if;
   v_new=jsonb_set(v_new,'{laRequest}',
     v_request||jsonb_build_object('status',
       case when p_action='approve' then 'approved' else 'denied' end,
       'decidedAt',now()),true);
 end if;
 v_pupils=jsonb_set(v_pupils,array[v_index::text],v_new,false);
 update public.kompass_lernatelier_state
 set payload=jsonb_set(v_payload,'{pupils}',v_pupils,false),
     updated_at=now()
 where grade=p_grade;
 return v_new;
end;
$$;
revoke all on function public.kompass_la_change(smallint,text,text,text) from public;
grant execute on function public.kompass_la_change(smallint,text,text,text) to authenticated;
commit;
