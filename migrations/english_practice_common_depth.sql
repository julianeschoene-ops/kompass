BEGIN;
ALTER TABLE public.kompass_english_vocab_attempts DROP CONSTRAINT kompass_english_vocab_attempts_level_check;
ALTER TABLE public.kompass_english_vocab_attempts ADD CONSTRAINT kompass_english_vocab_attempts_level_check CHECK(level IN ('G','M','E','COMMON'));
REVOKE ALL ON FUNCTION public.kompass_english_start_vocab(text,text,text,text) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.kompass_english_depth_outcome(p_scores jsonb,p_red integer,p_yellow integer)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE SET search_path=public,pg_temp AS $$
DECLARE tier text;cumulative integer:=0;cum_max integer:=0; part jsonb;parts jsonb:='{}';best_green text;best_yellow text;chosen text;total integer:=0;maximum integer:=0;pct integer;status text;attainment jsonb;
BEGIN
 IF p_red<0 OR p_yellow<=p_red OR p_yellow>=100 THEN RAISE EXCEPTION 'Ungültige Ampelgrenzen.';END IF;
 FOREACH tier IN ARRAY ARRAY['G','M','E'] LOOP
  part:=p_scores->tier;
  IF part IS NULL OR (part->>'max')::integer<=0 OR (part->>'points')::integer NOT BETWEEN 0 AND (part->>'max')::integer THEN RAISE EXCEPTION 'Ungültige Teilpunkte für %.',tier;END IF;
  pct:=round((part->>'points')::numeric*100/(part->>'max')::integer);
  status:=CASE WHEN pct<=p_red THEN 'red' WHEN pct<=p_yellow THEN 'yellow' ELSE 'green' END;
  cumulative:=cumulative+(part->>'points')::integer;cum_max:=cum_max+(part->>'max')::integer;
  parts:=parts||jsonb_build_object(tier,part||jsonb_build_object('percent',pct,'status',status,'stageScore',jsonb_build_object('points',cumulative,'max',cum_max,'percent',round(cumulative*100.0/cum_max),'redMax',p_red,'yellowMax',p_yellow)));
  total:=total+(part->>'points')::integer;maximum:=maximum+(part->>'max')::integer;
  IF status='green' THEN best_green:=tier;ELSIF status='yellow' THEN best_yellow:=tier;END IF;
 END LOOP;
 -- Depth is independent, not additive: an E demonstration needs no prior G/M pass.
 chosen:=coalesce(best_green,best_yellow);
 attainment:=coalesce(parts->chosen,parts->'G')->'stageScore';
 status:=CASE WHEN (attainment->>'percent')::integer<=p_red THEN 'red' WHEN (attainment->>'percent')::integer<=p_yellow THEN 'yellow' ELSE 'green' END;
 RETURN jsonb_build_object('policy','common_depth_v1','level',chosen,'status',status,'attainmentScore',attainment,
  'totalScore',jsonb_build_object('points',total,'max',maximum,'percent',round(total*100.0/maximum)),
  'byLevel',parts,'redMax',p_red,'yellowMax',p_yellow,
  'rule','Niveau aus der höchsten sicher nachgewiesenen fachlichen Tiefe; sonst aus der höchsten teilweise nachgewiesenen Tiefe. Die bestehende Prozentregel bewertet die Punkte der zugehörigen Testteile: G Basis, M Basis und Bedeutungen, E alle Teile.');
END $$;
REVOKE ALL ON FUNCTION public.kompass_english_depth_outcome(jsonb,integer,integer) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.kompass_english_depth_scores(p_items jsonb,p_marks jsonb)
RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path=public,pg_temp AS $$
 SELECT jsonb_object_agg(tier,jsonb_build_object('points',points,'max',maximum)) FROM (
  SELECT q->>'level' tier,sum((m->>'points')::integer) points,sum((q->>'max_points')::integer) maximum
  FROM jsonb_array_elements(p_items) WITH ORDINALITY i(q,n)
  JOIN jsonb_array_elements(p_marks) WITH ORDINALITY a(m,n) USING(n)
  GROUP BY q->>'level') b
