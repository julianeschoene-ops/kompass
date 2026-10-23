-- Supplementary checks authored for the existing Unit-4 LWL/raster.
-- They are not copies of unavailable IServ test questions.
BEGIN;
INSERT INTO public.kompass_english_tasks(task_key,title,unit,competency_id,is_assessment,expected_questions,source_ref,assessment_config) VALUES
 ('assessment:lwl-u4-reading','Unit 4 · Leseverstehen: Worum geht es?',4,'eng5_23',true,4,'LWL4_Year_5_Orange_Line_SuS.pdf · Unit 4 · ergänzender Kompetenzcheck','{"unit": 4, "source": "Ergänzender Kompetenzcheck zur LWL · Unit 4", "range": "Where I live", "id": "u4-reading", "kind": "reading", "title": "Unit 4 · Leseverstehen: Worum geht es?", "competency": "eng5_23", "scope": "Leseverstehen-Teilnachweis", "questions": [{"text": "A kangaroo is missing from the zoo. It is near the sports centre. Please do not go near it. Call the zoo if you see it.", "q": "Worum geht es hauptsächlich?", "options": ["Ein Sportfest für Kinder.", "Ein Tier ist aus dem Zoo verschwunden.", "Ein neuer Bus fährt zum Zoo."], "answer": 1}, {"text": "Our youth club is open on Friday from three to six. You can play games or meet your friends. Bring a sandwich if you are hungry.", "q": "Welche Überschrift passt am besten?", "options": ["Friday at the youth club", "A visit to the museum", "Shopping on Saturday"], "answer": 0}, {"text": "The bridge near the church is closed today. To get to the park, go along River Street and use the bridge next to the swimming pool.", "q": "Was möchte die Mitteilung vor allem erklären?", "options": ["Warum die Kirche berühmt ist.", "Welche Spiele man im Park spielen kann.", "Wie man trotz einer gesperrten Brücke zum Park kommt."], "answer": 2}, {"text": "On Saturday, our class helps at the park. We pick up rubbish and plant flowers. Everyone can help. We meet at the park gate at ten.", "q": "Was ist das Hauptthema?", "options": ["Gemeinsam den Park schöner machen.", "Ein Wettkampf im Schwimmbad.", "Ein Ausflug mit der Fähre."], "answer": 0}], "instructions": "Lies vier kurze Texte. Wähle jeweils die passende Hauptaussage. Du erhältst die Auswertung nach der letzten Aufgabe.", "question_count": 4, "task_key": "assessment:lwl-u4-reading"}'::jsonb),
 ('assessment:lwl-u4-listening','Unit 4 · Hörverstehen: Kurze Gespräche',4,'eng5_16',true,4,'LWL4_Year_5_Orange_Line_SuS.pdf · Unit 4 · ergänzender Kompetenzcheck','{"unit": 4, "source": "Ergänzender Kompetenzcheck zur LWL · Unit 4", "range": "Where I live", "id": "u4-listening", "kind": "listening", "title": "Unit 4 · Hörverstehen: Kurze Gespräche", "competency": "eng5_16", "scope": "Hörverstehen-Teilnachweis", "questions": [{"text": "Hi Ella. Where is the museum? Go straight on and turn left at the church. Is it opposite the park? Yes, it is.", "q": "Wo ist das Museum?", "options": ["Neben dem Bahnhof.", "Gegenüber dem Park.", "Im Einkaufszentrum."], "answer": 1}, {"text": "Hi Ben. Shall we meet at the swimming pool at three? I have football then. What about four? Four is fine. See you at the swimming pool.", "q": "Wann treffen sich die beiden?", "options": ["Um 16 Uhr.", "Um 15 Uhr.", "Um 14 Uhr."], "answer": 0}, {"text": "Excuse me. Does this bus go to the sports centre? No. Take the number six from the bus stop opposite the supermarket. Thank you.", "q": "Wie kommt die Person zum Sportzentrum?", "options": ["Mit der Straßenbahn am Museum.", "Zu Fuß durch den Park.", "Mit Bus Nummer 6 gegenüber dem Supermarkt."], "answer": 2}, {"text": "Hi Mia. Do you want to go to the skate park? Not today. It is raining. Let us go to the youth club. Good idea. We can play games there.", "q": "Warum gehen die beiden zum Jugendtreff?", "options": ["Der Skatepark ist zu weit weg.", "Es regnet und sie möchten drinnen spielen.", "Sie müssen dort ein Fahrrad abholen."], "answer": 1}], "instructions": "Höre vier kurze Gespräche und beantworte jeweils eine Frage. Du kannst jedes Gespräch zweimal anhören. Nutze Kopfhörer. Prüfe vor dem Start mit „Audio testen“, ob du die Stimme gut hörst.", "question_count": 4, "task_key": "assessment:lwl-u4-listening"}'::jsonb),
 ('assessment:lwl-u4-speaking','Unit 4 · Sprechen: Einen Weg beschreiben',4,'eng5_30',true,1,'LWL4_Year_5_Orange_Line_SuS.pdf · Unit 4 · ergänzender Kompetenzcheck','{"unit": 4, "source": "Ergänzender Kompetenzcheck zur LWL · Unit 4", "range": "Where I live", "id": "u4-speaking", "kind": "teacher", "title": "Unit 4 · Sprechen: Einen Weg beschreiben", "competency": "eng5_30", "scope": "Mündlicher Nachweis · Lehrkraftbewertung", "instructions": "Führe diese Aufgabe mit deiner Lehrkraft durch. Sprich auf Englisch. Das Ergebnis trägt deine Lehrkraft direkt bei der angezeigten Kompetenz in KOMPASS ein.", "prompt": "Eine englischsprachige Besucherin steht mit dir am Schultor. Erkläre ihr den Weg zur nächsten Bushaltestelle oder zu einem anderen gemeinsam ausgewählten Ort. Beschreibe den Weg in der richtigen Reihenfolge und beantworte eine Rückfrage. Deine Lehrkraft legt vor dem Start den Zielort mit dir fest.", "criteria": ["Der gewählte Zielort ist anhand der Beschreibung erreichbar.", "Die Schritte stehen in einer nachvollziehbaren Reihenfolge.", "Passende Richtungs- und Ortsangaben werden verwendet, z. B. straight on, left/right, opposite.", "Die Aussprache ist verständlich und eine einfache Rückfrage wird beantwortet."], "question_count": 1, "task_key": "assessment:lwl-u4-speaking"}'::jsonb),
 ('assessment:lwl-u4-mediation','Unit 4 · Sprachmittlung: Informationen weitergeben',4,'eng5_41',true,1,'LWL4_Year_5_Orange_Line_SuS.pdf · Unit 4 · ergänzender Kompetenzcheck','{"unit": 4, "source": "Ergänzender Kompetenzcheck zur LWL · Unit 4", "range": "Where I live", "id": "u4-mediation", "kind": "teacher", "title": "Unit 4 · Sprachmittlung: Informationen weitergeben", "competency": "eng5_41", "scope": "Sprachmittlungsnachweis · Lehrkraftbewertung", "instructions": "Führe die Aufgabe mit deiner Lehrkraft durch. Erkläre die wichtigen Informationen auf Deutsch. Das Ergebnis trägt deine Lehrkraft direkt bei der angezeigten Kompetenz in KOMPASS ein.", "stimulus": "Town Museum: Open Tuesday to Sunday, 10 am to 4 pm. Entry is free. The museum is opposite the park. Today the bridge near the church is closed. Please use the bridge next to the swimming pool.", "prompt": "Dein kleiner Bruder versteht das englische Schild nicht. Er möchte heute ins Museum und fragt: Wann kann ich hinein? Muss ich bezahlen? Wo ist es? Welche Brücke kann ich heute benutzen? Erkläre ihm die Informationen sinngemäß auf Deutsch. Du musst nicht jedes Wort übersetzen.", "criteria": ["Öffnungstage und Uhrzeit werden verständlich wiedergegeben.", "Es wird deutlich, dass der Eintritt kostenlos ist.", "Die Lage gegenüber dem Park wird richtig erklärt.", "Die gesperrte Brücke und die nutzbare Alternative werden richtig weitergegeben."], "question_count": 1, "task_key": "assessment:lwl-u4-mediation"}'::jsonb) ON CONFLICT(task_key) DO NOTHING;
