-- All test changes, including evidence and simulated expiration, roll back.
BEGIN;
SELECT set_config('request.jwt.claim.sub',(SELECT id::text FROM public.kompass_profiles WHERE display_name='Juliane Schöne' AND role='admin' AND active LIMIT 1),true);
DO $test$
DECLARE tok text; pin text; gate jsonb; v jsonb; a uuid:=gen_random_uuid(); before_count integer; title text;
BEGIN
 SELECT print_token,print_pin INTO STRICT tok,pin FROM public.kompass_english_links WHERE pupil_id='ep_demo_juliane_2026' AND grade=6 AND active;
 IF (public.kompass_english_window_for_token(tok,timestamp '2026-10-24 09:00' AT TIME ZONE 'Europe/Berlin')->>'demo_access')::boolean IS NOT true
  OR (public.kompass_english_window_for_token(tok,timestamp '2026-10-25 23:59:59' AT TIME ZONE 'Europe/Berlin')->>'open')::boolean IS NOT true THEN RAISE EXCEPTION 'Weekend grant missing'; END IF;
 IF (public.kompass_english_window_for_token(tok,timestamp '2026-10-26 00:00' AT TIME ZONE 'Europe/Berlin')->>'open')::boolean THEN RAISE EXCEPTION 'Weekend access did not expire'; END IF;
 IF (public.kompass_english_window_for_token(repeat('0',64),timestamp '2026-10-24 09:00' AT TIME ZONE 'Europe/Berlin')->>'open')::boolean THEN RAISE EXCEPTION 'Unknown token bypasses weekend'; END IF;
 IF has_function_privilege('anon','public.kompass_english_window_for_token(text,timestamptz)','execute') THEN RAISE EXCEPTION 'Private helper exposed'; END IF;
 -- Keep the live-call part repeatable even after the real weekend expires.
 UPDATE public.kompass_english_links SET test_override_until=clock_timestamp()+interval '1 hour' WHERE pupil_id='ep_demo_juliane_2026' AND grade=6;
 gate:=public.kompass_english_access_window(tok,pin);
 IF (gate->>'open')::boolean IS NOT true OR (gate->>'demo_access')::boolean IS NOT true THEN RAISE EXCEPTION 'PIN-authenticated demo access failed'; END IF;
 v:=public.kompass_english_access_window(tok,'not-a-pin');
 IF (v->>'open')::boolean OR (v->>'ok')::boolean THEN RAISE EXCEPTION 'Wrong PIN opened demo'; END IF;
 gate:=public.kompass_english_test_catalog(tok,pin);
 IF (gate->>'ok')::boolean IS NOT true OR jsonb_array_length(gate->'tests')<>6 THEN RAISE EXCEPTION 'Demo catalog did not open all six tests'; END IF;
 SELECT count(*) INTO before_count FROM public.kompass_english_results WHERE pupil_id='ep_demo_juliane_2026' AND grade=6;
 SELECT t.title INTO title FROM public.kompass_english_tasks t WHERE task_key='assessment:lwl-u4-reading';
 v:=public.kompass_english_submit_result_v3(tok,pin,a,'assessment:lwl-u4-reading',title,3,4,(gate->>'test_date')::date);
 IF (v->>'saved')::boolean IS NOT true THEN RAISE EXCEPTION 'Demo result not saved'; END IF;
 UPDATE public.kompass_english_links SET test_override_until=clock_timestamp()-interval '1 second' WHERE pupil_id='ep_demo_juliane_2026' AND grade=6;
 v:=public.kompass_english_submit_result_v3(tok,pin,a,'assessment:lwl-u4-reading',title,3,4,(gate->>'test_date')::date);
 IF (v->>'saved')::boolean IS NOT true THEN RAISE EXCEPTION 'Saved demo acknowledgment lost after expiration'; END IF;
 IF (SELECT count(*) FROM public.kompass_english_results WHERE pupil_id='ep_demo_juliane_2026' AND grade=6)<>before_count+1 THEN RAISE EXCEPTION 'Duplicate demo result'; END IF;
 -- Even the fixed demo ID cannot bypass the gate when it is no longer marked synthetic.
 UPDATE public.kompass_english_links SET test_override_until=clock_timestamp()+interval '1 hour' WHERE pupil_id='ep_demo_juliane_2026' AND grade=6;
 UPDATE public.kompass_grade_state SET payload=jsonb_set(payload,'{pupils}',(SELECT jsonb_agg(CASE WHEN p->>'id'='ep_demo_juliane_2026' THEN p||'{"isDemo":false}'::jsonb ELSE p END) FROM jsonb_array_elements(payload->'pupils') p)) WHERE grade=6;
 IF coalesce((public.kompass_english_window_for_token(tok,timestamp '2026-10-24 09:00' AT TIME ZONE 'Europe/Berlin')->>'demo_access')::boolean,false) THEN RAISE EXCEPTION 'Non-demo pupil bypassed gate'; END IF;
END $test$;
SELECT 'Demo-only weekend access, PIN, six-test catalog, submission, idempotency, automatic expiration, and non-demo isolation passed' AS verification;
ROLLBACK;
