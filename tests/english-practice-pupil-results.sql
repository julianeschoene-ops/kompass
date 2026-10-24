BEGIN;
DO $test$
DECLARE tok text;pin text;r jsonb;detail jsonb;foreign_id uuid;rid uuid;
BEGIN
 SELECT print_token,print_pin INTO STRICT tok,pin FROM public.kompass_english_links WHERE grade=6 AND pupil_id='ep_demo_juliane_2026' AND active;
 UPDATE public.kompass_english_links SET test_override_until=NULL WHERE grade=6 AND pupil_id='ep_demo_juliane_2026';
 r:=public.kompass_english_my_results(tok,pin);
 IF (r->>'ok')::boolean IS NOT true OR jsonb_array_length(r->'results')=0 THEN RAISE EXCEPTION 'Own history not available';END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(r->'results') q JOIN public.kompass_english_results a ON a.id=(q->>'id')::uuid WHERE a.grade<>6 OR a.pupil_id<>'ep_demo_juliane_2026') THEN RAISE EXCEPTION 'Foreign row leaked';END IF;
 SELECT id INTO rid FROM public.kompass_english_results WHERE grade=6 AND pupil_id='ep_demo_juliane_2026' AND jsonb_array_length(assessment_detail->'feedback')>0 ORDER BY submitted_at DESC LIMIT 1;
 detail:=public.kompass_english_my_results(tok,pin,rid);
 IF jsonb_array_length(detail#>'{result,feedback}')<>23 OR detail#>'{result,items}' IS NOT NULL OR detail#>'{result,accepted}' IS NOT NULL THEN RAISE EXCEPTION 'Own submitted feedback missing or keys exposed';END IF;
 r:=public.kompass_english_my_results(tok,'000000');IF (r->>'ok')::boolean IS TRUE OR r?'results' THEN RAISE EXCEPTION 'Wrong PIN exposes history';END IF;
 r:=public.kompass_english_my_results(repeat('0',64),pin);IF (r->>'ok')::boolean IS TRUE OR r?'results' THEN RAISE EXCEPTION 'Wrong token exposes history';END IF;
 SELECT id INTO foreign_id FROM public.kompass_english_results WHERE pupil_id<>'ep_demo_juliane_2026' LIMIT 1;
 r:=public.kompass_english_my_results(tok,pin,coalesce(foreign_id,gen_random_uuid()));IF (r->>'ok')::boolean IS TRUE OR r?'result' THEN RAISE EXCEPTION 'Foreign/nonexistent detail readable';END IF;
 -- On the Saturday of this regression, history remains readable while new tests are closed.
 r:=public.kompass_english_access_window(tok,pin);
 IF extract(isodow FROM clock_timestamp() AT TIME ZONE 'Europe/Berlin') IN (6,7) AND (r->>'open')::boolean IS TRUE THEN RAISE EXCEPTION 'History opened test gate';END IF;
 r:=public.kompass_english_my_results(tok,pin);IF (r->>'ok')::boolean IS NOT TRUE THEN RAISE EXCEPTION 'History wrongly tied to test gate';END IF;
 UPDATE public.kompass_english_links SET test_override_until=clock_timestamp()+interval '1 hour' WHERE grade=6 AND pupil_id='ep_demo_juliane_2026';
 r:=public.kompass_english_test_catalog(tok,pin);IF EXISTS(SELECT 1 FROM jsonb_array_elements(r->'tests') q WHERE q->>'kind'='teacher') THEN RAISE EXCEPTION 'Teacher task in pupil catalog';END IF;
END $test$;
SELECT 'Own saved feedback available outside test hours, PIN/token and ownership isolation enforced, teacher tasks absent' AS verification;
ROLLBACK;
