BEGIN;
CREATE OR REPLACE FUNCTION public.kompass_english_submit_vocab(p_token text,p_pin text,p_attempt_id uuid,p_answers jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE gate jsonb;l public.kompass_english_links;a public.kompass_english_vocab_attempts;old public.kompass_english_results; total integer:=0;review boolean:=false;answer jsonb;item jsonb;detail jsonb;title text;idx integer:=0;mark jsonb;graded jsonb:='[]';submitted jsonb:='[]';feedback jsonb:='[]';
BEGIN
 gate:=public.kompass_english_access_window(p_token,p_pin);
 IF coalesce((gate->>'ok')::boolean,false) IS NOT true THEN RETURN gate; END IF;
 SELECT * INTO STRICT l FROM public.kompass_english_links WHERE active AND token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex') FOR UPDATE;
 SELECT * INTO a FROM public.kompass_english_vocab_attempts WHERE id=p_attempt_id AND grade=l.grade AND pupil_id=l.pupil_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Dieser Testversuch gehört nicht zu deinem Zugang.'; END IF;
 IF jsonb_typeof(p_answers) IS DISTINCT FROM 'array' OR jsonb_array_length(p_answers)<>jsonb_array_length(a.items) THEN RAISE EXCEPTION 'Bitte alle Testaufgaben abgeben.'; END IF;
 FOR answer IN SELECT value FROM jsonb_array_elements(p_answers) LOOP
  item:=a.items->idx;idx:=idx+1;
  IF answer->>'word_id' IS DISTINCT FROM item->>'word_id' OR length(coalesce(answer->>'given',''))>500 THEN RAISE EXCEPTION 'Ungültige Antwortdaten.'; END IF;
  -- Never accept a client's claimed score or correctness.
  mark:=public.kompass_english_mark_answer(answer->>'given',item->'accepted',item->>'kind');
  submitted:=submitted||jsonb_build_array(jsonb_build_object('word_id',item->>'word_id','given',coalesce(answer->>'given','')));
  graded:=graded||jsonb_build_array(mark||jsonb_build_object('word_id',item->>'word_id','given',coalesce(answer->>'given','')));
  feedback:=feedback||jsonb_build_array(mark||jsonb_build_object('prompt',item->>'prompt','given',coalesce(answer->>'given',''),'max_points',item->'max_points','example',item#>>'{accepted,0}'));
  total:=total+(mark->>'points')::integer;review:=review OR mark->>'kind'='review';
 END LOOP;
 detail:=jsonb_build_object('needs_review',review,'answers',graded,'submitted',submitted,'items',a.items,'feedback',feedback,'level',a.level);
 SELECT * INTO old FROM public.kompass_english_results WHERE grade=l.grade AND pupil_id=l.pupil_id AND attempt_id=p_attempt_id;
 IF FOUND THEN
  IF old.assessment_detail->'submitted' IS DISTINCT FROM submitted THEN RAISE EXCEPTION 'Dieser Versuch wurde bereits mit anderen Antworten gespeichert.'; END IF;
  RETURN jsonb_build_object('saved',true,'needs_review',coalesce((old.assessment_detail->>'needs_review')::boolean,false),'reviewed',coalesce((old.assessment_detail->>'reviewed')::boolean,false),'points',old.points,'max_points',old.max_points,'feedback',old.assessment_detail->'feedback');
 END IF;
 IF NOT (gate->>'open')::boolean OR a.test_date IS DISTINCT FROM (gate->>'test_date')::date THEN RETURN gate||jsonb_build_object('ok',false,'window_closed',true,'message','Die Abgabezeit ist beendet oder der Versuch stammt von einem anderen Tag.'); END IF;
 SELECT t.title INTO title FROM public.kompass_english_tasks t WHERE task_key=a.task_key AND is_assessment;
 IF NOT FOUND THEN RAISE EXCEPTION 'Test nicht mehr freigegeben.'; END IF;
 INSERT INTO public.kompass_english_results(grade,pupil_id,attempt_id,task_key,topic,points,max_points,assessment_level,assessment_detail)
 VALUES(a.grade,a.pupil_id,a.id,a.task_key,title||' · Testniveau '||a.level,total,a.max_points,a.level,detail);
 RETURN jsonb_build_object('saved',true,'needs_review',review,'points',total,'max_points',a.max_points,'feedback',feedback);
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
