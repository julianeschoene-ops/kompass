-- Temporary weekend access for the existing synthetic Testkind only.
BEGIN;
ALTER TABLE public.kompass_english_links ADD COLUMN test_override_until timestamptz;
CREATE OR REPLACE FUNCTION public.kompass_english_window_for_token(p_token text,p_at timestamptz)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE gate jsonb; expiry timestamptz;
BEGIN
 gate:=public.kompass_english_window_at(p_at);
 SELECT l.test_override_until INTO expiry FROM public.kompass_english_links l
 JOIN public.kompass_grade_state g ON g.grade=l.grade
 CROSS JOIN LATERAL jsonb_array_elements(g.payload->'pupils') p
 WHERE l.active AND l.token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex')
 AND l.pupil_id='ep_demo_juliane_2026' AND p->>'id'=l.pupil_id
 AND p->>'isDemo'='true' AND coalesce(p->>'archived','false')<>'true'
 AND l.test_override_until>p_at;
 IF FOUND THEN
  RETURN gate||jsonb_build_object('open',true,'demo_access',true,'reason','demo_override',
   'closes_at',expiry,'message','Persönlicher Testzugang für Testkind. Die reguläre Sperre bleibt für andere Kinder bestehen.');
 END IF;
 RETURN gate;
END $$;
REVOKE ALL ON FUNCTION public.kompass_english_window_for_token(text,timestamptz) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.kompass_english_access_window(p_token text,p_pin text)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE pin_check jsonb;
BEGIN
 pin_check:=public.kompass_english_check_pin(p_token,p_pin);
 IF NOT (pin_check->>'ok')::boolean THEN RETURN pin_check||jsonb_build_object('open',false); END IF;
 RETURN public.kompass_english_window_for_token(p_token,clock_timestamp())||jsonb_build_object('ok',true);
END $$;
REVOKE ALL ON FUNCTION public.kompass_english_access_window(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kompass_english_access_window(text,text) TO anon,authenticated;
CREATE OR REPLACE FUNCTION public.kompass_english_test_catalog(p_token text,p_pin text)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE gate jsonb; pin_check jsonb; tests jsonb;
BEGIN
 gate:=public.kompass_english_access_window(p_token,p_pin);
 IF coalesce((gate->>'open')::boolean,false) IS NOT true THEN RETURN gate||jsonb_build_object('ok',false,'tests','[]'::jsonb); END IF;
 SELECT coalesce(jsonb_agg(t.assessment_config||jsonb_build_object('task_key',t.task_key,'title',t.title,
  'unit',t.unit,'question_count',t.expected_questions,'competency_id',c->>'id','competency_text',c->>'text',
  'competency_area',c->>'area') ORDER BY t.unit,t.task_key),'[]'::jsonb)
 INTO tests FROM public.kompass_english_tasks t JOIN public.kompass_shared_state s ON s.id='school'
 CROSS JOIN LATERAL jsonb_array_elements(s.payload->'competencies') c
 WHERE t.is_assessment AND t.assessment_config IS NOT NULL AND t.expected_questions>0
 AND c->>'id'=t.competency_id AND c->>'subject'='Englisch' AND c->>'type'='core';
 RETURN gate||jsonb_build_object('ok',true,'tests',tests);
END $$;
CREATE OR REPLACE FUNCTION public.kompass_english_submit_result_v3(
 p_token text,p_pin text,p_attempt_id uuid,p_task_key text,p_topic text,
 p_points integer,p_max_points integer,p_test_date date)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v jsonb; v_title text; v_at timestamptz; v_existing boolean; v_expected integer; v_kind text;
BEGIN
 v:=public.kompass_english_check_pin(p_token,p_pin);
 IF NOT (v->>'ok')::boolean THEN RETURN v; END IF;
 SELECT title,expected_questions,coalesce(assessment_config->>'kind','vocabulary') INTO v_title,v_expected,v_kind FROM public.kompass_english_tasks WHERE task_key=p_task_key AND is_assessment;
 IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'practice_only',true,'message','Dies ist eine Übung, kein Test laut Lernwegeliste. Kein Ergebnis übertragen. Bitte die Seite neu laden und den vorgesehenen LWL-Test öffnen.'); END IF;
 IF v_kind='teacher' THEN RETURN jsonb_build_object('ok',false,'update_required',true,'message','Diese Aufgabe wird von der Lehrkraft direkt in der Kompetenz bewertet. Es gibt keine automatische Punkteübertragung.'); END IF;
 IF p_max_points IS DISTINCT FROM v_expected THEN RETURN jsonb_build_object('ok',false,'update_required',true,'message','Unvollständiger LWL-Test. Bitte die Seite neu laden und den vollständigen Test öffnen.'); END IF;
 -- Lost acknowledgments may be retried after closing, without adding evidence.
 SELECT EXISTS(SELECT 1 FROM public.kompass_english_results r JOIN public.kompass_english_links l
  ON l.grade=r.grade AND l.pupil_id=r.pupil_id
  WHERE l.token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex') AND r.attempt_id=p_attempt_id) INTO v_existing;
 v_at:=clock_timestamp();
 v:=public.kompass_english_window_for_token(p_token,v_at);
 IF NOT v_existing AND (NOT (v->>'open')::boolean
   OR p_test_date IS NULL OR p_test_date<>(v_at AT TIME ZONE 'Europe/Berlin')::date) THEN
  RETURN v||jsonb_build_object('ok',false,'window_closed',true,'message',CASE WHEN (v->>'open')::boolean THEN 'Dieser Versuch stammt von einem anderen Tag und kann nicht übertragen werden.' ELSE v->>'message' END);
 END IF;
 RETURN public.kompass_english_submit_result(p_token,p_attempt_id,p_task_key,v_title,p_points,p_max_points)||jsonb_build_object('ok',true);
END $$;
-- This stable synthetic pupil was created intentionally for Juliane's integration test.
-- Expiration is checked on every access/submission; no global calendar change.
UPDATE public.kompass_english_links l SET test_override_until=timestamp '2026-10-26 00:00' AT TIME ZONE 'Europe/Berlin'
WHERE l.pupil_id='ep_demo_juliane_2026' AND l.active AND EXISTS (
 SELECT 1 FROM public.kompass_grade_state g CROSS JOIN LATERAL jsonb_array_elements(g.payload->'pupils') p
 WHERE g.grade=l.grade AND p->>'id'=l.pupil_id AND p->>'isDemo'='true');
NOTIFY pgrst,'reload schema';
COMMIT;
