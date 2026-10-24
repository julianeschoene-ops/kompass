BEGIN;
DO $t$
DECLARE tok text;pin text;r jsonb;old jsonb;newstate jsonb;p jsonb:='{"id":"00000000-0000-4000-8000-000000000123","xp":35,"controls":[{"id":"wb71-11","title":"was/were","compared":true,"star":true,"correct":3}],"grammar":[{"title":"Simple Past","points":8,"max":10}]}';
BEGIN
SELECT print_token,print_pin INTO STRICT tok,pin FROM kompass_english_links WHERE grade=6 AND pupil_id='ep_demo_juliane_2026' AND active;
SELECT payload->'records' INTO old FROM kompass_grade_state WHERE grade=6;
r:=kompass_english_save_practice(tok,pin,p);
IF (r->>'saved')::boolean IS NOT TRUE THEN RAISE EXCEPTION 'Not saved';END IF;
PERFORM kompass_english_save_practice(tok,pin,p);
SELECT payload->'records' INTO newstate FROM kompass_grade_state WHERE grade=6;
IF (newstate-'english_practice_log|ep_demo_juliane_2026') IS DISTINCT FROM (old-'english_practice_log|ep_demo_juliane_2026') THEN RAISE EXCEPTION 'Changed competencies';END IF;
IF (SELECT count(*) FROM jsonb_array_elements(newstate#>'{english_practice_log|ep_demo_juliane_2026,reports}') x WHERE x->>'id'=p->>'id')<>1 THEN RAISE EXCEPTION 'Duplicate report';END IF;
r:=kompass_english_save_practice(tok,'invalid',p);
IF (r->>'ok')::boolean IS TRUE THEN RAISE EXCEPTION 'Invalid identity accepted';END IF;
END $t$;
SELECT 'Practice report identity, idempotency and unchanged competency assessments passed' verification;
ROLLBACK;
