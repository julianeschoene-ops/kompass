-- Only explicit LWL assessments may create competency evidence.
-- Existing per-list rows remain for compatibility/history, but are not assessments.
BEGIN;
ALTER TABLE public.kompass_english_tasks
 ADD COLUMN IF NOT EXISTS is_assessment boolean NOT NULL DEFAULT false,
 ADD COLUMN IF NOT EXISTS expected_questions integer CHECK (expected_questions BETWEEN 1 AND 500),
 ADD COLUMN IF NOT EXISTS source_ref text;
INSERT INTO public.kompass_english_tasks(task_key,title,unit,competency_id,is_assessment,expected_questions,source_ref) VALUES
 ('vocab:lwl-u4-test-1','Unit 4 · Vocabulary Test 1 · shop – now',4,'eng5_5',true,23,'LWL4_Year_5_Orange_Line_SuS.pdf · Station 1 · 2a · Liste 16'),
 ('vocab:lwl-u4-test-2','Unit 4 · Vocabulary Test 2 · way – by (bike)',4,'eng5_5',true,50,'LWL4_Year_5_Orange_Line_SuS.pdf · Station 2 · 3a · Liste 17')
ON CONFLICT (task_key) DO UPDATE SET title=excluded.title,is_assessment=true,
 expected_questions=excluded.expected_questions,source_ref=excluded.source_ref;
CREATE OR REPLACE FUNCTION public.kompass_english_submit_result_v3(
 p_token text,p_pin text,p_attempt_id uuid,p_task_key text,p_topic text,
 p_points integer,p_max_points integer,p_test_date date)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v jsonb; v_title text; v_at timestamptz; v_existing boolean; v_expected integer;
BEGIN
 v:=public.kompass_english_check_pin(p_token,p_pin);
 IF NOT (v->>'ok')::boolean THEN RETURN v; END IF;
 SELECT title,expected_questions INTO v_title,v_expected FROM public.kompass_english_tasks WHERE task_key=p_task_key AND is_assessment;
 IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'practice_only',true,'message','Dies ist eine Übung, kein Test laut Lernwegeliste. Kein Ergebnis übertragen. Bitte die Seite neu laden und den vorgesehenen LWL-Test öffnen.'); END IF;
 IF p_max_points IS DISTINCT FROM v_expected THEN RETURN jsonb_build_object('ok',false,'update_required',true,'message','Unvollständiger LWL-Test. Bitte die Seite neu laden und den vollständigen Test öffnen.'); END IF;
 -- Lost acknowledgments may be retried after closing, without adding evidence.
 SELECT EXISTS(SELECT 1 FROM public.kompass_english_results r JOIN public.kompass_english_links l
  ON l.grade=r.grade AND l.pupil_id=r.pupil_id
  WHERE l.token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex') AND r.attempt_id=p_attempt_id) INTO v_existing;
 v_at:=clock_timestamp();
 IF NOT v_existing AND (NOT public.kompass_english_in_test_window(v_at)
   OR p_test_date IS NULL OR p_test_date<>(v_at AT TIME ZONE 'Europe/Berlin')::date) THEN
  RETURN jsonb_build_object('ok',false,'window_closed',true,'message','Testzeit: 8:00–12:30 Uhr. Neue Ergebnisse müssen innerhalb dieser Zeit abgegeben werden. Üben kannst du jederzeit.');
 END IF;
 RETURN public.kompass_english_submit_result(p_token,p_attempt_id,p_task_key,v_title,p_points,p_max_points)||jsonb_build_object('ok',true);
END $$;
-- A loaded old page must receive an actionable response, never an endless 401 retry.
-- This compatibility endpoint never saves data or accepts an old practice score.
CREATE OR REPLACE FUNCTION public.kompass_english_submit_result_v2(
 p_token text,p_pin text,p_attempt_id uuid,p_task_key text,p_topic text,p_points integer,p_max_points integer)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT jsonb_build_object('ok',false,'saved',false,'practice_only',true,'update_required',true,
 'message','Diese Runde ist eine Übung. Sie wird nicht in KOMPASS gespeichert. Bitte die Seite neu laden: Nur Tests unter „Tests laut Lernwegeliste“ werden übertragen.')
$$;
REVOKE ALL ON FUNCTION public.kompass_english_submit_result_v2(text,text,uuid,text,text,integer,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kompass_english_submit_result_v2(text,text,uuid,text,text,integer,integer) TO anon,authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
