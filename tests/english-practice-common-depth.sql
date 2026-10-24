BEGIN;
SELECT set_config('request.jwt.claim.sub',(SELECT id::text FROM public.kompass_profiles WHERE display_name='Juliane Schöne' AND role='admin' AND active LIMIT 1),true);
DO $test$
DECLARE tok text;pin text;r jsonb;r2 jsonb;answers jsonb;v jsonb;rec jsonb;rid uuid;level_case text;expected_points integer;
BEGIN
 SELECT print_token,print_pin INTO STRICT tok,pin FROM public.kompass_english_links WHERE grade=6 AND pupil_id='ep_demo_juliane_2026' AND active;
 UPDATE public.kompass_english_links SET test_override_until=clock_timestamp()+interval '1 hour' WHERE grade=6 AND pupil_id='ep_demo_juliane_2026';
 IF has_function_privilege('anon','public.kompass_english_start_vocab(text,text,text,text)','execute') OR has_function_privilege('authenticated','public.kompass_english_start_vocab(text,text,text,text)','execute') THEN RAISE EXCEPTION 'Old self-selected-level route remains open';END IF;
 FOREACH level_case IN ARRAY ARRAY['G','M','E'] LOOP
  -- Clear only the synthetic child's fixture record inside this rolled-back transaction.
  UPDATE public.kompass_grade_state SET payload=jsonb_set(payload,'{records}',coalesce(payload->'records','{}')-'eng5_5|ep_demo_juliane_2026') WHERE grade=6;
  r:=public.kompass_english_start_common_vocab(tok,pin,'vocab:lwl-u4-test-1');
  IF jsonb_array_length(r->'items')<>23 OR (r->>'max_points')::integer<>26 THEN RAISE EXCEPTION 'Common structure invalid';END IF;
  IF (SELECT count(*) FROM jsonb_array_elements(r->'items') q WHERE q->>'level'='G')<>15 OR (SELECT count(*) FROM jsonb_array_elements(r->'items') q WHERE q->>'level'='M')<>5 OR (SELECT count(*) FROM jsonb_array_elements(r->'items') q WHERE q->>'level'='E')<>3 THEN RAISE EXCEPTION '15/5/3 split invalid';END IF;
  IF (SELECT count(*) FROM jsonb_array_elements(r->'items') q WHERE q->>'kind'='en-de') NOT BETWEEN 7 AND 8 OR (SELECT count(*) FROM jsonb_array_elements(r->'items') q WHERE q->>'kind'='de-en') NOT BETWEEN 7 AND 8 THEN RAISE EXCEPTION 'Both baseline translation directions required';END IF;
  IF (SELECT count(DISTINCT q->>'word_id') FROM jsonb_array_elements(r->'items') q)>20 OR EXISTS(SELECT 1 FROM jsonb_array_elements(r->'items') q WHERE q?'accepted' OR q?'word') THEN RAISE EXCEPTION 'Too many targets or answer key leak';END IF;
  SELECT jsonb_agg(jsonb_build_object('word_id',q->>'word_id','given',CASE WHEN q->>'level'='G' OR level_case IN ('M','E') AND q->>'level'='M' OR level_case='E' AND q->>'level'='E' THEN (SELECT f FROM public.kompass_english_answer_forms(q->'accepted',q->>'kind'<>'sentence') f LIMIT 1) ELSE '' END,'level','E','points',999)) INTO answers
  FROM public.kompass_english_vocab_attempts a CROSS JOIN LATERAL jsonb_array_elements(a.items) q WHERE a.id=(r->>'id')::uuid;
  v:=public.kompass_english_submit_vocab(tok,pin,(r->>'id')::uuid,answers);
  expected_points:=CASE level_case WHEN 'G' THEN 15 WHEN 'M' THEN 20 ELSE 26 END;
  IF v#>>'{outcome,level}'<>level_case OR v#>>'{outcome,status}'<>'green' OR (v->>'points')::integer<>expected_points THEN RAISE EXCEPTION 'Wrong derived % outcome: %',level_case,v;END IF;
  SELECT payload#>'{records,eng5_5|ep_demo_juliane_2026}' INTO rec FROM public.kompass_grade_state WHERE grade=6;
  IF rec->>'level'<>level_case OR rec->>'current'<>'green' OR rec#>>'{score,percent}'<>'100' OR (rec#>>'{assessmentSummary,totalScore,points}')::integer<>expected_points THEN RAISE EXCEPTION 'Kompass did not store level, points and relative status: %',rec;END IF;
 END LOOP;
 r2:=public.kompass_english_start_common_vocab(tok,pin,'vocab:lwl-u4-test-1');
 IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(r2->'items') q WHERE NOT EXISTS(SELECT 1 FROM jsonb_array_elements(r->'items') p WHERE p->>'word_id'=q->>'word_id')) THEN RAISE EXCEPTION 'No new vocabulary on repetition';END IF;
 UPDATE public.kompass_grade_state SET payload=jsonb_set(payload,'{records}',coalesce(payload->'records','{}')-'eng5_5|ep_demo_juliane_2026') WHERE grade=6;
 SELECT jsonb_agg(jsonb_build_object('word_id',q->>'word_id','given',CASE WHEN q->>'level'='E' THEN 'An alternative sentence for the teacher.' ELSE (SELECT f FROM public.kompass_english_answer_forms(q->'accepted',true) f LIMIT 1) END)) INTO answers
 FROM public.kompass_english_vocab_attempts a CROSS JOIN LATERAL jsonb_array_elements(a.items) q WHERE a.id=(r2->>'id')::uuid;
 v:=public.kompass_english_submit_vocab(tok,pin,(r2->>'id')::uuid,answers);
 IF (v->>'needs_review')::boolean IS NOT true OR v#>>'{outcome,level}'<>'M' THEN RAISE EXCEPTION 'Open E variants should retain confirmed M';END IF;
 SELECT payload#>'{records,eng5_5|ep_demo_juliane_2026}' INTO rec FROM public.kompass_grade_state WHERE grade=6;
 IF rec->>'level'<>'M' OR rec->>'current'<>'green' THEN RAISE EXCEPTION 'Confirmed M was not stored automatically';END IF;
 SELECT id INTO rid FROM public.kompass_english_results WHERE attempt_id=(r2->>'id')::uuid;
 PERFORM public.kompass_english_review_depth_vocab(rid,15,5,6,'All sentence variants checked.');
 v:=public.kompass_english_submit_vocab(tok,pin,(r2->>'id')::uuid,answers);
 IF v#>>'{outcome,level}'<>'E' OR v#>>'{outcome,status}'<>'green' OR (v->>'needs_review')::boolean THEN RAISE EXCEPTION 'Review/retry failed';END IF;
 SELECT payload#>'{records,eng5_5|ep_demo_juliane_2026}' INTO rec FROM public.kompass_grade_state WHERE grade=6;
 IF rec->>'level'<>'E' OR rec->>'source'<>'teacher' THEN RAISE EXCEPTION 'Teacher-reviewed E missing';END IF;
 -- Demonstrated depth outranks simply collecting a higher percentage in easier tasks.
 v:=public.kompass_english_depth_outcome('{"G":{"points":30,"max":30},"M":{"points":8,"max":10},"E":{"points":9,"max":12}}',24,74);
 IF v->>'level'<>'E' THEN RAISE EXCEPTION 'Highest demonstrated depth not selected';END IF;
 v:=public.kompass_english_depth_outcome('{"G":{"points":0,"max":30},"M":{"points":0,"max":10},"E":{"points":0,"max":12}}',24,74);
 IF v->>'level' IS NOT NULL OR v->>'status'<>'red' THEN RAISE EXCEPTION 'Empty answers invented a level';END IF;
 IF has_function_privilege('anon','public.kompass_english_depth_outcome(jsonb,integer,integer)','execute') OR has_function_privilege('anon','public.kompass_english_store_depth_evidence(public.kompass_english_results,boolean,text)','execute') THEN RAISE EXCEPTION 'Outcome writer exposed';END IF;
END $test$;
SELECT '15 baseline translations, 5 meanings, 3 sentences; derived G/M/E, unchanged traffic lights, automatic Kompass level/points/status, rotation, pending higher depth and teacher review passed' AS verification;
ROLLBACK;
