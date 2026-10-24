BEGIN;
CREATE OR REPLACE FUNCTION public.kompass_english_save_practice(p_token text,p_pin text,p_report jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE gate jsonb;l kompass_english_links;state jsonb;k text;entry jsonb;reports jsonb;
BEGIN
 gate:=kompass_english_check_pin(p_token,p_pin);
 IF coalesce((gate->>'ok')::boolean,false) IS NOT true THEN RETURN gate;END IF;
 IF jsonb_typeof(p_report)<>'object' OR length(p_report::text)>60000 OR coalesce(p_report->>'id','')!~'^[a-f0-9-]{36}$' OR jsonb_typeof(p_report->'controls')<>'array' OR jsonb_array_length(p_report->'controls')>100 OR jsonb_typeof(p_report->'grammar')<>'array' OR jsonb_array_length(p_report->'grammar')>100 OR (p_report->>'xp')::integer NOT BETWEEN 0 AND 1000000 THEN RAISE EXCEPTION 'Ungültiger Übungsbericht.';END IF;
 SELECT * INTO STRICT l FROM kompass_english_links WHERE active AND token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex');
 SELECT payload INTO STRICT state FROM kompass_grade_state WHERE grade=l.grade FOR UPDATE;
 k:='english_practice_log|'||l.pupil_id;
 entry:=p_report||jsonb_build_object('at',clock_timestamp(),'source','pupil_practice','selfReported',true);
 SELECT coalesce(jsonb_agg(x),'[]') INTO reports FROM (SELECT value x FROM jsonb_array_elements(coalesce(state->'records'->k->'reports','[]')) WHERE value->>'id'<>p_report->>'id' ORDER BY value->>'at' DESC LIMIT 49) q;
 state:=jsonb_set(state,'{records}',coalesce(state->'records','{}')||jsonb_build_object(k,jsonb_build_object('reports',reports||jsonb_build_array(entry))));
 UPDATE kompass_grade_state SET payload=state,updated_at=greatest(clock_timestamp(),updated_at+interval '1 microsecond') WHERE grade=l.grade;
 RETURN jsonb_build_object('ok',true,'saved',true);
END $$;
REVOKE ALL ON FUNCTION public.kompass_english_save_practice(text,text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kompass_english_save_practice(text,text,jsonb) TO anon,authenticated;
COMMIT;
