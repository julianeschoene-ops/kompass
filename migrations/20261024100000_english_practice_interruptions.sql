BEGIN;
-- Pupil-reported browser visibility only. This never changes an assessment.
CREATE OR REPLACE FUNCTION public.kompass_english_report_interruptions(p_token text,p_pin text,p_attempt_id uuid,p_count integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE checked jsonb;l public.kompass_english_links;r public.kompass_english_results;s jsonb;rec jsonb;k text;report jsonb;list_name text;old_count integer;
BEGIN
 checked:=public.kompass_english_check_pin(p_token,p_pin);
 IF coalesce((checked->>'ok')::boolean,false) IS NOT true THEN RETURN checked;END IF;
 IF p_count IS NULL OR p_count NOT BETWEEN 0 AND 1000 THEN RAISE EXCEPTION 'Ungültige Anzahl an Unterbrechungen.';END IF;
 SELECT * INTO STRICT l FROM public.kompass_english_links WHERE active AND token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex');
 SELECT * INTO r FROM public.kompass_english_results WHERE attempt_id=p_attempt_id AND grade=l.grade AND pupil_id=l.pupil_id FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'message','Eigenes Testergebnis nicht gefunden.');END IF;
 old_count:=coalesce((r.assessment_detail#>>'{interruptions,count}')::integer,0);
 IF p_count<=old_count THEN RETURN jsonb_build_object('ok',true);END IF;
 report:=jsonb_build_object('count',p_count,'source','browser_report','received_at',clock_timestamp(),'note','Vom Browser gemeldete Unterbrechungen, kein Schummelnachweis. Keine Änderung der Bewertung.');
 UPDATE public.kompass_english_results SET assessment_detail=coalesce(assessment_detail,'{}')||jsonb_build_object('interruptions',report) WHERE id=r.id;
 SELECT payload INTO STRICT s FROM public.kompass_grade_state WHERE grade=r.grade FOR UPDATE;
 k:=r.competency_id||'|'||r.pupil_id;rec:=coalesce(s->'records'->k,'{}');
 FOREACH list_name IN ARRAY ARRAY['practiceResults','history'] LOOP
  rec:=jsonb_set(rec,ARRAY[list_name],coalesce((SELECT jsonb_agg(CASE WHEN e->>'id'=r.id::text OR e->>'attemptId'=r.attempt_id::text THEN e||jsonb_build_object('interruptions',report) ELSE e END ORDER BY n) FROM jsonb_array_elements(coalesce(rec->list_name,'[]')) WITH ORDINALITY a(e,n)),'[]'));
 END LOOP;
 IF rec#>>'{practiceLatest,id}'=r.id::text THEN rec:=jsonb_set(rec,'{practiceLatest}',rec->'practiceLatest'||jsonb_build_object('interruptions',report));END IF;
 s:=jsonb_set(s,'{records}',coalesce(s->'records','{}')||jsonb_build_object(k,rec));
 UPDATE public.kompass_grade_state SET payload=s,updated_at=greatest(clock_timestamp(),updated_at+interval '1 microsecond') WHERE grade=r.grade;
 RETURN jsonb_build_object('ok',true);
END $$;
REVOKE ALL ON FUNCTION public.kompass_english_report_interruptions(text,text,uuid,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kompass_english_report_interruptions(text,text,uuid,integer) TO anon,authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