$$;
REVOKE ALL ON FUNCTION public.kompass_english_depth_scores(jsonb,jsonb) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.kompass_english_store_depth_evidence(r public.kompass_english_results,p_teacher boolean DEFAULT false,p_note text DEFAULT '')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE state jsonb;rec jsonb;key text;outcome jsonb:=r.assessment_detail->'outcome';entry jsonb;manual boolean;pending boolean:=coalesce((r.assessment_detail->>'needs_review')::boolean,false);day text;actor text;old_rank integer;new_rank integer;can_update boolean;at_time timestamptz:=clock_timestamp();
BEGIN
 IF outcome->>'policy' IS DISTINCT FROM 'common_depth_v1' THEN RAISE EXCEPTION 'Auswertungsregel fehlt.';END IF;
 IF p_teacher AND NOT public.kompass_english_teacher_access(r.grade,false) THEN RAISE EXCEPTION 'Keine Bewertungsberechtigung.' USING ERRCODE='42501';END IF;
 SELECT payload INTO STRICT state FROM public.kompass_grade_state WHERE grade=r.grade FOR UPDATE;
 key:=r.competency_id||'|'||r.pupil_id;rec:=coalesce(state->'records'->key,'{}');
 IF NOT p_teacher AND EXISTS(SELECT 1 FROM jsonb_array_elements(coalesce(rec->'practiceResults','[]')) e WHERE e->>'id'=r.id::text) THEN RETURN;END IF;
 SELECT display_name INTO actor FROM public.kompass_profiles WHERE id=auth.uid();
 day:=to_char(r.submitted_at AT TIME ZONE 'Europe/Berlin','DD.MM.YYYY');
 entry:=jsonb_build_object('id',r.id::text,'attemptId',r.attempt_id,'taskKey',r.task_key,'topic',r.topic,'date',day,'at',r.submitted_at,
  'teacher',CASE WHEN p_teacher THEN actor ELSE 'English Practice' END,'source','english_practice',
  'level',outcome->'level','assessedLevel',outcome->'level','value',outcome->>'status','score',outcome->'totalScore',
  'outcome',outcome,'needsReview',pending,'reviewed',coalesce((r.assessment_detail->>'reviewed')::boolean,false),
  'reviewedBy',r.assessment_detail->>'reviewed_name','reviewNote',r.assessment_detail->>'review_note','assessmentDetail',r.assessment_detail,'note','Gemeinsamer Lernnachweis: Niveau aus fachlicher Tiefe');
 manual:=coalesce(rec->>'source','')='teacher' OR (coalesce(rec->>'source','')<>'english_practice' AND (nullif(rec->>'current','') IS NOT NULL OR nullif(rec->>'level','') IS NOT NULL OR rec->'score' IS NOT NULL AND rec->'score'<>'null'));
 IF p_teacher THEN
  rec:=jsonb_set(rec,'{practiceResults}',coalesce((SELECT jsonb_agg(CASE WHEN e->>'id'=r.id::text THEN entry ELSE e END) FROM jsonb_array_elements(coalesce(rec->'practiceResults','[]')) e),'[]'));
  rec:=jsonb_set(rec,'{history}',coalesce((SELECT jsonb_agg(CASE WHEN e->>'id'=r.id::text THEN e||jsonb_build_object('needsReview',false,'reviewed',true) ELSE e END) FROM jsonb_array_elements(coalesce(rec->'history','[]')) e),'[]')||jsonb_build_array(entry||jsonb_build_object('id',r.id::text||':depth-review','source','teacher','at',at_time,'date',to_char(at_time AT TIME ZONE 'Europe/Berlin','DD.MM.YYYY'),'note',p_note)));
 ELSE
  rec:=rec||jsonb_build_object('practiceResults',coalesce(rec->'practiceResults','[]')||jsonb_build_array(entry),'history',coalesce(rec->'history','[]')||jsonb_build_array(entry));
 END IF;
 rec:=rec||jsonb_build_object('practiceLatest',entry);
 old_rank:=CASE rec->>'level' WHEN 'G' THEN 1 WHEN 'M' THEN 2 WHEN 'E' THEN 3 ELSE 0 END;
 new_rank:=CASE outcome->>'level' WHEN 'G' THEN 1 WHEN 'M' THEN 2 WHEN 'E' THEN 3 ELSE 0 END;
 can_update:=p_teacher OR NOT manual AND (NOT pending OR outcome->>'status'='green' AND new_rank>0 AND new_rank>=old_rank);
 IF can_update THEN
  rec:=rec||jsonb_build_object('current',outcome->>'status','level',outcome->'level','score',outcome->'attainmentScore','assessmentSummary',outcome||jsonb_build_object('pendingReview',pending),'source',CASE WHEN p_teacher THEN 'teacher' ELSE 'english_practice' END);
  IF outcome->>'status'='green' AND nullif(rec->>'firstGreen','') IS NULL THEN rec:=rec||jsonb_build_object('firstGreen',day);END IF;
 END IF;
 state:=jsonb_set(state,'{records}',coalesce(state->'records','{}')||jsonb_build_object(key,rec));
 UPDATE public.kompass_grade_state SET payload=state,updated_at=greatest(at_time,updated_at+interval '1 microsecond') WHERE grade=r.grade;
