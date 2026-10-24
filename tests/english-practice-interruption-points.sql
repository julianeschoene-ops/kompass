BEGIN;
SELECT set_config('request.jwt.claim.sub',(SELECT id::text FROM public.kompass_profiles WHERE display_name='Juliane Schöne' AND role='admin' AND active LIMIT 1),true);
DO $test$
DECLARE tok text;pin text;start_result jsonb;answers jsonb;r jsonb;again jsonb;count_case integer;expected integer;rid uuid;rec jsonb;
BEGIN
 SELECT print_token,print_pin INTO STRICT tok,pin FROM public.kompass_english_links WHERE grade=6 AND pupil_id='ep_demo_juliane_2026' AND active;
 UPDATE public.kompass_english_links SET test_override_until=clock_timestamp()+interval '1 hour' WHERE grade=6 AND pupil_id='ep_demo_juliane_2026';
 FOREACH count_case IN ARRAY ARRAY[0,1,2,3,100] LOOP
  UPDATE public.kompass_grade_state SET payload=jsonb_set(payload,'{records}',coalesce(payload->'records','{}')-'eng5_5|ep_demo_juliane_2026') WHERE grade=6;
  start_result:=public.kompass_english_start_common_vocab(tok,pin,'vocab:lwl-u4-test-1');
  SELECT jsonb_agg(jsonb_build_object('word_id',q->>'word_id','given',(SELECT f FROM public.kompass_english_answer_forms(q->'accepted',q->>'kind'<>'sentence') f LIMIT 1))) INTO answers FROM public.kompass_english_vocab_attempts a CROSS JOIN LATERAL jsonb_array_elements(a.items) q WHERE a.id=(start_result->>'id')::uuid;
  r:=public.kompass_english_submit_vocab_v2(tok,pin,(start_result->>'id')::uuid,answers,count_case);
  expected:=greatest(0,26-greatest(0,count_case-1));
  IF (r->>'points')::integer<>expected OR (r#>>'{outcome,totalScore,points}')::integer<>expected OR (r#>>'{outcome,attainmentScore,points}')::integer<>expected THEN RAISE EXCEPTION 'Wrong deduction for % switches: %',count_case,r;END IF;
  again:=public.kompass_english_submit_vocab_v2(tok,pin,(start_result->>'id')::uuid,answers,count_case);
  IF (again->>'points')::integer<>expected THEN RAISE EXCEPTION 'Duplicate penalty on retry';END IF;
  SELECT payload#>'{records,eng5_5|ep_demo_juliane_2026}' INTO rec FROM public.kompass_grade_state WHERE grade=6;
  IF (rec#>>'{score,points}')::integer<>expected OR (rec#>>'{assessmentSummary,totalScore,points}')::integer<>expected OR rec->>'current' IS DISTINCT FROM r#>>'{outcome,status}' THEN RAISE EXCEPTION 'Kompass score or ampelta mismatches';END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(r->'feedback') f WHERE (f->>'points')::integer<>(f->>'max_points')::integer) THEN RAISE EXCEPTION 'Task points mutated by conduct penalty';END IF;
 END LOOP;
 -- Raw G quality sets depth; adjusted points use the existing traffic-light thresholds.
 r:=public.kompass_english_penalty_outcome(public.kompass_english_depth_outcome('{"G":{"points":15,"max":15},"M":{"points":0,"max":5},"E":{"points":0,"max":6}}',24,74),4);
 IF r->>'level'<>'G' OR r->>'status'<>'yellow' OR r#>>'{attainmentScore,points}'<>'11' THEN RAISE EXCEPTION 'Relative fulfillment not adjusted correctly';END IF;
 start_result:=public.kompass_english_start_common_vocab(tok,pin,'vocab:lwl-u4-test-1');
 SELECT jsonb_agg(jsonb_build_object('word_id',q->>'word_id','given',CASE WHEN q->>'kind'='sentence' THEN 'A sentence variant for review.' ELSE (SELECT f FROM public.kompass_english_answer_forms(q->'accepted',true) f LIMIT 1) END)) INTO answers FROM public.kompass_english_vocab_attempts a CROSS JOIN LATERAL jsonb_array_elements(a.items) q WHERE a.id=(start_result->>'id')::uuid;
 r:=public.kompass_english_submit_vocab_v2(tok,pin,(start_result->>'id')::uuid,answers,3);
 IF (r->>'points')::integer<>18 OR (r->>'needs_review')::boolean IS NOT TRUE THEN RAISE EXCEPTION 'Pending sentence assessment failed';END IF;
 SELECT id INTO rid FROM public.kompass_english_results WHERE attempt_id=(start_result->>'id')::uuid;
 PERFORM public.kompass_english_review_depth_vocab(rid,15,5,6,'Sentence variants accepted; interruption rule remains.');
 r:=public.kompass_english_submit_vocab_v2(tok,pin,(start_result->>'id')::uuid,answers,3);
 IF (r->>'points')::integer<>24 OR (r->>'needs_review')::boolean OR r#>>'{interruptions,deduction}'<>'2' THEN RAISE EXCEPTION 'Teacher review removed or doubled penalty';END IF;
 r:=public.kompass_english_my_results(tok,pin,rid);
 IF r#>>'{result,points}'<>'24' OR r#>>'{result,interruptions,deduction}'<>'2' THEN RAISE EXCEPTION 'Pupil history missing adjusted result';END IF;
END $test$;
SELECT 'First switch warns, further switches cost one point; clamp at zero, idempotence, relative ampelta, unchanged answer marks, teacher review and history verified' AS verification;
ROLLBACK;
