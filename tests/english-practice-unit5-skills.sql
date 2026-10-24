BEGIN;
DO $test$
DECLARE tok text;pin text;t record;r jsonb;v jsonb;answers jsonb;rec jsonb;tier text;
BEGIN
SELECT print_token,print_pin INTO STRICT tok,pin FROM kompass_english_links WHERE grade=6 AND pupil_id='ep_demo_juliane_2026' AND active;
UPDATE kompass_english_links SET test_override_until=clock_timestamp()+interval '1 hour' WHERE grade=6 AND pupil_id='ep_demo_juliane_2026';
IF (SELECT count(*) FROM jsonb_array_elements(kompass_english_test_catalog(tok,pin)->'tests') x WHERE (x->>'unit')::int=5 AND (x->>'server_check')::boolean)<>2 THEN RAISE EXCEPTION 'Catalog must show four Unit 5 tests';END IF;
FOR t IN SELECT * FROM kompass_english_tasks WHERE unit=5 AND is_assessment AND (assessment_config->>'server_check')::boolean LOOP
 FOREACH tier IN ARRAY ARRAY['G','M','E'] LOOP
 UPDATE kompass_grade_state SET payload=jsonb_set(payload,'{records}',(payload->'records')-(t.competency_id||'|ep_demo_juliane_2026')) WHERE grade=6;
 r:=kompass_english_start_skill_check(tok,pin,t.task_key);
 IF jsonb_array_length(r->'items')<>13 OR (r->>'max_points')::int<>26 THEN RAISE EXCEPTION 'Invalid test %',t.task_key;END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(r->'items') q WHERE q?'accepted') THEN RAISE EXCEPTION 'Leaked answers';END IF;
 SELECT jsonb_agg(jsonb_build_object('word_id',q->>'word_id','given',CASE WHEN q->>'level'='G' OR tier IN ('M','E') AND q->>'level'='M' OR tier='E' AND q->>'level'='E' THEN (SELECT f FROM kompass_english_answer_forms(q->'accepted',q->>'kind'<>'sentence') f LIMIT 1) ELSE '' END)) INTO answers FROM kompass_english_vocab_attempts a CROSS JOIN LATERAL jsonb_array_elements(a.items) q WHERE a.id=(r->>'id')::uuid;
 v:=kompass_english_submit_vocab(tok,pin,(r->>'id')::uuid,answers);
 IF (v->>'saved')::boolean IS NOT TRUE OR v#>>'{outcome,level}'<>tier THEN RAISE EXCEPTION 'Grade failed % %: %',t.task_key,tier,v;END IF;
 SELECT payload->'records'->(t.competency_id||'|ep_demo_juliane_2026') INTO rec FROM kompass_grade_state WHERE grade=6;
 IF rec->>'level'<>tier OR rec->>'current'<>'green' OR rec->'practiceLatest'->>'taskKey'<>t.task_key THEN RAISE EXCEPTION 'Competency write failed';END IF;
 END LOOP;
END LOOP;
END $test$;
SELECT 'Two Unit 5 mandatory skill tests: catalog, 13 tasks/26 points, server grading G/M/E and correct KOMPASS evidence passed; all synthetic results rolled back' verification;
ROLLBACK;