END $$;
REVOKE ALL ON FUNCTION public.kompass_english_store_depth_evidence(public.kompass_english_results,boolean,text) FROM PUBLIC,anon,authenticated;
UPDATE public.kompass_english_tasks SET vocabulary_bank=jsonb_set(vocabulary_bank,'{meanings}','[{"word_id": "16-0", "word": "shop", "prompt": "A place where you can buy things.", "accepted": ["shop"]}, {"word_id": "16-1", "word": "snack bar", "prompt": "A small place where you can buy a quick snack or a sandwich.", "accepted": ["snack bar"]}, {"word_id": "16-2", "word": "youth club", "prompt": "A place where young people meet and do activities together.", "accepted": ["youth club"]}, {"word_id": "16-3", "word": "swimming pool", "prompt": "A place with water where people go swimming.", "accepted": ["swimming pool"]}, {"word_id": "16-4", "word": "pitch", "prompt": "An area of ground where people play football.", "accepted": ["pitch"]}, {"word_id": "16-5", "word": "supermarket", "prompt": "A large shop where you buy food and everyday things.", "accepted": ["supermarket"]}, {"word_id": "16-6", "word": "to buy", "prompt": "To get something by paying money for it.", "accepted": ["to buy"]}, {"word_id": "16-7", "word": "different", "prompt": "Not the same.", "accepted": ["different"]}, {"word_id": "16-8", "word": "product", "prompt": "Something that is made or grown and sold in a shop.", "accepted": ["product"]}, {"word_id": "16-9", "word": "to borrow", "prompt": "To use something that belongs to another person and give it back later.", "accepted": ["to borrow"]}, {"word_id": "16-10", "word": "clothes", "prompt": "Things such as shirts, trousers and dresses that you wear.", "accepted": ["clothes"]}, {"word_id": "16-12", "word": "sandwich", "prompt": "Food made with two slices of bread and something between them.", "accepted": ["sandwich"]}, {"word_id": "16-13", "word": "baker’s", "prompt": "A shop where you buy fresh bread and rolls.", "accepted": ["baker’s"]}, {"word_id": "16-14", "word": "theatre", "prompt": "A building where people watch plays on a stage.", "accepted": ["theatre"]}, {"word_id": "16-15", "word": "restaurant", "prompt": "A place where you sit at a table and pay for a meal.", "accepted": ["restaurant"]}, {"word_id": "16-16", "word": "skate park", "prompt": "A place with ramps where people ride skateboards.", "accepted": ["skate park"]}, {"word_id": "16-17", "word": "early", "prompt": "Before the usual or expected time.", "accepted": ["early"]}, {"word_id": "16-19", "word": "false", "prompt": "Not true.", "accepted": ["false"]}]'::jsonb),expected_questions=23,assessment_config=assessment_config||'{"common_test":true,"format":"common_depth_v1","sample_size":20}'::jsonb WHERE task_key='vocab:lwl-u4-test-1';
UPDATE public.kompass_english_tasks SET vocabulary_bank=jsonb_set(vocabulary_bank,'{meanings}','[{"word_id": "17-0", "word": "way", "prompt": "A route from one place to another.", "accepted": ["way"]}, {"word_id": "17-1", "word": "tourist", "prompt": "A person who visits a place on holiday.", "accepted": ["tourist"]}, {"word_id": "17-6", "word": "pond", "prompt": "A small area of water, often in a park or garden.", "accepted": ["pond"]}, {"word_id": "17-12", "word": "car park", "prompt": "An area where you can leave your car.", "accepted": ["car park"]}, {"word_id": "17-15", "word": "crossing", "prompt": "A place where two roads meet.", "accepted": ["crossing"]}, {"word_id": "17-16", "word": "restaurant", "prompt": "A place where you sit at a table and pay for a meal.", "accepted": ["restaurant"]}, {"word_id": "17-22", "word": "corner", "prompt": "The place where two sides or two streets meet.", "accepted": ["corner"]}, {"word_id": "17-23", "word": "opposite", "prompt": "On the other side, facing a place or a building.", "accepted": ["opposite"]}, {"word_id": "17-24", "word": "traffic light", "prompt": "A light that tells drivers when to stop or go.", "accepted": ["traffic light"]}, {"word_id": "17-26", "word": "roundabout", "prompt": "A circular road where several roads meet.", "accepted": ["roundabout"]}, {"word_id": "17-30", "word": "bridge", "prompt": "A structure that lets you cross a river or a road.", "accepted": ["bridge"]}, {"word_id": "17-32", "word": "car", "prompt": "A road vehicle with four wheels, usually for a small number of people.", "accepted": ["car"]}, {"word_id": "17-33", "word": "tram", "prompt": "A vehicle that runs on rails along the streets of a town.", "accepted": ["tram"]}, {"word_id": "17-34", "word": "bus", "prompt": "A large road vehicle that carries many passengers along a route.", "accepted": ["bus"]}, {"word_id": "17-35", "word": "underground train", "prompt": "A train that travels below the streets of a city.", "accepted": ["underground train"]}, {"word_id": "17-36", "word": "scooter", "prompt": "A small two-wheeled vehicle with a platform to stand on.", "accepted": ["scooter"]}, {"word_id": "17-39", "word": "ferry", "prompt": "A boat that carries people and often cars across water.", "accepted": ["ferry"]}, {"word_id": "17-40", "word": "motorbike", "prompt": "A road vehicle with an engine and two wheels.", "accepted": ["motorbike"]}, {"word_id": "17-41", "word": "helicopter", "prompt": "An aircraft with a large rotor on top.", "accepted": ["helicopter"]}, {"word_id": "17-42", "word": "taxi", "prompt": "A car with a driver that you pay for a journey.", "accepted": ["taxi"]}, {"word_id": "17-43", "word": "plane", "prompt": "An aircraft with wings that carries people through the air.", "accepted": ["plane"]}, {"word_id": "17-44", "word": "boat", "prompt": "A vehicle that travels on water.", "accepted": ["boat"]}, {"word_id": "17-48", "word": "bus stop", "prompt": "A place where people wait for a bus.", "accepted": ["bus stop"]}]'::jsonb),expected_questions=23,assessment_config=assessment_config||'{"common_test":true,"format":"common_depth_v1","sample_size":20}'::jsonb WHERE task_key='vocab:lwl-u4-test-2';
CREATE OR REPLACE FUNCTION public.kompass_english_start_common_vocab(p_token text,p_pin text,p_task_key text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE gate jsonb;l public.kompass_english_links;t public.kompass_english_tasks;prev jsonb;targets jsonb;sentences jsonb;meanings jsonb;items jsonb:='[]';w jsonb;question jsonb;id uuid;n integer:=0;offset_dir integer:=floor(random()*2)::integer;
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
 FOR w IN SELECT value FROM jsonb_array_elements(targets) ORDER BY random() LOOP
  n:=n+1;
  items:=items||jsonb_build_array(jsonb_build_object('word_id',w->>'id','item_id',(w->>'id')||':G','level','G','kind',CASE WHEN (n+offset_dir)%2=0 THEN 'en-de' ELSE 'de-en' END,
   'prompt',CASE WHEN (n+offset_dir)%2=0 THEN w->>'en' ELSE split_part(w->>'de',';',1) END,
   'accepted',jsonb_build_array(CASE WHEN (n+offset_dir)%2=0 THEN w->>'meanings' ELSE w->>'en' END),'max_points',2));
 END LOOP;
 FOR question IN SELECT value FROM jsonb_array_elements(meanings) ORDER BY random() LOOP
  items:=items||jsonb_build_array(question||jsonb_build_object('item_id',(question->>'word_id')||':M','level','M','kind','meaning','max_points',2));
 END LOOP;
 FOR question IN SELECT value FROM jsonb_array_elements(sentences) ORDER BY random() LOOP
  items:=items||jsonb_build_array(question||jsonb_build_object('item_id',(question->>'word_id')||':E','level','E','kind','sentence','max_points',4));
 END LOOP;
 INSERT INTO public.kompass_english_vocab_attempts(grade,pupil_id,task_key,level,items,max_points,test_date)
 VALUES(l.grade,l.pupil_id,p_task_key,'COMMON',items,52,(gate->>'test_date')::date) RETURNING kompass_english_vocab_attempts.id INTO id;
 RETURN jsonb_build_object('ok',true,'id',id,'format','common_depth_v1','target_count',20,'items',(SELECT jsonb_agg(q-'accepted'-'word') FROM jsonb_array_elements(items) q),'max_points',52,'test_date',gate->>'test_date');
END $$;
REVOKE ALL ON FUNCTION public.kompass_english_start_common_vocab(text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kompass_english_start_common_vocab(text,text,text) TO anon,authenticated;
CREATE OR REPLACE FUNCTION public.kompass_english_submit_vocab(p_token text,p_pin text,p_attempt_id uuid,p_answers jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
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
END $$;
CREATE OR REPLACE FUNCTION public.kompass_english_apply_evidence(v_result public.kompass_english_results)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_state jsonb; v_record jsonb; v_comp jsonb; v_key text; v_score jsonb; v_entry jsonb;
 v_status text; v_percent integer; v_manual boolean; v_date text;
BEGIN
 IF v_result.assessment_detail->>'policy'='common_depth_v1' THEN PERFORM public.kompass_english_store_depth_evidence(v_result,false,'');RETURN;END IF;
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
  'source','english_practice','value',CASE WHEN coalesce((v_result.assessment_detail->>'needs_review')::boolean,false) THEN NULL ELSE v_status END,'level',v_record->'level','score',v_score,'testLevel',v_result.assessment_level,'assessmentDetail',v_result.assessment_detail,'needsReview',coalesce((v_result.assessment_detail->>'needs_review')::boolean,false),'note',(SELECT coalesce(t.assessment_config->>'scope','Wortschatz-Teilnachweis') FROM public.kompass_english_tasks t WHERE t.task_key=v_result.task_key));
 v_manual:=coalesce(v_record->>'source','')='teacher' OR
  (coalesce(v_record->>'source','')<>'english_practice' AND
   (nullif(v_record->>'current','') IS NOT NULL OR nullif(v_record->>'level','') IS NOT NULL
    OR (v_record->'score' IS NOT NULL AND v_record->'score'<>'null'::jsonb)));
 v_record:=v_record||jsonb_build_object('practiceResults',coalesce(v_record->'practiceResults','[]'::jsonb)||v_entry,
  'history',coalesce(v_record->'history','[]'::jsonb)||v_entry,'practiceLatest',v_entry);
 IF NOT v_manual AND NOT coalesce((v_result.assessment_detail->>'needs_review')::boolean,false) THEN
  v_record:=v_record||jsonb_build_object('current',v_status,'score',v_score,'source','english_practice');
  IF v_status='green' AND nullif(v_record->>'firstGreen','') IS NULL THEN
   v_record:=v_record||jsonb_build_object('firstGreen',v_date);
  END IF;
 END IF;
 v_state:=jsonb_set(v_state,'{records}',coalesce(v_state->'records','{}'::jsonb)||jsonb_build_object(v_key,v_record));
 UPDATE public.kompass_grade_state SET payload=v_state,updated_at=greatest(clock_timestamp(),updated_at+interval '1 microsecond') WHERE grade=v_result.grade;
END $$;


CREATE OR REPLACE FUNCTION public.kompass_english_review_depth_vocab(p_id uuid,p_g integer,p_m integer,p_e integer,p_note text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE r public.kompass_english_results;outcome jsonb;scores jsonb;actor text;comp jsonb;
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
 r.points:=p_g+p_m+p_e;r.assessment_level:=outcome->>'level';r.assessment_detail:=r.assessment_detail||jsonb_build_object('outcome',outcome,'automatic_outcome',r.assessment_detail->'outcome','needs_review',false,'reviewed',true,'reviewed_name',actor,'reviewed_by',auth.uid(),'reviewed_at',clock_timestamp(),'review_note',coalesce(p_note,''));
 UPDATE public.kompass_english_results SET points=r.points,assessment_level=r.assessment_level,assessment_detail=r.assessment_detail WHERE id=r.id;
 PERFORM public.kompass_english_store_depth_evidence(r,true,p_note);
END $$;
REVOKE ALL ON FUNCTION public.kompass_english_review_depth_vocab(uuid,integer,integer,integer,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.kompass_english_review_depth_vocab(uuid,integer,integer,integer,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.kompass_english_review_vocab(p_id uuid,p_points integer,p_note text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE r public.kompass_english_results;s jsonb;rec jsonb;k text;comp jsonb;score jsonb;status text;entry jsonb;actor text;detail jsonb;stamp timestamptz:=clock_timestamp();d text;
BEGIN
 SELECT * INTO r FROM public.kompass_english_results WHERE id=p_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Ergebnis nicht gefunden.';END IF;
 IF NOT public.kompass_english_teacher_access(r.grade,false) THEN RAISE EXCEPTION 'Keine Berechtigung zur Bewertung.' USING ERRCODE='42501';END IF;
 IF r.assessment_detail->>'policy'='common_depth_v1' THEN RAISE EXCEPTION 'Bitte die Teilpunkte G/M/E getrennt prüfen.';END IF;
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
NOTIFY pgrst,'reload schema';
COMMIT;
