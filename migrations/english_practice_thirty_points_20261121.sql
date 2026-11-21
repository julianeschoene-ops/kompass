BEGIN;
-- 60 half-point units shown as 30 points. Issued 26/52-point attempts retain their scale.
CREATE OR REPLACE FUNCTION public.kompass_english_start_common_vocab(p_token text, p_pin text, p_task_key text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE gate jsonb;l public.kompass_english_links;t public.kompass_english_tasks;prev jsonb;targets jsonb;sentences jsonb;meanings jsonb;items jsonb:='[]';word_item jsonb;question jsonb;id uuid;n integer:=0;offset_dir integer:=floor(random()*2)::integer;
BEGIN
 gate:=public.kompass_english_access_window(p_token,p_pin);
 IF coalesce((gate->>'open')::boolean,false) IS NOT true THEN RETURN gate||jsonb_build_object('ok',false);END IF;
 SELECT * INTO STRICT l FROM public.kompass_english_links WHERE active AND token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex') FOR UPDATE;
 SELECT * INTO t FROM public.kompass_english_tasks WHERE task_key=p_task_key AND is_assessment AND vocabulary_bank IS NOT NULL;
 IF NOT FOUND THEN RAISE EXCEPTION 'Lernnachweis nicht freigegeben.';END IF;
 IF (SELECT count(*) FROM public.kompass_english_vocab_attempts WHERE grade=l.grade AND pupil_id=l.pupil_id AND created_at>clock_timestamp()-interval '1 day')>=100 THEN RAISE EXCEPTION 'Zu viele Teststarts. Bitte die Lehrkraft fragen.';END IF;
 SELECT a.items INTO prev FROM public.kompass_english_vocab_attempts a WHERE grade=l.grade AND pupil_id=l.pupil_id AND task_key=p_task_key ORDER BY created_at DESC LIMIT 1;prev:=coalesce(prev,'[]');
 SELECT jsonb_agg(x) INTO meanings FROM (SELECT m x FROM jsonb_array_elements(t.vocabulary_bank->'meanings') m
  ORDER BY EXISTS(SELECT 1 FROM jsonb_array_elements(prev) p WHERE p->>'word_id'=m->>'word_id'),random() LIMIT 5) q;
 SELECT jsonb_agg(x) INTO sentences FROM (SELECT s x FROM jsonb_array_elements(t.vocabulary_bank->'sentences') s
  WHERE NOT EXISTS(SELECT 1 FROM jsonb_array_elements(meanings) m WHERE m->>'word_id'=s->>'word_id')
  ORDER BY EXISTS(SELECT 1 FROM jsonb_array_elements(prev) p WHERE p->>'word_id'=s->>'word_id'),random() LIMIT 3) q;
 SELECT jsonb_agg(x) INTO targets FROM (SELECT w x FROM jsonb_array_elements(t.vocabulary_bank->'words') w WHERE EXISTS(SELECT 1 FROM jsonb_array_elements(sentences) s WHERE s->>'word_id'=w->>'id')
 UNION ALL SELECT x FROM (SELECT w x FROM jsonb_array_elements(t.vocabulary_bank->'words') w
  WHERE NOT EXISTS(SELECT 1 FROM jsonb_array_elements(sentences) s WHERE s->>'word_id'=w->>'id') AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(meanings) m WHERE m->>'word_id'=w->>'id')
  ORDER BY EXISTS(SELECT 1 FROM jsonb_array_elements(prev) p WHERE p->>'word_id'=w->>'id'),random() LIMIT 12) b) c;
 IF jsonb_array_length(targets)<>15 OR jsonb_array_length(sentences)<>3 OR jsonb_array_length(meanings)<>5 THEN RAISE EXCEPTION 'Aufgabenpool unvollständig.';END IF;
 FOR word_item IN SELECT value FROM jsonb_array_elements(targets) ORDER BY random() LOOP
  n:=n+1;
  items:=items||jsonb_build_array(jsonb_build_object('word_id',word_item->>'id','item_id',(word_item->>'id')||':G','level','G','kind',CASE WHEN (n+offset_dir)%2=0 THEN 'en-de' ELSE 'de-en' END,
   'prompt',CASE WHEN (n+offset_dir)%2=0 THEN word_item->>'en' ELSE split_part(word_item->>'de',';',1) END,
   'accepted',jsonb_build_array(CASE WHEN (n+offset_dir)%2=0 THEN word_item->>'meanings' ELSE CASE WHEN word_item->>'en'='foot, feet' THEN 'foot' ELSE word_item->>'en' END END),'max_points',2));
 END LOOP;
 FOR question IN SELECT value FROM jsonb_array_elements(meanings) ORDER BY random() LOOP
  items:=items||jsonb_build_array(question||jsonb_build_object('item_id',(question->>'word_id')||':M','level','M','kind','meaning','max_points',3));
 END LOOP;
 FOR question IN SELECT value FROM jsonb_array_elements(sentences) ORDER BY random() LOOP
  items:=items||jsonb_build_array(question||jsonb_build_object('item_id',(question->>'word_id')||':E','level','E','kind','sentence','max_points',5));
 END LOOP;
 INSERT INTO public.kompass_english_vocab_attempts(grade,pupil_id,task_key,level,items,max_points,test_date)
 VALUES(l.grade,l.pupil_id,p_task_key,'COMMON',items,60,(gate->>'test_date')::date) RETURNING kompass_english_vocab_attempts.id INTO id;
 RETURN jsonb_build_object('ok',true,'id',id,'format','common_depth_v1','target_count',20,'items',(SELECT jsonb_agg(q-'accepted'-'word') FROM jsonb_array_elements(items) q),'max_points',60,'test_date',gate->>'test_date');
