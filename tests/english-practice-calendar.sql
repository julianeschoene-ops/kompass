-- Run as the database test role. All synthetic edits roll back.
BEGIN;
DO $test$
DECLARE item record; gate jsonb; closure_id uuid;
BEGIN
 FOR item IN SELECT * FROM (VALUES
 ('2026-10-23 07:59:59','outside_hours'),('2026-10-23 08:00:00','open'),
 ('2026-10-23 12:29:59','open'),('2026-10-23 12:30:00','outside_hours'),
 ('2026-10-24 09:00:00','weekend'),('2026-10-26 09:00:00','school_closed'),
 ('2026-10-30 09:00:00','school_closed'),('2026-11-02 09:00:00','open'),
 ('2026-12-23 09:00:00','school_closed'),('2027-01-08 09:00:00','school_closed'),
 ('2027-01-11 09:00:00','open'),('2027-03-25 09:00:00','school_closed'),
 ('2027-03-26 09:00:00','school_closed'),('2027-03-29 09:00:00','school_closed'),
 ('2027-03-30 09:00:00','school_closed'),('2027-04-02 09:00:00','school_closed'),
 ('2027-04-05 09:00:00','open'),('2027-05-06 09:00:00','school_closed'),
 ('2027-05-18 09:00:00','school_closed'),('2027-07-29 09:00:00','school_closed'),
 ('2027-11-02 09:00:00','school_closed'),('2028-04-13 09:00:00','school_closed'),
 ('2028-04-18 09:00:00','school_closed'),('2028-10-30 09:00:00','school_closed'),
 ('2029-03-26 09:00:00','school_closed'),('2030-06-11 09:00:00','school_closed'),
 ('2030-09-09 09:00:00','calendar_missing')
 ) AS cases(local_time,expected_reason)
 LOOP
  gate:=public.kompass_english_window_at(item.local_time::timestamp AT TIME ZONE 'Europe/Berlin');
  IF gate->>'reason'<>item.expected_reason THEN RAISE EXCEPTION 'Wrong gate for %: %',item.local_time,gate; END IF;
 END LOOP;
 IF NOT public.kompass_english_in_test_window('2026-10-23T06:00:00Z'::timestamptz)
  OR NOT public.kompass_english_in_test_window('2026-11-02T07:00:00Z'::timestamptz) THEN
  RAISE EXCEPTION 'Summer/winter time mismatch'; END IF;
 IF has_function_privilege('anon','public.kompass_english_window_at(timestamptz)','execute')
  OR has_function_privilege('anon','public.kompass_english_add_closure(date,date,text)','execute')
  OR has_table_privilege('anon','public.kompass_english_closures','SELECT') THEN RAISE EXCEPTION 'Calendar privilege leak'; END IF;
 -- No user is allowed to manage school closures by calling the RPC anonymously.
 PERFORM set_config('request.jwt.claim.sub','',true);
 BEGIN
  PERFORM public.kompass_english_add_closure(date '2026-11-02',date '2026-11-02','Synthetic blocked day');
  RAISE EXCEPTION 'Anonymous closure management accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 PERFORM set_config('request.jwt.claim.sub',(SELECT id::text FROM public.kompass_profiles WHERE display_name='Juliane Schöne' AND role='admin' AND active LIMIT 1),true);
 closure_id:=public.kompass_english_add_closure(date '2026-11-02',date '2026-11-02','Synthetic test closure');
 IF public.kompass_english_in_test_window('2026-11-02T08:00:00Z') THEN RAISE EXCEPTION 'School closure ignored'; END IF;
 PERFORM public.kompass_english_set_closure_active(closure_id,false);
 IF NOT public.kompass_english_in_test_window('2026-11-02T08:00:00Z') THEN RAISE EXCEPTION 'Deactivation failed'; END IF;
 PERFORM public.kompass_english_set_closure_active(closure_id,true);
 IF public.kompass_english_in_test_window('2026-11-02T08:00:00Z') THEN RAISE EXCEPTION 'Restoring a closure failed'; END IF;
 -- Catalog eligibility follows actual core English competencies; never other subjects.
 IF (SELECT count(*) FROM public.kompass_english_tasks t JOIN public.kompass_shared_state s ON s.id='school'
  CROSS JOIN LATERAL jsonb_array_elements(s.payload->'competencies') c
  WHERE t.is_assessment AND t.assessment_config IS NOT NULL AND c->>'id'=t.competency_id
   AND c->>'subject'='Englisch' AND c->>'type'='core' AND c->>'area'='Sprachliche Mittel – Wortschatz')<>2 THEN
  RAISE EXCEPTION 'Missing or incorrect competency mappings'; END IF;
 gate:=public.kompass_english_test_window();
 IF NOT (gate->>'open')::boolean THEN
  gate:=public.kompass_english_test_catalog('invalid','invalid');
  IF (gate->>'ok')::boolean OR jsonb_array_length(gate->'tests')<>0 THEN RAISE EXCEPTION 'Closed catalog exposed tests'; END IF;
 END IF;
END $test$;
SELECT 'Calendar boundaries, BW closures, DST, private helpers, school admin closures, restore, and competency mappings passed' AS verification;
ROLLBACK;
