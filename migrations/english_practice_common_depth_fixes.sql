BEGIN;
CREATE OR REPLACE FUNCTION public.kompass_english_start_common_vocab(p_token text,p_pin text,p_task_key text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
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
CREATE OR REPLACE FUNCTION public.kompass_english_normalize(p_text text)
RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path=public,pg_temp AS $$
DECLARE s text:=lower(trim(coalesce(p_text,'')));r record;
BEGIN
 s:=replace(translate(s,'’‘`',repeat(chr(39),3)),'o'||chr(39)||'clock','o clock');
 FOR r IN SELECT * FROM jsonb_each_text($j${"i'm":"i am","you're":"you are","we're":"we are","they're":"they are","he's":"he is","she's":"she is","it's":"it is","that's":"that is","there's":"there is","don't":"do not","doesn't":"does not","isn't":"is not","aren't":"are not","wasn't":"was not","weren't":"were not","can't":"can not","cannot":"can not","won't":"will not","centre":"center","theatre":"theater","colour":"color","favourite":"favorite"}$j$::jsonb) LOOP
  s:=regexp_replace(s,'\m'||r.key||'\M',r.value,'g');
 END LOOP;
 s:=replace(replace(replace(replace(s,'ä','ae'),'ö','oe'),'ü','ue'),'ß','ss');
 s:=translate(s,'éèêáàâíìîóòôúùû','eeeaaaiiiooouuu');
 s:=regexp_replace(s,'[.!?,:;“”"„…]','','g');s:=regexp_replace(s,'[–—-]',' ','g');
 RETURN trim(regexp_replace(s,'\s+',' ','g'));
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
