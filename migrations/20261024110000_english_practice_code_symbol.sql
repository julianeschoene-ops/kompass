BEGIN;
CREATE TABLE public.kompass_english_logins (
 grade smallint NOT NULL,pupil_id text NOT NULL,code text NOT NULL UNIQUE CHECK(code ~ '^[0-9]{4}$'),
 symbol text NOT NULL CHECK(symbol IN ('fox','panda','frog','lion','penguin','turtle','dolphin','butterfly','bee','owl','rabbit','cat','dog','koala','octopus','unicorn')),
 failed_attempts integer NOT NULL DEFAULT 0,blocked_until timestamptz,
 PRIMARY KEY(grade,pupil_id),FOREIGN KEY(grade,pupil_id) REFERENCES public.kompass_english_links(grade,pupil_id) ON DELETE CASCADE
);
CREATE TABLE public.kompass_english_login_throttle (id boolean PRIMARY KEY DEFAULT true CHECK(id),window_start timestamptz NOT NULL DEFAULT clock_timestamp(),failures integer NOT NULL DEFAULT 0);
INSERT INTO public.kompass_english_login_throttle(id) VALUES(true);
ALTER TABLE public.kompass_english_logins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kompass_english_login_throttle ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.kompass_english_logins,public.kompass_english_login_throttle FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.kompass_english_batch_logins(p_grade smallint,p_pupil_ids text[],p_rotate boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE pupil text;out_rows jsonb:='[]';entry public.kompass_english_logins;candidate text;symbol_pool text[]:=ARRAY['fox','panda','frog','lion','penguin','turtle','dolphin','butterfly','bee','owl','rabbit','cat','dog','koala','octopus','unicorn'];
BEGIN
 IF NOT public.kompass_english_teacher_access(p_grade,true) THEN RAISE EXCEPTION 'Keine Berechtigung zur Zugangsverwaltung.' USING ERRCODE='42501';END IF;
 IF p_pupil_ids IS NULL OR cardinality(p_pupil_ids) NOT BETWEEN 1 AND 500 THEN RAISE EXCEPTION 'Bitte 1 bis 500 Kinder auswählen.';END IF;
 PERFORM pg_advisory_xact_lock(hashtext('kompass_english_short_codes'));
 FOR pupil IN SELECT DISTINCT unnest(p_pupil_ids) ORDER BY 1 LOOP
  IF NOT EXISTS(SELECT 1 FROM public.kompass_grade_state gs CROSS JOIN LATERAL jsonb_array_elements(gs.payload->'pupils') p WHERE gs.grade=p_grade AND p->>'id'=pupil AND coalesce((p->>'archived')::boolean,false) IS NOT TRUE) THEN RAISE EXCEPTION 'Kind nicht in diesem Jahrgang gefunden.';END IF;
  PERFORM public.kompass_english_get_access(p_grade,pupil,p_rotate);
  SELECT * INTO entry FROM public.kompass_english_logins WHERE grade=p_grade AND pupil_id=pupil;
  IF NOT FOUND OR p_rotate THEN
   IF (SELECT count(*) FROM public.kompass_english_logins)>=10000 THEN RAISE EXCEPTION 'Keine freien Zugangscodes.';END IF;
   LOOP
    candidate:=lpad(((('x'||substr(replace(gen_random_uuid()::text,'-',''),1,8))::bit(32)::bigint)%10000)::text,4,'0');
    EXIT WHEN NOT EXISTS(SELECT 1 FROM public.kompass_english_logins WHERE code=candidate);
   END LOOP;
   INSERT INTO public.kompass_english_logins(grade,pupil_id,code,symbol) VALUES(p_grade,pupil,candidate,symbol_pool[1+floor(random()*array_length(symbol_pool,1))::integer])
   ON CONFLICT(grade,pupil_id) DO UPDATE SET code=excluded.code,symbol=excluded.symbol,failed_attempts=0,blocked_until=NULL RETURNING * INTO entry;
  END IF;
  out_rows:=out_rows||jsonb_build_array(jsonb_build_object('pupil_id',pupil,'code',entry.code,'symbol',entry.symbol));
 END LOOP;
 RETURN out_rows;
END $$;
REVOKE ALL ON FUNCTION public.kompass_english_batch_logins(smallint,text[],boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.kompass_english_batch_logins(smallint,text[],boolean) TO authenticated;
CREATE OR REPLACE FUNCTION public.kompass_english_login(p_code text,p_symbol text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE entry public.kompass_english_logins;l public.kompass_english_links;throttle public.kompass_english_login_throttle;first_name text;bad jsonb:=jsonb_build_object('ok',false,'message','Code oder Symbol stimmt nicht. Bitte prüfe deine Zugangskarte oder frage deine Lehrkraft.');
BEGIN
 SELECT * INTO STRICT throttle FROM public.kompass_english_login_throttle WHERE id FOR UPDATE;
 IF throttle.window_start<clock_timestamp()-interval '1 minute' THEN UPDATE public.kompass_english_login_throttle SET window_start=clock_timestamp(),failures=0 WHERE id;throttle.failures:=0;END IF;
 IF throttle.failures>=100 THEN RETURN bad;END IF;
 SELECT * INTO entry FROM public.kompass_english_logins WHERE code=p_code FOR UPDATE;
 IF NOT FOUND OR p_code IS NULL OR p_code!~'^[0-9]{4}$' THEN UPDATE public.kompass_english_login_throttle SET failures=failures+1 WHERE id;RETURN bad;END IF;
 IF entry.blocked_until>clock_timestamp() THEN RETURN bad;END IF;
 SELECT * INTO l FROM public.kompass_english_links WHERE grade=entry.grade AND pupil_id=entry.pupil_id AND active;
 IF NOT FOUND OR p_symbol IS DISTINCT FROM entry.symbol THEN
  UPDATE public.kompass_english_logins SET failed_attempts=CASE WHEN blocked_until<=clock_timestamp() THEN 1 ELSE failed_attempts+1 END,blocked_until=CASE WHEN (CASE WHEN blocked_until<=clock_timestamp() THEN 1 ELSE failed_attempts+1 END)>=3 THEN clock_timestamp()+interval '5 minutes' ELSE NULL END WHERE grade=entry.grade AND pupil_id=entry.pupil_id;
  UPDATE public.kompass_english_login_throttle SET failures=failures+1 WHERE id;RETURN bad;
 END IF;
 SELECT p->>'first' INTO first_name FROM public.kompass_grade_state gs CROSS JOIN LATERAL jsonb_array_elements(gs.payload->'pupils') p WHERE gs.grade=entry.grade AND p->>'id'=entry.pupil_id AND coalesce((p->>'archived')::boolean,false) IS NOT TRUE;
 IF first_name IS NULL OR l.print_token IS NULL OR l.print_pin IS NULL THEN RETURN bad;END IF;
 UPDATE public.kompass_english_logins SET failed_attempts=0,blocked_until=NULL WHERE grade=entry.grade AND pupil_id=entry.pupil_id;
 RETURN jsonb_build_object('ok',true,'first_name',first_name,'token',l.print_token,'pin',l.print_pin);
END $$;
REVOKE ALL ON FUNCTION public.kompass_english_login(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kompass_english_login(text,text) TO anon,authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
