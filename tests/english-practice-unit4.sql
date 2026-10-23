-- Synthetic competency evidence only; the entire transaction rolls back.
BEGIN;
SELECT set_config('request.jwt.claim.sub',(SELECT id::text FROM public.kompass_profiles WHERE display_name='Juliane Schöne' AND role='admin' AND active LIMIT 1),true);
DO $test$
DECLARE pid text:='unit4_check_'||gen_random_uuid()::text; tok text:=encode(sha256(convert_to(gen_random_uuid()::text,'UTF8')),'hex'); a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); title text; rec jsonb; v jsonb;
BEGIN
 UPDATE public.kompass_grade_state SET payload=jsonb_set(payload,'{pupils}',coalesce(payload->'pupils','[]'::jsonb)||jsonb_build_array(jsonb_build_object('id',pid,'first','Synthetic Unit4','year',6,'class','6d','team','Violett'))) WHERE grade=6;
 INSERT INTO public.kompass_english_links(grade,pupil_id,token_hash,pin_hash,active) VALUES(6,pid,encode(sha256(convert_to(tok,'UTF8')),'hex'),encode(sha256(convert_to(tok||':123456','UTF8')),'hex'),true);
 -- A manually awarded reading judgment must survive an automatic check.
 UPDATE public.kompass_grade_state SET payload=jsonb_set(payload,'{records}',coalesce(payload->'records','{}'::jsonb)||jsonb_build_object('eng5_23|'||pid,jsonb_build_object('source','teacher','current','yellow','level','M','score',jsonb_build_object('points',2,'max',4,'percent',50)))) WHERE grade=6;
 SELECT t.title INTO title FROM public.kompass_english_tasks t WHERE task_key='assessment:lwl-u4-reading';
 v:=public.kompass_english_submit_result(tok,a,'assessment:lwl-u4-reading',title,4,4);
 IF (v->>'saved')::boolean IS NOT true THEN RAISE EXCEPTION 'Reading writer failed'; END IF;
 v:=public.kompass_english_submit_result_v3(tok,'123456',a,'assessment:lwl-u4-reading',title,4,4,date '2000-01-01');
 IF (v->>'saved')::boolean IS NOT true THEN RAISE EXCEPTION 'Lost acknowledgment retry failed'; END IF;
 SELECT payload->'records'->('eng5_23|'||pid) INTO rec FROM public.kompass_grade_state WHERE grade=6;
 IF rec->>'source'<>'teacher' OR rec->>'current'<>'yellow' OR rec#>>'{score,points}'<>'2' OR rec->>'level'<>'M' OR jsonb_array_length(rec->'practiceResults')<>1 OR rec#>>'{practiceLatest,note}'<>'Leseverstehen-Teilnachweis' THEN RAISE EXCEPTION 'Reading evidence overwrote teacher or wrong scope'; END IF;
 SELECT t.title INTO title FROM public.kompass_english_tasks t WHERE task_key='assessment:lwl-u4-listening';
 PERFORM public.kompass_english_submit_result(tok,b,'assessment:lwl-u4-listening',title,2,4);
 SELECT payload->'records'->('eng5_16|'||pid) INTO rec FROM public.kompass_grade_state WHERE grade=6;
 IF rec#>>'{score,points}'<>'2' OR rec#>>'{score,max}'<>'4' OR rec#>>'{practiceLatest,note}'<>'Hörverstehen-Teilnachweis' THEN RAISE EXCEPTION 'Wrong listening evidence'; END IF;
 IF EXISTS(SELECT 1 FROM public.kompass_grade_state WHERE grade=6 AND payload->'records' ? ('eng5_5|'||pid)) THEN RAISE EXCEPTION 'Reading/listening wrote vocabulary competency'; END IF;
 v:=public.kompass_english_submit_result_v3(tok,'123456',gen_random_uuid(),'assessment:lwl-u4-speaking','Invented oral score',1,1,current_date);
 IF coalesce((v->>'saved')::boolean,false) OR coalesce((v->>'update_required')::boolean,false) IS NOT true THEN RAISE EXCEPTION 'Speaking accepted an automatic score'; END IF;
 BEGIN
  PERFORM public.kompass_english_submit_result(tok,gen_random_uuid(),'assessment:lwl-u4-mediation','Invented mediation score',1,1);
  RAISE EXCEPTION 'Private writer accepted a teacher-led score' USING ERRCODE='P0002';
 EXCEPTION WHEN SQLSTATE 'P0001' THEN NULL;
 END;
 IF (SELECT count(*) FROM public.kompass_english_results WHERE pupil_id=pid)<>2 THEN RAISE EXCEPTION 'Duplicate or teacher-led results written'; END IF;
 IF has_function_privilege('anon','public.kompass_english_submit_result(text,uuid,text,text,integer,integer)','execute') THEN RAISE EXCEPTION 'PINless writer exposed'; END IF;
 IF (SELECT count(DISTINCT competency_id) FROM public.kompass_english_tasks WHERE is_assessment AND unit=4)<>5 THEN RAISE EXCEPTION 'Unit 4 raster coverage missing'; END IF;
END $test$;
SELECT 'Unit 4: five competencies, reading/listening evidence, scope labels, teacher judgment preservation, retry idempotency, and rejection of invented oral scores passed' AS verification;
ROLLBACK;
