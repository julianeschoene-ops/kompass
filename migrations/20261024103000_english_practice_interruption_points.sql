BEGIN;
-- First interruption warns; each further interruption costs one point.
CREATE OR REPLACE FUNCTION public.kompass_english_penalty_outcome(p_raw jsonb,p_penalty integer)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE SET search_path=public,pg_temp AS $$
DECLARE total jsonb;attain jsonb;p integer;pct integer;status text;
BEGIN
 IF p_raw IS NULL OR p_raw='null'::jsonb THEN RETURN NULL;END IF;
 total:=p_raw->'totalScore';attain:=p_raw->'attainmentScore';
 p:=greatest(0,(total->>'points')::integer-greatest(0,p_penalty));
 total:=total||jsonb_build_object('points',p,'percent',round(p*100.0/(total->>'max')::integer));
 p:=greatest(0,(attain->>'points')::integer-greatest(0,p_penalty));pct:=round(p*100.0/(attain->>'max')::integer);
 attain:=attain||jsonb_build_object('points',p,'percent',pct);
 status:=CASE WHEN pct<=coalesce((p_raw->>'redMax')::integer,24) THEN 'red' WHEN pct<=coalesce((p_raw->>'yellowMax')::integer,74) THEN 'yellow' ELSE 'green' END;
 RETURN p_raw||jsonb_build_object('rawTotalScore',p_raw->'totalScore','rawAttainmentScore',p_raw->'attainmentScore','interruptionDeduction',greatest(0,p_penalty),'totalScore',total,'attainmentScore',attain,'status',status);
