BEGIN;
SELECT set_config('request.jwt.claim.sub',(SELECT id::text FROM public.kompass_profiles WHERE display_name='Juliane Schöne' AND role='admin' AND active LIMIT 1),true);
DO $test$
DECLARE tok text;pin text;r jsonb;r2 jsonb;e jsonb;answers jsonb;v jsonb;rid uuid;item record;rec jsonb;n integer;
BEGIN
 SELECT print_token,print_pin INTO STRICT tok,pin FROM public.kompass_english_links WHERE grade=6 AND pupil_id='ep_demo_juliane_2026' AND active;
 UPDATE public.kompass_english_links SET test_override_until=clock_timestamp()+interval '1 hour' WHERE grade=6 AND pupil_id='ep_demo_juliane_2026';
 r:=public.kompass_english_start_vocab(tok,pin,'vocab:lwl-u4-test-1','G');
 IF jsonb_array_length(r->'items')<>20 OR (r->>'max_points')::integer<>40 THEN RAISE EXCEPTION 'G size wrong';END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(r->'items') q WHERE q?'accepted' OR q?'word') THEN RAISE EXCEPTION 'Answer keys leaked before submission';END IF;
 IF (SELECT count(*) FROM jsonb_array_elements(r->'items') q WHERE q->>'kind'='en-de')<>10 THEN RAISE EXCEPTION 'G direction split wrong';END IF;
 r2:=public.kompass_english_start_vocab(tok,pin,'vocab:lwl-u4-test-1','M');
 IF (SELECT count(*) FROM jsonb_array_elements(r2->'items') q WHERE NOT EXISTS(SELECT 1 FROM jsonb_array_elements(r->'items') p WHERE p->>'word_id'=q->>'word_id'))<>3 THEN RAISE EXCEPTION 'Repeat did not prioritize unused words';END IF;
 e:=public.kompass_english_start_vocab(tok,pin,'vocab:lwl-u4-test-2','E');
 IF jsonb_array_length(e->'items')<>20 OR (e->>'max_points')::integer<>50 OR (SELECT count(*) FROM jsonb_array_elements(e->'items') q WHERE q->>'kind'='sentence')<>5 THEN RAISE EXCEPTION 'E structure wrong';END IF;
 IF (SELECT count(DISTINCT q->>'word_id') FROM jsonb_array_elements(e->'items') q)<>20 THEN RAISE EXCEPTION 'Duplicate tested target';END IF;
 -- A forged client score must not count: only the actual answers are marked.
 SELECT jsonb_agg(jsonb_build_object('word_id',q->>'word_id','given','WRONG','points',999,'kind','correct')) INTO answers FROM jsonb_array_elements(r2->'items') q;
 v:=public.kompass_english_submit_vocab(tok,pin,(r2->>'id')::uuid,answers);
 IF (v->>'points')::integer<>0 OR (v->>'saved')::boolean IS NOT true THEN RAISE EXCEPTION 'Forged score accepted';END IF;
 -- Reference answers are stored privately. Build a legitimate all-correct retry fixture.
 SELECT jsonb_agg(jsonb_build_object('word_id',q->>'word_id','given',(SELECT f FROM public.kompass_english_answer_forms(q->'accepted',q->>'kind'<>'sentence') f LIMIT 1))) INTO answers
 FROM public.kompass_english_vocab_attempts a CROSS JOIN LATERAL jsonb_array_elements(a.items) q WHERE a.id=(e->>'id')::uuid;
 v:=public.kompass_english_submit_vocab(tok,pin,(e->>'id')::uuid,answers);
 IF (v->>'points')::integer<>50 OR (v->>'needs_review')::boolean THEN RAISE EXCEPTION 'Correct E responses rejected: %',v;END IF;
 -- Unknown sentence variants are pending review, never an automatic negative judgment.
 e:=public.kompass_english_start_vocab(tok,pin,'vocab:lwl-u4-test-2','E');
 SELECT jsonb_agg(jsonb_build_object('word_id',q->>'word_id','given',CASE WHEN q->>'kind'='sentence' THEN 'An alternative sentence for teacher review.' ELSE (SELECT f FROM public.kompass_english_answer_forms(q->'accepted',true) f LIMIT 1) END)) INTO answers
 FROM public.kompass_english_vocab_attempts a CROSS JOIN LATERAL jsonb_array_elements(a.items) q WHERE a.id=(e->>'id')::uuid;
 UPDATE public.kompass_grade_state SET payload=jsonb_set(payload,'{records}',coalesce(payload->'records','{}')||jsonb_build_object('eng5_5|ep_demo_juliane_2026',jsonb_build_object('source','teacher','current','yellow','score',jsonb_build_object('points',7,'max',20,'percent',35)))) WHERE grade=6;
 v:=public.kompass_english_submit_vocab(tok,pin,(e->>'id')::uuid,answers);
 IF (v->>'needs_review')::boolean IS NOT true OR (v->>'points')::integer<>30 THEN RAISE EXCEPTION 'Review not flagged';END IF;
 SELECT payload#>'{records,eng5_5|ep_demo_juliane_2026}' INTO rec FROM public.kompass_grade_state WHERE grade=6;
 IF rec#>>'{score,points}'<>'7' OR rec->>'current'<>'yellow' THEN RAISE EXCEPTION 'Pending review changed competence judgment';END IF;
 SELECT id INTO rid FROM public.kompass_english_results WHERE attempt_id=(e->>'id')::uuid;
 PERFORM public.kompass_english_review_vocab(rid,46,'Alternative sentences checked.');
 SELECT payload#>'{records,eng5_5|ep_demo_juliane_2026}' INTO rec FROM public.kompass_grade_state WHERE grade=6;
 IF rec#>>'{score,points}'<>'46' OR rec->>'source'<>'teacher' OR rec#>>'{practiceLatest,needsReview}'<>'false' THEN RAISE EXCEPTION 'Teacher review failed';END IF;
 v:=public.kompass_english_submit_vocab(tok,pin,(e->>'id')::uuid,answers);
 IF (v->>'points')::integer<>46 OR (v->>'needs_review')::boolean THEN RAISE EXCEPTION 'Retry overwrote teacher review';END IF;
 IF has_function_privilege('anon','public.kompass_english_mark_answer(text,jsonb,text)','execute') OR has_table_privilege('anon','public.kompass_english_vocab_attempts','SELECT') OR has_function_privilege('anon','public.kompass_english_review_vocab(uuid,integer,text)','execute') THEN RAISE EXCEPTION 'Private answers or marking rights exposed';END IF;
 FOR item IN SELECT * FROM (VALUES ('the bus stop','bus stop','de-en',2),('bus stop','the bus stop','de-en',2),('swiming pool','swimming pool','de-en',1),('light','right','de-en',0),('It’s next to the park.','It is next to the park.','sentence',4),('He walk to school.','He walks to school.','sentence',0)) t(given,accepted,kind,points) LOOP
  v:=public.kompass_english_mark_answer(item.given,jsonb_build_array(item.accepted),item.kind);
  IF (v->>'points')::integer<>item.points THEN RAISE EXCEPTION 'Marking mismatch for %: %',item.given,v;END IF;
 END LOOP;
END $test$;
SELECT 'G/M/E sampling, capped targets, rotation, hidden keys, server marking, forged-score rejection, pending sentence review, teacher review and idempotency passed' AS verification;
ROLLBACK;
