BEGIN;
-- One visible point per additional tab departure on the new half-point scale.
CREATE OR REPLACE FUNCTION public.kompass_english_report_interruptions(p_token text, p_pin text, p_attempt_id uuid, p_count integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
  penalty:=greatest(0,p_count-1)*CASE WHEN r.max_points=60 THEN 2 ELSE 1 END;
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
END $function$
;
COMMIT;
