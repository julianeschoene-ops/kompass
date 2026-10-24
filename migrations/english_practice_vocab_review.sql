BEGIN;
CREATE OR REPLACE FUNCTION public.kompass_english_review_vocab(p_id uuid,p_points integer,p_note text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE r public.kompass_english_results;s jsonb;rec jsonb;k text;comp jsonb;score jsonb;status text;entry jsonb;actor text;detail jsonb;stamp timestamptz:=clock_timestamp();d text;
BEGIN
 SELECT * INTO r FROM public.kompass_english_results WHERE id=p_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Ergebnis nicht gefunden.';END IF;
 IF NOT public.kompass_english_teacher_access(r.grade,false) THEN RAISE EXCEPTION 'Keine Berechtigung zur Bewertung.' USING ERRCODE='42501';END IF;
 IF coalesce((r.assessment_detail->>'needs_review')::boolean,false) IS NOT true THEN RAISE EXCEPTION 'Dieser Versuch wartet nicht mehr auf Prüfung.';END IF;
 IF p_points IS NULL OR p_points NOT BETWEEN 0 AND r.max_points OR length(coalesce(p_note,''))>1000 THEN RAISE EXCEPTION 'Bitte gültige Gesamtpunkte angeben.';END IF;
 SELECT c INTO comp FROM public.kompass_shared_state ss CROSS JOIN LATERAL jsonb_array_elements(ss.payload->'competencies') c WHERE ss.id='school' AND c->>'id'=r.competency_id AND c->>'subject'='Englisch';
 IF NOT FOUND THEN RAISE EXCEPTION 'Kompetenz fehlt.';END IF;
 SELECT payload INTO STRICT s FROM public.kompass_grade_state WHERE grade=r.grade FOR UPDATE;
 k:=r.competency_id||'|'||r.pupil_id;rec:=coalesce(s->'records'->k,'{}'::jsonb);
 SELECT display_name INTO actor FROM public.kompass_profiles WHERE id=auth.uid();d:=to_char(stamp AT TIME ZONE 'Europe/Berlin','DD.MM.YYYY');
 score:=jsonb_build_object('points',p_points,'max',r.max_points,'percent',round(p_points*100.0/r.max_points),'redMax',coalesce((comp#>>'{scoreConfig,redMax}')::numeric,24),'yellowMax',coalesce((comp#>>'{scoreConfig,yellowMax}')::numeric,74));
 status:=CASE WHEN (score->>'percent')::numeric<=(score->>'redMax')::numeric THEN 'red' WHEN (score->>'percent')::numeric<=(score->>'yellowMax')::numeric THEN 'yellow' ELSE 'green' END;
 detail:=r.assessment_detail||jsonb_build_object('needs_review',false,'reviewed',true,'reviewed_by',auth.uid(),'reviewed_at',stamp,'review_note',coalesce(p_note,''),'automatic_points',r.points);
 UPDATE public.kompass_english_results SET points=p_points,assessment_detail=detail WHERE id=r.id;
 rec:=jsonb_set(rec,'{practiceResults}',coalesce((SELECT jsonb_agg(CASE WHEN x->>'id'=r.id::text THEN x||jsonb_build_object('score',score,'value',status,'needsReview',false,'reviewed',true,'reviewNote',coalesce(p_note,''),'reviewedBy',actor,'assessmentDetail',detail) ELSE x END) FROM jsonb_array_elements(coalesce(rec->'practiceResults','[]')) x),'[]'));
 rec:=jsonb_set(rec,'{history}',coalesce((SELECT jsonb_agg(CASE WHEN x->>'id'=r.id::text THEN x||jsonb_build_object('needsReview',false,'reviewed',true) ELSE x END) FROM jsonb_array_elements(coalesce(rec->'history','[]')) x),'[]'));
 entry:=jsonb_build_object('id',r.id::text||':teacher-review','date',d,'at',stamp,'teacher',actor,'source','teacher','value',status,'level',rec->'level','score',score,'note','Vokabel-Lernnachweis geprüft. '||coalesce(p_note,''));
 rec:=rec||jsonb_build_object('current',status,'score',score,'source','teacher','history',coalesce(rec->'history','[]')||entry);
 IF rec#>>'{practiceLatest,id}'=r.id::text THEN rec:=jsonb_set(rec,'{practiceLatest}',(SELECT x FROM jsonb_array_elements(rec->'practiceResults') x WHERE x->>'id'=r.id::text LIMIT 1));END IF;
 IF status='green' AND nullif(rec->>'firstGreen','') IS NULL THEN rec:=rec||jsonb_build_object('firstGreen',d);END IF;
 s:=jsonb_set(s,'{records}',coalesce(s->'records','{}')||jsonb_build_object(k,rec));
 UPDATE public.kompass_grade_state SET payload=s,updated_at=greatest(stamp,updated_at+interval '1 microsecond') WHERE grade=r.grade;
END $$;
REVOKE ALL ON FUNCTION public.kompass_english_review_vocab(uuid,integer,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.kompass_english_review_vocab(uuid,integer,text) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
