BEGIN;
DO $$
DECLARE teacher_id uuid; game uuid; secret uuid; v jsonb; qs jsonb; before_score integer; token text; pin text; personal_secret uuid;
BEGIN
 SELECT id INTO teacher_id FROM public.kompass_profiles WHERE active AND role='teacher' LIMIT 1;
 SELECT jsonb_agg(jsonb_build_object('prompt','Question '||n,'options',jsonb_build_array('A','B','C','D'),'answer',0)) INTO qs FROM generate_series(1,15)n;
 PERFORM set_config('request.jwt.claim.sub','',true);
 BEGIN PERFORM public.kompass_english_quiz('create',NULL,NULL,jsonb_build_object('title','test','questions',qs)); RAISE EXCEPTION 'anonymous create allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 PERFORM set_config('request.jwt.claim.sub',teacher_id::text,true);
 v:=public.kompass_english_quiz('create',NULL,NULL,jsonb_build_object('title','verification','questions',qs));game:=(v->>'id')::uuid;
 PERFORM set_config('request.jwt.claim.sub','',true);
 v:=public.kompass_english_quiz('state',game);ASSERT v->'q'='null'::jsonb;
 v:=public.kompass_english_quiz('join',game,NULL,'{"mode":"guest"}');secret:=(v->'me'->>'secret')::uuid;
 BEGIN PERFORM public.kompass_english_quiz('start',game,secret); RAISE EXCEPTION 'pupil start allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.kompass_english_quiz('join',game,NULL,'{"mode":"personal","token":"invalid","pin":"000000"}');RAISE EXCEPTION 'invalid personal access allowed';EXCEPTION WHEN OTHERS THEN ASSERT SQLERRM<>'invalid personal access allowed';END;
 -- Use existing credentials only inside the rolled-back transaction; never print them.
 SELECT print_token,print_pin INTO token,pin FROM public.kompass_english_links WHERE active AND print_token IS NOT NULL AND print_pin IS NOT NULL LIMIT 1;
 IF token IS NOT NULL THEN
  v:=public.kompass_english_quiz('join',game,NULL,jsonb_build_object('mode','personal','token',token,'pin',pin));ASSERT (v->'me'->>'personal')::boolean;personal_secret:=(v->'me'->>'secret')::uuid;
 END IF;
 PERFORM set_config('request.jwt.claim.sub',teacher_id::text,true);v:=public.kompass_english_quiz('start',game);ASSERT v->>'phase'='question';ASSERT NOT(v->'q'?'answer');
 PERFORM set_config('request.jwt.claim.sub','',true);
 v:=public.kompass_english_quiz('state',game,secret);ASSERT NOT(v->'q'?'answer');
 v:=public.kompass_english_quiz('answer',game,secret,'{"question":0,"choice":0}');before_score:=(v->'me'->>'score')::integer;ASSERT before_score BETWEEN 1000 AND 1200;
 v:=public.kompass_english_quiz('answer',game,secret,'{"question":0,"choice":1}');ASSERT (v->'me'->>'score')::integer=before_score;ASSERT (v->'me'->>'choice')::integer=0;
 PERFORM set_config('request.jwt.claim.sub',teacher_id::text,true);v:=public.kompass_english_quiz('reveal',game);ASSERT (v->'q'->>'answer')::integer=0;
 v:=public.kompass_english_quiz('next',game);ASSERT (v->>'question')::integer=1;
 UPDATE english_quiz_private.games SET deadline=now()-interval '1 second' WHERE id=game;
 PERFORM set_config('request.jwt.claim.sub','',true);
 BEGIN PERFORM public.kompass_english_quiz('answer',game,secret,'{"question":1,"choice":0}');RAISE EXCEPTION 'late answer allowed';EXCEPTION WHEN OTHERS THEN ASSERT SQLERRM<>'late answer allowed';END;
 PERFORM set_config('request.jwt.claim.sub',teacher_id::text,true);v:=public.kompass_english_quiz('finish',game);ASSERT v->>'phase'='finished';
 ASSERT NOT has_table_privilege('anon','english_quiz_private.games','SELECT');
 ASSERT NOT has_table_privilege('authenticated','english_quiz_private.players','SELECT');
END $$;
ROLLBACK;