CREATE OR REPLACE FUNCTION public.kompass_english_submit_result(
  p_token text, p_attempt_id uuid, p_task_key text, p_topic text, p_points integer, p_max_points integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_link public.kompass_english_links; v_result public.kompass_english_results;
BEGIN
  PERFORM public.kompass_english_resolve_code(p_token);
  SELECT * INTO STRICT v_link FROM public.kompass_english_links
    WHERE token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex') AND active FOR UPDATE;
  IF p_attempt_id IS NULL OR p_task_key IS NULL OR length(p_task_key) NOT BETWEEN 1 AND 80
    OR p_topic IS NULL OR length(p_topic) NOT BETWEEN 1 AND 200
    OR NOT EXISTS(SELECT 1 FROM public.kompass_english_tasks t WHERE t.task_key=p_task_key AND t.is_assessment AND coalesce(t.assessment_config->>'kind','vocabulary')<>'teacher') OR p_points IS NULL OR p_max_points IS NULL
    OR p_max_points NOT BETWEEN 1 AND 500 OR p_points NOT BETWEEN 0 AND p_max_points THEN
    RAISE EXCEPTION 'Ungültiges Testergebnis.';
  END IF;
  SELECT * INTO v_result FROM public.kompass_english_results
    WHERE grade=v_link.grade AND pupil_id=v_link.pupil_id AND attempt_id=p_attempt_id;
  IF FOUND THEN
    IF (v_result.task_key,v_result.topic,v_result.points,v_result.max_points)
      IS DISTINCT FROM (p_task_key,p_topic,p_points,p_max_points) THEN
      RAISE EXCEPTION 'Dieser Versuch wurde bereits mit anderem Inhalt gespeichert.';
    END IF;
    RETURN jsonb_build_object('saved',true,'attempt_id',p_attempt_id);
  END IF;
  IF (SELECT count(*) FROM public.kompass_english_results WHERE grade=v_link.grade
    AND pupil_id=v_link.pupil_id AND submitted_at>now()-interval '1 day') >= 200 THEN
    RAISE EXCEPTION 'Tageslimit erreicht. Bitte die Lehrkraft fragen.';
  END IF;
  INSERT INTO public.kompass_english_results(grade,pupil_id,attempt_id,task_key,topic,points,max_points)
    VALUES(v_link.grade,v_link.pupil_id,p_attempt_id,p_task_key,p_topic,p_points,p_max_points);
  RETURN jsonb_build_object('saved',true,'attempt_id',p_attempt_id);
END $$;

CREATE OR REPLACE FUNCTION public.kompass_english_submit_result_v3(
 p_token text,p_pin text,p_attempt_id uuid,p_task_key text,p_topic text,
 p_points integer,p_max_points integer,p_test_date date)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v jsonb; v_title text; v_at timestamptz; v_existing boolean; v_expected integer; v_kind text;
BEGIN
 v:=public.kompass_english_check_pin(p_token,p_pin);
 IF NOT (v->>'ok')::boolean THEN RETURN v; END IF;
 SELECT title,expected_questions,coalesce(assessment_config->>'kind','vocabulary') INTO v_title,v_expected,v_kind FROM public.kompass_english_tasks WHERE task_key=p_task_key AND is_assessment;
 IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'practice_only',true,'message','Dies ist eine Übung, kein Test laut Lernwegeliste. Kein Ergebnis übertragen. Bitte die Seite neu laden und den vorgesehenen LWL-Test öffnen.'); END IF;
 IF v_kind='teacher' THEN RETURN jsonb_build_object('ok',false,'update_required',true,'message','Diese Aufgabe wird von der Lehrkraft direkt in der Kompetenz bewertet. Es gibt keine automatische Punkteübertragung.'); END IF;
 IF p_max_points IS DISTINCT FROM v_expected THEN RETURN jsonb_build_object('ok',false,'update_required',true,'message','Unvollständiger LWL-Test. Bitte die Seite neu laden und den vollständigen Test öffnen.'); END IF;
 -- Lost acknowledgments may be retried after closing, without adding evidence.
 SELECT EXISTS(SELECT 1 FROM public.kompass_english_results r JOIN public.kompass_english_links l
  ON l.grade=r.grade AND l.pupil_id=r.pupil_id
  WHERE l.token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex') AND r.attempt_id=p_attempt_id) INTO v_existing;
 v_at:=clock_timestamp();
 IF NOT v_existing AND (NOT public.kompass_english_in_test_window(v_at)
   OR p_test_date IS NULL OR p_test_date<>(v_at AT TIME ZONE 'Europe/Berlin')::date) THEN
  v:=public.kompass_english_window_at(v_at);
  RETURN v||jsonb_build_object('ok',false,'window_closed',true,'message',CASE WHEN (v->>'open')::boolean THEN 'Dieser Versuch stammt von einem anderen Tag und kann nicht übertragen werden.' ELSE v->>'message' END);
 END IF;
 RETURN public.kompass_english_submit_result(p_token,p_attempt_id,p_task_key,v_title,p_points,p_max_points)||jsonb_build_object('ok',true);
END $$;
CREATE OR REPLACE FUNCTION public.kompass_english_apply_evidence(v_result public.kompass_english_results)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_state jsonb; v_record jsonb; v_comp jsonb; v_key text; v_score jsonb; v_entry jsonb;
 v_status text; v_percent integer; v_manual boolean; v_date text;
BEGIN
 SELECT c INTO v_comp FROM public.kompass_shared_state s,
  LATERAL jsonb_array_elements(coalesce(s.payload->'competencies','[]'::jsonb)) c
  WHERE s.id='school' AND c->>'id'=v_result.competency_id AND c->>'subject'='Englisch' AND c->>'type'='core';
 IF NOT FOUND THEN RAISE EXCEPTION 'Englischkompetenz nicht gefunden.'; END IF;
 SELECT payload INTO STRICT v_state FROM public.kompass_grade_state WHERE grade=v_result.grade FOR UPDATE;
 v_key:=v_result.competency_id||'|'||v_result.pupil_id;
 v_record:=coalesce(v_state->'records'->v_key,'{}'::jsonb);
 IF EXISTS (SELECT 1 FROM jsonb_array_elements(coalesce(v_record->'practiceResults','[]'::jsonb)) p WHERE p->>'id'=v_result.id::text) THEN RETURN; END IF;
 v_percent:=round(v_result.points*100.0/v_result.max_points);
 v_status:=CASE WHEN v_percent<=coalesce((v_comp#>>'{scoreConfig,redMax}')::numeric,24) THEN 'red'
  WHEN v_percent<=coalesce((v_comp#>>'{scoreConfig,yellowMax}')::numeric,74) THEN 'yellow' ELSE 'green' END;
 v_score:=jsonb_build_object('points',v_result.points,'max',v_result.max_points,'percent',v_percent,
  'redMax',coalesce((v_comp#>>'{scoreConfig,redMax}')::numeric,24),'yellowMax',coalesce((v_comp#>>'{scoreConfig,yellowMax}')::numeric,74));
 v_date:=to_char(v_result.submitted_at AT TIME ZONE 'Europe/Berlin','DD.MM.YYYY');
 v_entry:=jsonb_build_object('id',v_result.id::text,'attemptId',v_result.attempt_id,'taskKey',v_result.task_key,
  'topic',v_result.topic,'at',v_result.submitted_at,'date',v_date,'teacher','English Practice',
  'source','english_practice','value',v_status,'level',v_record->'level','score',v_score,'note',(SELECT coalesce(t.assessment_config->>'scope','Wortschatz-Teilnachweis') FROM public.kompass_english_tasks t WHERE t.task_key=v_result.task_key));
 v_manual:=coalesce(v_record->>'source','')='teacher' OR
  (coalesce(v_record->>'source','')<>'english_practice' AND
   (nullif(v_record->>'current','') IS NOT NULL OR nullif(v_record->>'level','') IS NOT NULL
    OR (v_record->'score' IS NOT NULL AND v_record->'score'<>'null'::jsonb)));
 v_record:=v_record||jsonb_build_object('practiceResults',coalesce(v_record->'practiceResults','[]'::jsonb)||v_entry,
  'history',coalesce(v_record->'history','[]'::jsonb)||v_entry,'practiceLatest',v_entry);
 IF NOT v_manual THEN
  v_record:=v_record||jsonb_build_object('current',v_status,'score',v_score,'source','english_practice');
  IF v_status='green' AND nullif(v_record->>'firstGreen','') IS NULL THEN
   v_record:=v_record||jsonb_build_object('firstGreen',v_date);
  END IF;
 END IF;
 v_state:=jsonb_set(v_state,'{records}',coalesce(v_state->'records','{}'::jsonb)||jsonb_build_object(v_key,v_record));
 UPDATE public.kompass_grade_state SET payload=v_state,updated_at=greatest(clock_timestamp(),updated_at+interval '1 microsecond') WHERE grade=v_result.grade;
END $$;

NOTIFY pgrst,'reload schema';
COMMIT;
