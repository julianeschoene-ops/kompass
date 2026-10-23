-- Personal QR + PIN, batch printing and direct competency evidence.
BEGIN;
ALTER TABLE public.kompass_english_links
  ADD COLUMN IF NOT EXISTS pin_hash text,
  ADD COLUMN IF NOT EXISTS print_token text,
  ADD COLUMN IF NOT EXISTS print_pin text,
  ADD COLUMN IF NOT EXISTS failed_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS blocked_until timestamptz;
ALTER TABLE public.kompass_english_results ADD COLUMN IF NOT EXISTS competency_id text;

CREATE TABLE IF NOT EXISTS public.kompass_english_tasks (
  task_key text PRIMARY KEY,
  title text NOT NULL,
  unit smallint NOT NULL CHECK (unit BETWEEN 1 AND 6),
  competency_id text NOT NULL
);
ALTER TABLE public.kompass_english_tasks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.kompass_english_tasks FROM anon, authenticated;
GRANT SELECT ON public.kompass_english_tasks TO authenticated;
CREATE POLICY english_tasks_teacher_read ON public.kompass_english_tasks FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.kompass_profiles p WHERE p.id=auth.uid() AND p.active AND p.role<>'lernatelier'));

-- Orange Line 1 vocabulary belongs to the existing year-5 competency curriculum,
-- including when the learner is in year 6. Do not infer curriculum from pupil grade.
INSERT INTO public.kompass_english_tasks(task_key,title,unit,competency_id) VALUES
 ('vocab:u1-1','Unit 1 · List #1 · School life – Check in',1,'eng5_1'),
 ('vocab:u1-2','Unit 1 · List #2 · School life – Classroom',1,'eng5_1'),
 ('vocab:u1-3','Unit 1 · List #3 · School life – People & places',1,'eng5_1'),
 ('vocab:u1-4','Unit 1 · List #4 · School life – School day',1,'eng5_1'),
 ('vocab:u1-5','Unit 1 · List #5 · School life – My school',1,'eng5_1'),
 ('vocab:u2-5','Unit 2 · List #5 · Family – Check in',2,'eng5_2'),
 ('vocab:u2-6','Unit 2 · List #6 · Family – People',2,'eng5_2'),
 ('vocab:u2-7','Unit 2 · List #7 · Home – Rooms',2,'eng5_2'),
 ('vocab:u2-8','Unit 2 · List #8 · Home – My room',2,'eng5_2'),
 ('vocab:u2-9','Unit 2 · List #9 · Home – Things at home',2,'eng5_2'),
 ('vocab:u3-10','Unit 3 · List #10 · Daily life – Check in',3,'eng5_4'),
 ('vocab:u3-11','Unit 3 · List #11 · Free time',3,'eng5_4'),
 ('vocab:u3-12','Unit 3 · List #12 · My routine',3,'eng5_4'),
 ('vocab:u3-13','Unit 3 · List #13 · Reading & listening',3,'eng5_4'),
 ('vocab:u3-14','Unit 3 · List #14 · Daily life – Reading',3,'eng5_4'),
 ('vocab:15','Unit 4 · List #15 · Check in – Town',4,'eng5_5'),
 ('vocab:16','Unit 4 · List #16 · Where and when?',4,'eng5_5'),
 ('vocab:17','Unit 4 · List #17 · Getting around',4,'eng5_5'),
 ('vocab:18','Unit 4 · List #18 · Viewing – Getting around',4,'eng5_5'),
 ('vocab:19','Unit 4 · List #19 · Reading – News',4,'eng5_5')
 ON CONFLICT(task_key) DO NOTHING;

