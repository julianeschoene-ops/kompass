BEGIN;
DO $test$
DECLARE tok text;pin text;r public.kompass_english_results;response jsonb;before_rec jsonb;after_rec jsonb;
BEGIN
 SELECT print_token,print_pin INTO STRICT tok,pin FROM public.kompass_english_links WHERE grade=6 AND pupil_id='ep_demo_juliane_2026' AND active;
 SELECT * INTO STRICT r FROM public.kompass_english_results WHERE grade=6 AND pupil_id='ep_demo_juliane_2026' ORDER BY submitted_at DESC LIMIT 1;
 SELECT payload->'records'->(r.competency_id||'|'||r.pupil_id) INTO before_rec FROM public.kompass_grade_state WHERE grade=r.grade;
 response:=public.kompass_english_report_interruptions(tok,pin,r.attempt_id,2);IF (response->>'ok')::boolean IS NOT TRUE THEN RAISE EXCEPTION 'Report failed';END IF;
 PERFORM public.kompass_english_report_interruptions(tok,pin,r.attempt_id,2);
 PERFORM public.kompass_english_report_interruptions(tok,pin,r.attempt_id,1);
 SELECT payload->'records'->(r.competency_id||'|'||r.pupil_id) INTO after_rec FROM public.kompass_grade_state WHERE grade=r.grade;
 IF after_rec->'score' IS DISTINCT FROM before_rec->'score' OR after_rec->'level' IS DISTINCT FROM before_rec->'level' OR after_rec->'current' IS DISTINCT FROM before_rec->'current' THEN RAISE EXCEPTION 'Interruption changed assessment';END IF;
 IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(after_rec->'practiceResults') e WHERE e->>'id'=r.id::text AND e#>>'{interruptions,count}'='2') THEN RAISE EXCEPTION 'Teacher evidence missing';END IF;
 IF NOT EXISTS(SELECT 1 FROM public.kompass_english_results WHERE id=r.id AND points=r.points AND max_points=r.max_points AND assessment_level IS NOT DISTINCT FROM r.assessment_level AND assessment_detail#>>'{interruptions,count}'='2') THEN RAISE EXCEPTION 'Scores changed or retry duplicated';END IF;
 response:=public.kompass_english_report_interruptions(tok,pin,gen_random_uuid(),5);IF (response->>'ok')::boolean IS TRUE THEN RAISE EXCEPTION 'Foreign/unknown result accepted';END IF;
 response:=public.kompass_english_report_interruptions(tok,'000000',r.attempt_id,3);IF (response->>'ok')::boolean IS TRUE THEN RAISE EXCEPTION 'Wrong PIN accepted';END IF;
END $test$;
SELECT 'Interruption report is private and idempotent; KOMPASS evidence receives count, scores/level/ampel unchanged' AS verification;
ROLLBACK;