END $function$
;
CREATE OR REPLACE FUNCTION public.kompass_english_submit_vocab(p_token text, p_pin text, p_attempt_id uuid, p_answers jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE gate jsonb;l public.kompass_english_links;a public.kompass_english_vocab_attempts;old public.kompass_english_results; total integer:=0;review boolean:=false;answer jsonb;item jsonb;detail jsonb;title text;idx integer:=0;mark jsonb;graded jsonb:='[]';submitted jsonb:='[]';feedback jsonb:='[]';outcome jsonb;comp jsonb;policy text;derived text;
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
  -- The issued attempt owns its scale; old 52-point attempts retain their original marking.
  IF a.level='COMMON' AND a.max_points=26 THEN
   mark:=mark||jsonb_build_object('points',CASE WHEN mark->>'kind'='correct' THEN (item->>'max_points')::integer WHEN mark->>'kind'='spelling' THEN (item->>'max_points')::integer WHEN mark->>'kind'='partial' THEN least((mark->>'points')::integer,(item->>'max_points')::integer-1) ELSE 0 END);
  ELSIF a.level='COMMON' AND a.max_points=60 THEN
   mark:=mark||jsonb_build_object('points',CASE WHEN mark->>'kind'='correct' THEN (item->>'max_points')::integer WHEN mark->>'kind'='spelling' THEN (item->>'max_points')::integer-1 ELSE 0 END);
  END IF;
  submitted:=submitted||jsonb_build_array(jsonb_build_object('word_id',item->>'word_id','given',coalesce(answer->>'given','')));
  graded:=graded||jsonb_build_array(mark||jsonb_build_object('word_id',item->>'word_id','given',coalesce(answer->>'given','')));
  feedback:=feedback||jsonb_build_array(mark||jsonb_build_object('prompt',item->>'prompt','given',coalesce(answer->>'given',''),'max_points',item->'max_points','example',item#>>'{accepted,0}','level',item->>'level'));
  total:=total+(mark->>'points')::integer;review:=review OR mark->>'kind'='review';
 END LOOP;
 policy:=CASE WHEN a.level='COMMON' THEN 'common_depth_v1' ELSE 'legacy_selected_level' END;
 IF a.level='COMMON' THEN
  SELECT c INTO comp FROM public.kompass_english_tasks t JOIN public.kompass_shared_state ss ON ss.id='school' CROSS JOIN LATERAL jsonb_array_elements(ss.payload->'competencies') c WHERE t.task_key=a.task_key AND c->>'id'=t.competency_id AND c->>'subject'='Englisch';
  outcome:=public.kompass_english_depth_outcome(public.kompass_english_depth_scores(a.items,graded),coalesce((comp#>>'{scoreConfig,redMax}')::integer,24),coalesce((comp#>>'{scoreConfig,yellowMax}')::integer,74));
  derived:=outcome->>'level';
 ELSE derived:=a.level;END IF;
 detail:=jsonb_build_object('needs_review',review,'answers',graded,'submitted',submitted,'items',a.items,'feedback',feedback,'level',a.level,'policy',policy,'outcome',outcome);
 SELECT * INTO old FROM public.kompass_english_results WHERE grade=l.grade AND pupil_id=l.pupil_id AND attempt_id=p_attempt_id;
 IF FOUND THEN
  IF old.assessment_detail->'submitted' IS DISTINCT FROM submitted THEN RAISE EXCEPTION 'Dieser Versuch wurde bereits mit anderen Antworten gespeichert.'; END IF;
  RETURN jsonb_build_object('saved',true,'needs_review',coalesce((old.assessment_detail->>'needs_review')::boolean,false),'reviewed',coalesce((old.assessment_detail->>'reviewed')::boolean,false),'points',old.points,'max_points',old.max_points,'feedback',old.assessment_detail->'feedback','outcome',old.assessment_detail->'outcome');
 END IF;
 IF NOT (gate->>'open')::boolean OR a.test_date IS DISTINCT FROM (gate->>'test_date')::date THEN RETURN gate||jsonb_build_object('ok',false,'window_closed',true,'message','Die Abgabezeit ist beendet oder der Versuch stammt von einem anderen Tag.'); END IF;
 SELECT t.title INTO title FROM public.kompass_english_tasks t WHERE task_key=a.task_key AND is_assessment;
 IF NOT FOUND THEN RAISE EXCEPTION 'Test nicht mehr freigegeben.'; END IF;
 INSERT INTO public.kompass_english_results(grade,pupil_id,attempt_id,task_key,topic,points,max_points,assessment_level,assessment_detail)
 VALUES(a.grade,a.pupil_id,a.id,a.task_key,title||CASE WHEN a.level='COMMON' THEN ' · gemeinsamer Lernnachweis' ELSE ' · Testniveau '||a.level END,total,a.max_points,derived,detail);
 RETURN jsonb_build_object('saved',true,'needs_review',review,'points',total,'max_points',a.max_points,'feedback',feedback,'outcome',outcome);
END $function$
;
COMMIT;