-- Keep printable credentials behind privileged RPCs. No table SELECT grant
-- exposes either the printable QR token or PIN to learners or teachers.
CREATE OR REPLACE FUNCTION public.kompass_english_get_access(p_grade smallint,p_pupil_id text,p_rotate boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v public.kompass_english_links; v_token text; v_pin text;
BEGIN
 IF NOT public.kompass_english_teacher_access(p_grade,true) THEN
  RAISE EXCEPTION 'Keine Berechtigung zur Codeverwaltung.' USING ERRCODE='42501';
 END IF;
 SELECT * INTO v FROM public.kompass_english_links WHERE grade=p_grade AND pupil_id=p_pupil_id FOR UPDATE;
 IF FOUND AND NOT v.active AND NOT p_rotate THEN
  RAISE EXCEPTION 'Ein Zugang ist gesperrt. Für dieses Kind bitte bewusst einen neuen Zugang erstellen.';
 END IF;
 IF v.print_token IS NULL OR v.pin_hash IS NULL OR p_rotate THEN
  v_token:=public.kompass_english_issue_code(p_grade,p_pupil_id);
  v_pin:=lpad(((('x'||substr(replace(gen_random_uuid()::text,'-',''),1,8))::bit(32)::bigint)%1000000)::text,6,'0');
  UPDATE public.kompass_english_links SET print_token=v_token,print_pin=v_pin,
   pin_hash=encode(sha256(convert_to(v_token||':'||v_pin,'UTF8')),'hex'),
   failed_attempts=0,blocked_until=NULL
   WHERE grade=p_grade AND pupil_id=p_pupil_id;
 ELSE
  v_token:=v.print_token; v_pin:=v.print_pin;
 END IF;
 RETURN jsonb_build_object('pupil_id',p_pupil_id,'token',v_token,'pin',v_pin);
END $$;

CREATE OR REPLACE FUNCTION public.kompass_english_batch_access(p_grade smallint,p_pupil_ids text[],p_rotate boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_id text; v_out jsonb:='[]'::jsonb;
BEGIN
 IF NOT public.kompass_english_teacher_access(p_grade,true) THEN
  RAISE EXCEPTION 'Keine Berechtigung zur Codeverwaltung.' USING ERRCODE='42501';
 END IF;
 IF p_pupil_ids IS NULL OR cardinality(p_pupil_ids) NOT BETWEEN 1 AND 300 THEN
  RAISE EXCEPTION 'Bitte 1 bis 300 Kinder auswählen.';
 END IF;
 FOR v_id IN SELECT DISTINCT unnest(p_pupil_ids) ORDER BY 1 LOOP
  v_out:=v_out||jsonb_build_array(public.kompass_english_get_access(p_grade,v_id,p_rotate));
 END LOOP;
 RETURN v_out;
END $$;

-- Returning an error object (rather than raising) preserves failed-PIN counters.
CREATE OR REPLACE FUNCTION public.kompass_english_check_pin(p_token text,p_pin text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v public.kompass_english_links; v_count integer;
BEGIN
 IF p_token IS NULL OR p_token !~ '^[a-f0-9]{64}$' THEN
  RETURN jsonb_build_object('ok',false,'message','QR-Code oder PIN ungültig.');
 END IF;
 SELECT * INTO v FROM public.kompass_english_links
  WHERE token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex') AND active FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'message','QR-Code oder PIN ungültig.'); END IF;
 IF v.pin_hash IS NULL THEN
  RETURN jsonb_build_object('ok',false,'message','Bitte deine Lehrkraft nach dem neuen QR-Code mit PIN fragen.');
 END IF;
 IF v.blocked_until>clock_timestamp() THEN
  RETURN jsonb_build_object('ok',false,'message','Zu viele Versuche. Bitte in fünf Minuten erneut versuchen.');
 END IF;
 IF p_pin IS NULL OR p_pin !~ '^[0-9]{6}$'
  OR encode(sha256(convert_to(p_token||':'||p_pin,'UTF8')),'hex')<>v.pin_hash THEN
  v_count:=CASE WHEN v.blocked_until IS NOT NULL AND v.blocked_until<=clock_timestamp() THEN 1 ELSE v.failed_attempts+1 END;
  UPDATE public.kompass_english_links SET failed_attempts=v_count,
   blocked_until=CASE WHEN v_count>=10 THEN clock_timestamp()+interval '5 minutes' ELSE NULL END
   WHERE grade=v.grade AND pupil_id=v.pupil_id;
  RETURN jsonb_build_object('ok',false,'message','QR-Code oder PIN ungültig.');
 END IF;
 UPDATE public.kompass_english_links SET failed_attempts=0,blocked_until=NULL WHERE grade=v.grade AND pupil_id=v.pupil_id;
 RETURN jsonb_build_object('ok',true);
END $$;

CREATE OR REPLACE FUNCTION public.kompass_english_resolve_code_v2(p_token text,p_pin text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v jsonb;
BEGIN
 v:=public.kompass_english_check_pin(p_token,p_pin);
 IF NOT (v->>'ok')::boolean THEN RETURN v; END IF;
 RETURN public.kompass_english_resolve_code(p_token)||jsonb_build_object('ok',true);
END $$;

CREATE OR REPLACE FUNCTION public.kompass_english_submit_result_v2(
 p_token text,p_pin text,p_attempt_id uuid,p_task_key text,p_topic text,p_points integer,p_max_points integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v jsonb; v_title text;
BEGIN
 v:=public.kompass_english_check_pin(p_token,p_pin);
 IF NOT (v->>'ok')::boolean THEN RETURN v; END IF;
 SELECT title INTO v_title FROM public.kompass_english_tasks WHERE task_key=p_task_key;
 IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'message','Für diesen Test fehlt noch die Kompetenzzuordnung. Bitte die Lehrkraft fragen.'); END IF;
 RETURN public.kompass_english_submit_result(p_token,p_attempt_id,p_task_key,v_title,p_points,p_max_points)||jsonb_build_object('ok',true);
END $$;

CREATE OR REPLACE FUNCTION public.kompass_english_assign_competency()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 SELECT t.competency_id INTO NEW.competency_id FROM public.kompass_english_tasks t
  WHERE t.task_key=NEW.task_key AND EXISTS(
   SELECT 1 FROM public.kompass_shared_state s,
    LATERAL jsonb_array_elements(coalesce(s.payload->'competencies','[]'::jsonb)) c
    WHERE s.id='school' AND c->>'id'=t.competency_id AND c->>'subject'='Englisch' AND c->>'type'='core');
 IF NEW.competency_id IS NULL THEN RAISE EXCEPTION 'Für diesen Test fehlt eine gültige Englischkompetenz.'; END IF;
 RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.kompass_english_apply_evidence(v_result public.kompass_english_results)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_state jsonb; v_record jsonb; v_comp jsonb; v_key text; v_score jsonb; v_entry jsonb;
 v_status text; v_percent integer; v_manual boolean; v_date text;
BEGIN
 SELECT c INTO v_comp FROM public.kompass_shared_state s,
  LATERAL jsonb_array_elements(coalesce(s.payload->'competencies','[]'::jsonb)) c
  WHERE s.id='school' AND c->>'id'=v_result.competency_id AND c->>'subject'='Englisch' AND c->>'type'='core';
 IF NOT FOUND THEN RAISE EXCEPTION 'Englischkompetenz nicht gefunden.'; END IF;
 SELECT payload INTO STRICT v_state FROM public.kompass_grade_state WHERE grade=v_result.grade FOR UPDATE;
 v_key:=v_result.competency_id||'|'||v_result.pupil_id;
 v_record:=coalesce(v_state->'records'->v_key,'{}'::jsonb);
 IF EXISTS (SELECT 1 FROM jsonb_array_elements(coalesce(v_record->'practiceResults','[]'::jsonb)) p WHERE p->>'id'=v_result.id::text) THEN RETURN; END IF;
 v_percent:=round(v_result.points*100.0/v_result.max_points);
 v_status:=CASE WHEN v_percent<=coalesce((v_comp#>>'{scoreConfig,redMax}')::numeric,24) THEN 'red'
  WHEN v_percent<=coalesce((v_comp#>>'{scoreConfig,yellowMax}')::numeric,74) THEN 'yellow' ELSE 'green' END;
 v_score:=jsonb_build_object('points',v_result.points,'max',v_result.max_points,'percent',v_percent,
  'redMax',coalesce((v_comp#>>'{scoreConfig,redMax}')::numeric,24),'yellowMax',coalesce((v_comp#>>'{scoreConfig,yellowMax}')::numeric,74));
 v_date:=to_char(v_result.submitted_at AT TIME ZONE 'Europe/Berlin','DD.MM.YYYY');
 v_entry:=jsonb_build_object('id',v_result.id::text,'attemptId',v_result.attempt_id,'taskKey',v_result.task_key,
  'topic',v_result.topic,'at',v_result.submitted_at,'date',v_date,'teacher','English Practice',
  'source','english_practice','value',v_status,'level',v_record->'level','score',v_score,'note','Vokabel-Selbsttest');
 v_manual:=coalesce(v_record->>'source','')='teacher' OR
  (coalesce(v_record->>'source','')<>'english_practice' AND
   (nullif(v_record->>'current','') IS NOT NULL OR nullif(v_record->>'level','') IS NOT NULL
    OR (v_record->'score' IS NOT NULL AND v_record->'score'<>'null'::jsonb)));
 v_record:=v_record||jsonb_build_object('practiceResults',coalesce(v_record->'practiceResults','[]'::jsonb)||v_entry,
  'history',coalesce(v_record->'history','[]'::jsonb)||v_entry,'practiceLatest',v_entry);
 IF NOT v_manual THEN
  v_record:=v_record||jsonb_build_object('current',v_status,'score',v_score,'source','english_practice');
  IF v_status='green' AND nullif(v_record->>'firstGreen','') IS NULL THEN
   v_record:=v_record||jsonb_build_object('firstGreen',v_date);
  END IF;
 END IF;
 v_state:=jsonb_set(v_state,'{records}',coalesce(v_state->'records','{}'::jsonb)||jsonb_build_object(v_key,v_record));
 UPDATE public.kompass_grade_state SET payload=v_state,updated_at=greatest(clock_timestamp(),updated_at+interval '1 microsecond') WHERE grade=v_result.grade;
END $$;

CREATE OR REPLACE FUNCTION public.kompass_english_result_to_competency()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN PERFORM public.kompass_english_apply_evidence(NEW); RETURN NEW; END $$;
CREATE TRIGGER english_assign_competency BEFORE INSERT ON public.kompass_english_results
 FOR EACH ROW EXECUTE FUNCTION public.kompass_english_assign_competency();
CREATE TRIGGER english_result_to_competency AFTER INSERT ON public.kompass_english_results
 FOR EACH ROW EXECUTE FUNCTION public.kompass_english_result_to_competency();

CREATE OR REPLACE FUNCTION public.kompass_english_map_task(p_grade smallint,p_task_key text,p_competency_id text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF NOT public.kompass_english_teacher_access(p_grade,true) THEN
  RAISE EXCEPTION 'Keine Berechtigung zur Kompetenzzuordnung.' USING ERRCODE='42501';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM public.kompass_shared_state s,
  LATERAL jsonb_array_elements(coalesce(s.payload->'competencies','[]'::jsonb)) c
  WHERE s.id='school' AND c->>'id'=p_competency_id AND c->>'type'='core' AND c->>'subject'='Englisch') THEN
  RAISE EXCEPTION 'Bitte eine vorhandene Englischkompetenz auswählen.';
 END IF;
 UPDATE public.kompass_english_tasks SET competency_id=p_competency_id WHERE task_key=p_task_key;
 IF NOT FOUND THEN RAISE EXCEPTION 'Vokabeltest nicht gefunden.'; END IF;
END $$;

-- Disable every PIN-free entry point; keep them private for internal reuse.
REVOKE ALL ON FUNCTION public.kompass_english_issue_code(smallint,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.kompass_english_resolve_code(text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.kompass_english_submit_result(text,uuid,text,text,integer,integer) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.kompass_english_check_pin(text,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.kompass_english_apply_evidence(public.kompass_english_results) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.kompass_english_assign_competency() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.kompass_english_result_to_competency() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.kompass_english_get_access(smallint,text,boolean) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.kompass_english_batch_access(smallint,text[],boolean) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.kompass_english_map_task(smallint,text,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.kompass_english_resolve_code_v2(text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.kompass_english_submit_result_v2(text,text,uuid,text,text,integer,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kompass_english_get_access(smallint,text,boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.kompass_english_batch_access(smallint,text[],boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.kompass_english_map_task(smallint,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.kompass_english_resolve_code_v2(text,text) TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.kompass_english_submit_result_v2(text,text,uuid,text,text,integer,integer) TO anon,authenticated;

-- Preserve any tests submitted before deployment by attaching them once.
DO $$ DECLARE v public.kompass_english_results;
BEGIN
 FOR v IN UPDATE public.kompass_english_results r SET competency_id=t.competency_id
  FROM public.kompass_english_tasks t WHERE r.task_key=t.task_key AND r.competency_id IS NULL RETURNING r.* LOOP
  PERFORM public.kompass_english_apply_evidence(v);
 END LOOP;
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
