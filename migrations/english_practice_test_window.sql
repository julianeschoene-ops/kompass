-- Daily test window in Europe/Berlin; free practice remains unrestricted.
BEGIN;
CREATE OR REPLACE FUNCTION public.kompass_english_in_test_window(p_at timestamptz)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path=public,pg_temp AS $$
 SELECT (p_at AT TIME ZONE 'Europe/Berlin')::time >= time '08:00'
    AND (p_at AT TIME ZONE 'Europe/Berlin')::time < time '12:30'
$$;
REVOKE ALL ON FUNCTION public.kompass_english_in_test_window(timestamptz) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.kompass_english_test_window()
RETURNS jsonb LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 WITH t AS (SELECT clock_timestamp() AS at), d AS (
  SELECT at,(at AT TIME ZONE 'Europe/Berlin')::date AS day FROM t)
 SELECT jsonb_build_object('open',public.kompass_english_in_test_window(at),
  'test_date',day,'server_now',at,'timezone','Europe/Berlin',
  'opens_at',(day+time '08:00') AT TIME ZONE 'Europe/Berlin',
  'closes_at',(day+time '12:30') AT TIME ZONE 'Europe/Berlin') FROM d
$$;
REVOKE ALL ON FUNCTION public.kompass_english_test_window() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kompass_english_test_window() TO anon,authenticated;

CREATE OR REPLACE FUNCTION public.kompass_english_submit_result_v3(
 p_token text,p_pin text,p_attempt_id uuid,p_task_key text,p_topic text,
 p_points integer,p_max_points integer,p_test_date date)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v jsonb; v_title text; v_at timestamptz; v_existing boolean;
BEGIN
 v:=public.kompass_english_check_pin(p_token,p_pin);
 IF NOT (v->>'ok')::boolean THEN RETURN v; END IF;
 SELECT title INTO v_title FROM public.kompass_english_tasks WHERE task_key=p_task_key;
 IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'message','Für diesen Test fehlt noch die Kompetenzzuordnung. Bitte die Lehrkraft fragen.'); END IF;
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
REVOKE ALL ON FUNCTION public.kompass_english_submit_result_v2(text,text,uuid,text,text,integer,integer) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.kompass_english_submit_result_v3(text,text,uuid,text,text,integer,integer,date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kompass_english_submit_result_v3(text,text,uuid,text,text,integer,integer,date) TO anon,authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
