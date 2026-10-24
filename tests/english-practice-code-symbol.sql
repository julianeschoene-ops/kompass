BEGIN;
SELECT set_config('request.jwt.claim.sub',(SELECT id::text FROM public.kompass_profiles WHERE display_name='Juliane Schöne' AND role='admin' AND active LIMIT 1),true);
DO $test$
DECLARE r jsonb;again jsonb;entry jsonb;login_result jsonb;wrong text;n integer;new_entry jsonb;
BEGIN
 r:=public.kompass_english_batch_logins(6::smallint,ARRAY['ep_demo_juliane_2026','ep_demo_juliane_2026']);entry:=r->0;
 IF jsonb_array_length(r)<>1 OR (entry->>'code')!~'^[0-9]{4}$' OR entry?'pin' OR entry?'token' THEN RAISE EXCEPTION 'Invalid printable short login';END IF;
 again:=public.kompass_english_batch_logins(6::smallint,ARRAY['ep_demo_juliane_2026']);IF again IS DISTINCT FROM r THEN RAISE EXCEPTION 'Reprint rotated credentials';END IF;
 login_result:=public.kompass_english_login(entry->>'code',entry->>'symbol');
 IF (login_result->>'ok')::boolean IS NOT TRUE OR login_result->>'first_name'<>'Testkind' OR (public.kompass_english_resolve_code_v2(login_result->>'token',login_result->>'pin')->>'ok')::boolean IS NOT TRUE THEN RAISE EXCEPTION 'New login not connected to existing test identity';END IF;
 wrong:=CASE WHEN entry->>'symbol'='fox' THEN 'panda' ELSE 'fox' END;
 FOR n IN 1..3 LOOP login_result:=public.kompass_english_login(entry->>'code',wrong);IF login_result?'first_name' OR login_result?'token' OR login_result?'pin' OR (login_result->>'ok')::boolean THEN RAISE EXCEPTION 'Wrong symbol revealed identity';END IF;END LOOP;
 login_result:=public.kompass_english_login(entry->>'code',entry->>'symbol');IF (login_result->>'ok')::boolean THEN RAISE EXCEPTION 'Symbol lock bypassed';END IF;
 UPDATE public.kompass_english_logins SET blocked_until=clock_timestamp()-interval '1 second' WHERE grade=6 AND pupil_id='ep_demo_juliane_2026';
 login_result:=public.kompass_english_login(entry->>'code',entry->>'symbol');IF (login_result->>'ok')::boolean IS NOT TRUE THEN RAISE EXCEPTION 'Expired lock did not recover';END IF;
 UPDATE public.kompass_english_links SET active=false WHERE grade=6 AND pupil_id='ep_demo_juliane_2026';login_result:=public.kompass_english_login(entry->>'code',entry->>'symbol');IF (login_result->>'ok')::boolean THEN RAISE EXCEPTION 'Revoked access still works';END IF;
 new_entry:=public.kompass_english_batch_logins(6::smallint,ARRAY['ep_demo_juliane_2026'],true)->0;IF new_entry->>'code'=entry->>'code' THEN RAISE EXCEPTION 'Reset reused old code';END IF;
 login_result:=public.kompass_english_login(entry->>'code',entry->>'symbol');IF (login_result->>'ok')::boolean THEN RAISE EXCEPTION 'Old code survived reset';END IF;
 login_result:=public.kompass_english_login(new_entry->>'code',new_entry->>'symbol');IF (login_result->>'ok')::boolean IS NOT TRUE THEN RAISE EXCEPTION 'Reset login failed';END IF;
 IF has_table_privilege('anon','public.kompass_english_logins','select') OR has_table_privilege('authenticated','public.kompass_english_logins','select') OR has_function_privilege('anon','public.kompass_english_batch_logins(smallint,text[],boolean)','execute') THEN RAISE EXCEPTION 'Credential list publicly exposed';END IF;
 PERFORM set_config('request.jwt.claim.sub','',true);
 BEGIN PERFORM public.kompass_english_batch_logins(6::smallint,ARRAY['ep_demo_juliane_2026']);RAISE EXCEPTION 'Unauthenticated generation succeeded';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
END $test$;
SELECT '4-digit code + assigned symbol, stable batch reprint, private first name, lockout, revocation, reset and authorization verified; existing pupil/result identity preserved' AS verification;
ROLLBACK;