END $$;
REVOKE ALL ON FUNCTION public.kompass_english_penalty_outcome(jsonb,integer) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.kompass_english_report_interruptions(p_token text,p_pin text,p_attempt_id uuid,p_count integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE checked jsonb;l public.kompass_english_links;r public.kompass_english_results;s jsonb;rec jsonb;k text;report jsonb;list_name text;old_count integer;raw_points integer;raw_outcome jsonb;outcome jsonb;penalty integer;sc jsonb;status text;patch jsonb;comp jsonb;old_rank integer;new_rank integer;can_update boolean;
BEGIN
 checked:=public.kompass_english_check_pin(p_token,p_pin);
 IF coalesce((checked->>'ok')::boolean,false) IS NOT true THEN RETURN checked;END IF;
 IF p_count IS NULL OR p_count NOT BETWEEN 0 AND 1000 THEN RAISE EXCEPTION 'Ungültige Anzahl an Unterbrechungen.';END IF;
 SELECT * INTO STRICT l FROM public.kompass_english_links WHERE active AND token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex');
 SELECT * INTO r FROM public.kompass_english_results WHERE attempt_id=p_attempt_id AND grade=l.grade AND pupil_id=l.pupil_id FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'message','Eigenes Testergebnis nicht gefunden.');END IF;
 old_count:=coalesce((r.assessment_detail#>>'{interruptions,count}')::integer,0);
 -- Existing historical reports remain unchanged on replay. New reports use the current rule.
 IF p_count>old_count THEN
  raw_points:=coalesce((r.assessment_detail->>'unpenalized_points')::integer,r.points);
  raw_outcome:=coalesce(r.assessment_detail->'unpenalized_outcome',r.assessment_detail->'outcome');
  penalty:=greatest(0,p_count-1);
  report:=jsonb_build_object('count',p_count,'source','browser_report','received_at',clock_timestamp(),'policy','first_warning_then_one','deduction',penalty,'applied',least(raw_points,penalty),'points_before',raw_points);
  outcome:=public.kompass_english_penalty_outcome(raw_outcome,penalty);
  r.points:=greatest(0,raw_points-penalty);
  r.assessment_detail:=coalesce(r.assessment_detail,'{}')||jsonb_build_object('interruptions',report,'unpenalized_points',raw_points,'unpenalized_outcome',raw_outcome);
  IF outcome IS NOT NULL THEN r.assessment_detail:=r.assessment_detail||jsonb_build_object('outcome',outcome);END IF;
  UPDATE public.kompass_english_results SET points=r.points,assessment_detail=r.assessment_detail WHERE id=r.id;
  SELECT payload INTO STRICT s FROM public.kompass_grade_state WHERE grade=r.grade FOR UPDATE;
  k:=r.competency_id||'|'||r.pupil_id;rec:=coalesce(s->'records'->k,'{}');
  SELECT c INTO comp FROM public.kompass_shared_state ss CROSS JOIN LATERAL jsonb_array_elements(ss.payload->'competencies') c WHERE ss.id='school' AND c->>'id'=r.competency_id;
  sc:=jsonb_build_object('points',r.points,'max',r.max_points,'percent',round(r.points*100.0/r.max_points),'redMax',coalesce((comp#>>'{scoreConfig,redMax}')::integer,24),'yellowMax',coalesce((comp#>>'{scoreConfig,yellowMax}')::integer,74));
  status:=coalesce(outcome->>'status',CASE WHEN (sc->>'percent')::integer<=(sc->>'redMax')::integer THEN 'red' WHEN (sc->>'percent')::integer<=(sc->>'yellowMax')::integer THEN 'yellow' ELSE 'green' END);
  patch:=jsonb_build_object('interruptions',report,'assessmentDetail',r.assessment_detail,'score',sc,'value',status);
  IF outcome IS NOT NULL THEN patch:=patch||jsonb_build_object('outcome',outcome);END IF;
  FOREACH list_name IN ARRAY ARRAY['practiceResults','history'] LOOP
   rec:=jsonb_set(rec,ARRAY[list_name],coalesce((SELECT jsonb_agg(CASE WHEN e->>'id'=r.id::text OR e->>'attemptId'=r.attempt_id::text THEN e||patch ELSE e END ORDER BY n) FROM jsonb_array_elements(coalesce(rec->list_name,'[]')) WITH ORDINALITY a(e,n)),'[]'));
  END LOOP;
  IF rec#>>'{practiceLatest,id}'=r.id::text THEN
   rec:=jsonb_set(rec,'{practiceLatest}',rec->'practiceLatest'||patch);
   old_rank:=CASE rec->>'level' WHEN 'G' THEN 1 WHEN 'M' THEN 2 WHEN 'E' THEN 3 ELSE 0 END;
   new_rank:=CASE raw_outcome->>'level' WHEN 'G' THEN 1 WHEN 'M' THEN 2 WHEN 'E' THEN 3 ELSE 0 END;
   can_update:=rec->>'source'='english_practice' AND (NOT coalesce((r.assessment_detail->>'needs_review')::boolean,false) OR raw_outcome->>'status'='green' AND new_rank>0 AND new_rank>=old_rank);
   IF can_update THEN
    rec:=rec||jsonb_build_object('score',coalesce(outcome->'attainmentScore',sc),'current',status);
    IF outcome IS NOT NULL THEN rec:=rec||jsonb_build_object('assessmentSummary',outcome||jsonb_build_object('pendingReview',coalesce((r.assessment_detail->>'needs_review')::boolean,false)));END IF;
   END IF;
  END IF;
  s:=jsonb_set(s,'{records}',coalesce(s->'records','{}')||jsonb_build_object(k,rec));
  UPDATE public.kompass_grade_state SET payload=s,updated_at=greatest(clock_timestamp(),updated_at+interval '1 microsecond') WHERE grade=r.grade;
 END IF;
 RETURN jsonb_build_object('ok',true,'saved',true,'points',r.points,'max_points',r.max_points,'feedback',r.assessment_detail->'feedback','outcome',r.assessment_detail->'outcome','interruptions',r.assessment_detail->'interruptions','needs_review',coalesce((r.assessment_detail->>'needs_review')::boolean,false),'reviewed',coalesce((r.assessment_detail->>'reviewed')::boolean,false));
END $$;
REVOKE ALL ON FUNCTION public.kompass_english_report_interruptions(text,text,uuid,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kompass_english_report_interruptions(text,text,uuid,integer) TO anon,authenticated;
-- Score and interruption rule are committed in one transaction on new clients.
CREATE OR REPLACE FUNCTION public.kompass_english_submit_vocab_v2(p_token text,p_pin text,p_attempt_id uuid,p_answers jsonb,p_interruptions integer DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE result jsonb;
BEGIN
 IF p_interruptions IS NULL OR p_interruptions NOT BETWEEN 0 AND 1000 THEN RAISE EXCEPTION 'Ungültige Unterbrechungsdaten.';END IF;
 result:=public.kompass_english_submit_vocab(p_token,p_pin,p_attempt_id,p_answers);
 IF coalesce((result->>'saved')::boolean,false) AND p_interruptions>0 THEN result:=public.kompass_english_report_interruptions(p_token,p_pin,p_attempt_id,p_interruptions);END IF;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.kompass_english_submit_vocab_v2(text,text,uuid,jsonb,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kompass_english_submit_vocab_v2(text,text,uuid,jsonb,integer) TO anon,authenticated;
CREATE OR REPLACE FUNCTION public.kompass_english_submit_result_v4(p_token text,p_pin text,p_attempt_id uuid,p_task_key text,p_topic text,p_points integer,p_max_points integer,p_test_date date,p_interruptions integer DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE result jsonb;
BEGIN
 IF p_interruptions IS NULL OR p_interruptions NOT BETWEEN 0 AND 1000 THEN RAISE EXCEPTION 'Ungültige Unterbrechungsdaten.';END IF;
 result:=public.kompass_english_submit_result_v3(p_token,p_pin,p_attempt_id,p_task_key,p_topic,p_points,p_max_points,p_test_date);
 IF coalesce((result->>'saved')::boolean,false) AND p_interruptions>0 THEN result:=public.kompass_english_report_interruptions(p_token,p_pin,p_attempt_id,p_interruptions);END IF;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.kompass_english_submit_result_v4(text,text,uuid,text,text,integer,integer,date,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kompass_english_submit_result_v4(text,text,uuid,text,text,integer,integer,date,integer) TO anon,authenticated;

CREATE OR REPLACE FUNCTION public.kompass_english_review_depth_vocab(p_id uuid, p_g integer, p_m integer, p_e integer, p_note text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE r public.kompass_english_results;outcome jsonb;scores jsonb;actor text;comp jsonb;deduction integer;raw_outcome jsonb;
BEGIN
 SELECT * INTO r FROM public.kompass_english_results WHERE id=p_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Ergebnis nicht gefunden.';END IF;
 IF NOT public.kompass_english_teacher_access(r.grade,false) THEN RAISE EXCEPTION 'Keine Bewertungsberechtigung.' USING ERRCODE='42501';END IF;
 IF r.assessment_detail->>'policy' IS DISTINCT FROM 'common_depth_v1' OR coalesce((r.assessment_detail->>'needs_review')::boolean,false) IS NOT true THEN RAISE EXCEPTION 'Dieser Nachweis wartet nicht auf eine Tiefenprüfung.';END IF;
 IF length(coalesce(p_note,''))>1000 THEN RAISE EXCEPTION 'Anmerkung zu lang.';END IF;
 SELECT c INTO comp FROM public.kompass_shared_state ss CROSS JOIN LATERAL jsonb_array_elements(ss.payload->'competencies') c WHERE ss.id='school' AND c->>'id'=r.competency_id;
 scores:=jsonb_build_object('G',jsonb_build_object('points',p_g,'max',r.assessment_detail#>'{outcome,byLevel,G,max}'),'M',jsonb_build_object('points',p_m,'max',r.assessment_detail#>'{outcome,byLevel,M,max}'),'E',jsonb_build_object('points',p_e,'max',r.assessment_detail#>'{outcome,byLevel,E,max}'));
 IF p_g IS NULL OR p_m IS NULL OR p_e IS NULL THEN RAISE EXCEPTION 'Bitte Punkte für alle Teile angeben.';END IF;
 outcome:=public.kompass_english_depth_outcome(scores,coalesce((comp#>>'{scoreConfig,redMax}')::integer,24),coalesce((comp#>>'{scoreConfig,yellowMax}')::integer,74));
 SELECT display_name INTO actor FROM public.kompass_profiles WHERE id=auth.uid();
 raw_outcome:=outcome;deduction:=CASE WHEN r.assessment_detail#>>'{interruptions,policy}'='first_warning_then_one' THEN coalesce((r.assessment_detail#>>'{interruptions,deduction}')::integer,0) ELSE 0 END;
 outcome:=public.kompass_english_penalty_outcome(raw_outcome,deduction);
 r.points:=greatest(0,p_g+p_m+p_e-deduction);
 IF r.assessment_detail#>>'{interruptions,policy}'='first_warning_then_one' THEN
  r.assessment_detail:=r.assessment_detail||jsonb_build_object('unpenalized_points',p_g+p_m+p_e,'unpenalized_outcome',raw_outcome,'interruptions',(r.assessment_detail->'interruptions')||jsonb_build_object('points_before',p_g+p_m+p_e,'applied',least(p_g+p_m+p_e,deduction)));
 END IF;r.assessment_level:=outcome->>'level';r.assessment_detail:=r.assessment_detail||jsonb_build_object('outcome',outcome,'automatic_outcome',r.assessment_detail->'outcome','needs_review',false,'reviewed',true,'reviewed_name',actor,'reviewed_by',auth.uid(),'reviewed_at',clock_timestamp(),'review_note',coalesce(p_note,''));
 UPDATE public.kompass_english_results SET points=r.points,assessment_level=r.assessment_level,assessment_detail=r.assessment_detail WHERE id=r.id;
 PERFORM public.kompass_english_store_depth_evidence(r,true,p_note);
END $function$;

CREATE OR REPLACE FUNCTION public.kompass_english_my_results(p_token text, p_pin text, p_result_id uuid DEFAULT NULL::uuid, p_before timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE checked jsonb;l public.kompass_english_links;r public.kompass_english_results;rows jsonb;cursor_at timestamptz;
BEGIN
 checked:=public.kompass_english_check_pin(p_token,p_pin);
 IF coalesce((checked->>'ok')::boolean,false) IS NOT true THEN RETURN checked;END IF;
 SELECT * INTO STRICT l FROM public.kompass_english_links WHERE active AND token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex');
 IF p_result_id IS NOT NULL THEN
  SELECT * INTO r FROM public.kompass_english_results WHERE id=p_result_id AND grade=l.grade AND pupil_id=l.pupil_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'message','Dieser Test ist nicht verfügbar.');END IF;
  RETURN jsonb_build_object('ok',true,'result',jsonb_build_object('id',r.id,'title',regexp_replace(r.topic,' · (gemeinsamer Lernnachweis|Testniveau [GME])$',''),'submitted_at',r.submitted_at,'points',r.points,'max_points',r.max_points,'interruptions',r.assessment_detail->'interruptions','outcome',r.assessment_detail->'outcome','needs_review',coalesce((r.assessment_detail->>'needs_review')::boolean,false),'reviewed',coalesce((r.assessment_detail->>'reviewed')::boolean,false),'feedback',coalesce(r.assessment_detail->'feedback','[]'::jsonb)));
 END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',q.id,'title',regexp_replace(q.topic,' · (gemeinsamer Lernnachweis|Testniveau [GME])$',''),'submitted_at',q.submitted_at,'points',q.points,'max_points',q.max_points,'interruptions',q.assessment_detail->'interruptions','level',q.assessment_level,'status',q.assessment_detail#>>'{outcome,status}','needs_review',coalesce((q.assessment_detail->>'needs_review')::boolean,false)) ORDER BY q.submitted_at DESC),'[]'::jsonb),min(q.submitted_at)
 INTO rows,cursor_at FROM (SELECT * FROM public.kompass_english_results WHERE grade=l.grade AND pupil_id=l.pupil_id AND (p_before IS NULL OR submitted_at<p_before) ORDER BY submitted_at DESC LIMIT 50) q;
 RETURN jsonb_build_object('ok',true,'results',rows,'next_before',CASE WHEN EXISTS(SELECT 1 FROM public.kompass_english_results WHERE grade=l.grade AND pupil_id=l.pupil_id AND submitted_at<cursor_at) THEN cursor_at ELSE NULL END);
END $function$;

NOTIFY pgrst,'reload schema';
COMMIT;

