-- Test portal: server clock, verified BW school calendar, and explicit competencies.
BEGIN;
CREATE TABLE public.kompass_english_closures (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), seed_key text UNIQUE,
 starts_on date NOT NULL, ends_on date NOT NULL,
 label text NOT NULL CHECK (length(label) BETWEEN 1 AND 120),
 scope text NOT NULL CHECK (scope IN ('state','school')),
 source_url text, active boolean NOT NULL DEFAULT true,
 created_by uuid REFERENCES auth.users(id), created_at timestamptz NOT NULL DEFAULT now(),
 CHECK (ends_on>=starts_on)
);
ALTER TABLE public.kompass_english_closures ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.kompass_english_closures FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.kompass_english_closures TO authenticated;
CREATE POLICY english_calendar_teacher_read ON public.kompass_english_closures FOR SELECT TO authenticated
 USING (EXISTS(SELECT 1 FROM public.kompass_profiles p WHERE p.id=(select auth.uid()) AND p.active AND p.role<>'lernatelier'));
INSERT INTO public.kompass_english_closures(seed_key,starts_on,ends_on,label,source_url,scope) VALUES
 ('bw-2026-07-30','2026-07-30','2026-09-12','Sommerferien','https://km.baden-wuerttemberg.de/de/service/ferien','state'),
 ('bw-2026-10-26','2026-10-26','2026-10-30','Herbstferien','https://km.baden-wuerttemberg.de/de/service/ferien','state'),
 ('bw-2026-12-23','2026-12-23','2027-01-09','Weihnachtsferien','https://km.baden-wuerttemberg.de/de/service/ferien','state'),
 ('bw-2027-03-30','2027-03-30','2027-04-03','Osterferien','https://km.baden-wuerttemberg.de/de/service/ferien','state'),
 ('bw-2027-05-18','2027-05-18','2027-05-29','Pfingstferien','https://km.baden-wuerttemberg.de/de/service/ferien','state'),
 ('bw-2027-07-29','2027-07-29','2027-09-11','Sommerferien','https://km.baden-wuerttemberg.de/de/service/ferien','state'),
 ('bw-2027-11-02','2027-11-02','2027-11-06','Herbstferien','https://km.baden-wuerttemberg.de/de/service/ferien','state'),
 ('bw-2027-12-23','2027-12-23','2028-01-08','Weihnachtsferien','https://km.baden-wuerttemberg.de/de/service/ferien','state'),
 ('bw-2028-04-18','2028-04-18','2028-04-22','Osterferien','https://km.baden-wuerttemberg.de/de/service/ferien','state'),
 ('bw-2028-06-06','2028-06-06','2028-06-17','Pfingstferien','https://km.baden-wuerttemberg.de/de/service/ferien','state'),
 ('bw-2028-07-27','2028-07-27','2028-09-09','Sommerferien','https://km.baden-wuerttemberg.de/de/service/ferien','state'),
 ('bw-2028-10-30','2028-10-30','2028-11-03','Herbstferien','https://km.baden-wuerttemberg.de/de/service/ferien','state'),
 ('bw-2028-12-23','2028-12-23','2029-01-05','Weihnachtsferien','https://km.baden-wuerttemberg.de/de/service/ferien','state'),
 ('bw-2029-03-26','2029-03-26','2029-04-07','Osterferien','https://km.baden-wuerttemberg.de/de/service/ferien','state'),
 ('bw-2029-05-22','2029-05-22','2029-06-01','Pfingstferien','https://km.baden-wuerttemberg.de/de/service/ferien','state'),
 ('bw-2029-07-26','2029-07-26','2029-09-08','Sommerferien','https://km.baden-wuerttemberg.de/de/service/ferien','state'),
 ('bw-2029-10-29','2029-10-29','2029-11-02','Herbstferien','https://km.baden-wuerttemberg.de/de/service/ferien','state'),
 ('bw-2029-12-22','2029-12-22','2030-01-05','Weihnachtsferien','https://km.baden-wuerttemberg.de/de/service/ferien','state'),
 ('bw-2030-04-15','2030-04-15','2030-04-26','Osterferien','https://km.baden-wuerttemberg.de/de/service/ferien','state'),
 ('bw-2030-06-11','2030-06-11','2030-06-21','Pfingstferien','https://km.baden-wuerttemberg.de/de/service/ferien','state'),
 ('bw-2030-07-25','2030-07-25','2030-09-07','Sommerferien','https://km.baden-wuerttemberg.de/de/service/ferien','state'),
 ('holiday-2026-01-01','2026-01-01','2026-01-01','Neujahr','https://im.baden-wuerttemberg.de/de/service/feiertage','state'),
 ('holiday-2026-01-06','2026-01-06','2026-01-06','Erscheinungsfest','https://im.baden-wuerttemberg.de/de/service/feiertage','state'),
 ('holiday-2026-05-01','2026-05-01','2026-05-01','Tag der Arbeit','https://im.baden-wuerttemberg.de/de/service/feiertage','state'),
 ('holiday-2026-10-03','2026-10-03','2026-10-03','Tag der Deutschen Einheit','https://im.baden-wuerttemberg.de/de/service/feiertage','state'),
 ('holiday-2026-10-31','2026-10-31','2026-10-31','Reformationsfest · schulfrei','https://im.baden-wuerttemberg.de/de/service/feiertage','state'),
 ('holiday-2026-11-01','2026-11-01','2026-11-01','Allerheiligen','https://im.baden-wuerttemberg.de/de/service/feiertage','state'),
 ('holiday-2026-12-25','2026-12-25','2026-12-25','Weihnachten','https://im.baden-wuerttemberg.de/de/service/feiertage','state'),
 ('holiday-2026-12-26','2026-12-26','2026-12-26','Zweiter Weihnachtsfeiertag','https://im.baden-wuerttemberg.de/de/service/feiertage','state'),
 ('holiday-2026-04-02','2026-04-02','2026-04-02','Gründonnerstag · schulfrei','https://im.baden-wuerttemberg.de/de/service/feiertage','state'),
 ('holiday-2026-04-03','2026-04-03','2026-04-03','Karfreitag','https://im.baden-wuerttemberg.de/de/service/feiertage','state'),
 ('holiday-2026-04-06','2026-04-06','2026-04-06','Ostermontag','https://im.baden-wuerttemberg.de/de/service/feiertage','state'),
 ('holiday-2026-05-14','2026-05-14','2026-05-14','Christi Himmelfahrt','https://im.baden-wuerttemberg.de/de/service/feiertage','state'),
 ('holiday-2026-05-25','2026-05-25','2026-05-25','Pfingstmontag','https://im.baden-wuerttemberg.de/de/service/feiertage','state'),
 ('holiday-2026-06-04','2026-06-04','2026-06-04','Fronleichnam','https://im.baden-wuerttemberg.de/de/service/feiertage','state'),
 ('holiday-2027-01-01','2027-01-01','2027-01-01','Neujahr','https://im.baden-wuerttemberg.de/de/service/feiertage','state'),
 ('holiday-2027-01-06','2027-01-06','2027-01-06','Erscheinungsfest','https://im.baden-wuerttemberg.de/de/service/feiertage','state'),
 ('holiday-2027-05-01','2027-05-01','2027-05-01','Tag der Arbeit','https://im.baden-wuerttemberg.de/de/service/feiertage','state'),
 ('holiday-2027-10-03','2027-10-03','2027-10-03','Tag der Deutschen Einheit','https://im.baden-wuerttemberg.de/de/service/feiertage','state'),
 ('holiday-2027-10-31','2027-10-31','2027-10-31','Reformationsfest · schulfrei','https://im.baden-wuerttemberg.de/de/service/feiertage','state'),
 ('holiday-2027-11-01','2027-11-01','2027-11-01','Allerheiligen','https://im.baden-wuerttemberg.de/de/service/feiertage','state'),
 ('holiday-2027-12-25','2027-12-25','2027-12-25','Weihnachten','https://im.baden-wuerttemberg.de/de/service/feiertage','state'),
 ('holiday-2027-12-26','2027-12-26','2027-12-26','Zweiter Weihnachtsfeiertag','https://im.baden-wuerttemberg.de/de/service/feiertage','state'),
 ('holiday-2027-03-25','2027-03-25','2027-03-25','Gründonnerstag · schulfrei','https://im.baden-wuerttemberg.de/de/service/feiertage','state'),
 ('holiday-2027-03-26','2027-03-26','2027-03-26','Karfreitag','https://im.baden-wuerttemberg.de/de/service/feiertage','state'),
 ('holiday-2027-03-29','2027-03-29','2027-03-29','Ostermontag','https://im.baden-wuerttemberg.de/de/service/feiertage','state'),
 ('holiday-2027-05-06','2027-05-06','2027-05-06','Christi Himmelfahrt','https://im.baden-wuerttemberg.de/de/service/feiertage','state'),
 ('holiday-2027-05-17','2027-05-17','2027-05-17','Pfingstmontag','https://im.baden-wuerttemberg.de/de/service/feiertage','state'),
 ('holiday-2027-05-27','2027-05-27','2027-05-27','Fronleichnam','https://im.baden-wuerttemberg.de/de/service/feiertage','state'),
 ('holiday-2028-01-01','2028-01-01','2028-01-01','Neujahr','https://im.baden-wuerttemberg.de/de/service/feiertage','state'),
 ('holiday-2028-01-06','2028-01-06','2028-01-06','Erscheinungsfest','https://im.baden-wuerttemberg.de/de/service/feiertage','state'),
 ('holiday-2028-05-01','2028-05-01','2028-05-01','Tag der Arbeit','https://im.baden-wuerttemberg.de/de/service/feiertage','state'),
 ('holiday-2028-10-03','2028-10-03','2028-10-03','Tag der Deutschen Einheit','https://im.baden-wuerttemberg.de/de/service/feiertage','state'),
 ('holiday-2028-10-31','2028-10-31','2028-10-31','Reformationsfest · schulfrei','https://im.baden-wuerttemberg.de/de/service/feiertage','state'),
 ('holiday-2028-11-01','2028-11-01','2028-11-01','Allerheiligen','https://im.baden-wuerttemberg.de/de/service/feiertage','state'),
 ('holiday-2028-12-25','2028-12-25','2028-12-25','Weihnachten','https://im.baden-wuerttemberg.de/de/service/feiertage','state'),
 ('holiday-2028-12-26','2028-12-26','2028-12-26','Zweiter Weihnachtsfeiertag','https://im.baden-wuerttemberg.de/de/service/feiertage','state'),
 ('holiday-2028-04-13','2028-04-13','2028-04-13','Gründonnerstag · schulfrei','https://im.baden-wuerttemberg.de/de/service/feiertage','state'),
 ('holiday-2028-04-14','2028-04-14','2028-04-14','Karfreitag','https://im.baden-wuerttemberg.de/de/service/feiertage','state'),
 ('holiday-2028-04-17','2028-04-17','2028-04-17','Ostermontag','https://im.baden-wuerttemberg.de/de/service/feiertage','state'),
 ('holiday-2028-05-25','2028-05-25','2028-05-25','Christi Himmelfahrt','https://im.baden-wuerttemberg.de/de/service/feiertage','state'),
 ('holiday-2028-06-05','2028-06-05','2028-06-05','Pfingstmontag','https://im.baden-wuerttemberg.de/de/service/feiertage','state'),
 ('holiday-2028-06-15','2028-06-15','2028-06-15','Fronleichnam','https://im.baden-wuerttemberg.de/de/service/feiertage','state'),
 ('holiday-2029-01-01','2029-01-01','2029-01-01','Neujahr','https://im.baden-wuerttemberg.de/de/service/feiertage','state'),
 ('holiday-2029-01-06','2029-01-06','2029-01-06','Erscheinungsfest','https://im.baden-wuerttemberg.de/de/service/feiertage','state'),
 ('holiday-2029-05-01','2029-05-01','2029-05-01','Tag der Arbeit','https://im.baden-wuerttemberg.de/de/service/feiertage','state'),
 ('holiday-2029-10-03','2029-10-03','2029-10-03','Tag der Deutschen Einheit','https://im.baden-wuerttemberg.de/de/service/feiertage','state'),
 ('holiday-2029-10-31','2029-10-31','2029-10-31','Reformationsfest · schulfrei','https://im.baden-wuerttemberg.de/de/service/feiertage','state'),
 ('holiday-2029-11-01','2029-11-01','2029-11-01','Allerheiligen','https://im.baden-wuerttemberg.de/de/service/feiertage','state'),
 ('holiday-2029-12-25','2029-12-25','2029-12-25','Weihnachten','https://im.baden-wuerttemberg.de/de/service/feiertage','state'),
 ('holiday-2029-12-26','2029-12-26','2029-12-26','Zweiter Weihnachtsfeiertag','https://im.baden-wuerttemberg.de/de/service/feiertage','state'),
 ('holiday-2029-03-29','2029-03-29','2029-03-29','Gründonnerstag · schulfrei','https://im.baden-wuerttemberg.de/de/service/feiertage','state'),
 ('holiday-2029-03-30','2029-03-30','2029-03-30','Karfreitag','https://im.baden-wuerttemberg.de/de/service/feiertage','state'),
 ('holiday-2029-04-02','2029-04-02','2029-04-02','Ostermontag','https://im.baden-wuerttemberg.de/de/service/feiertage','state'),
 ('holiday-2029-05-10','2029-05-10','2029-05-10','Christi Himmelfahrt','https://im.baden-wuerttemberg.de/de/service/feiertage','state'),
 ('holiday-2029-05-21','2029-05-21','2029-05-21','Pfingstmontag','https://im.baden-wuerttemberg.de/de/service/feiertage','state'),
 ('holiday-2029-05-31','2029-05-31','2029-05-31','Fronleichnam','https://im.baden-wuerttemberg.de/de/service/feiertage','state'),
 ('holiday-2030-01-01','2030-01-01','2030-01-01','Neujahr','https://im.baden-wuerttemberg.de/de/service/feiertage','state'),
 ('holiday-2030-01-06','2030-01-06','2030-01-06','Erscheinungsfest','https://im.baden-wuerttemberg.de/de/service/feiertage','state'),
 ('holiday-2030-05-01','2030-05-01','2030-05-01','Tag der Arbeit','https://im.baden-wuerttemberg.de/de/service/feiertage','state'),
 ('holiday-2030-10-03','2030-10-03','2030-10-03','Tag der Deutschen Einheit','https://im.baden-wuerttemberg.de/de/service/feiertage','state'),
 ('holiday-2030-10-31','2030-10-31','2030-10-31','Reformationsfest · schulfrei','https://im.baden-wuerttemberg.de/de/service/feiertage','state'),
 ('holiday-2030-11-01','2030-11-01','2030-11-01','Allerheiligen','https://im.baden-wuerttemberg.de/de/service/feiertage','state'),
 ('holiday-2030-12-25','2030-12-25','2030-12-25','Weihnachten','https://im.baden-wuerttemberg.de/de/service/feiertage','state'),
 ('holiday-2030-12-26','2030-12-26','2030-12-26','Zweiter Weihnachtsfeiertag','https://im.baden-wuerttemberg.de/de/service/feiertage','state'),
 ('holiday-2030-04-18','2030-04-18','2030-04-18','Gründonnerstag · schulfrei','https://im.baden-wuerttemberg.de/de/service/feiertage','state'),
 ('holiday-2030-04-19','2030-04-19','2030-04-19','Karfreitag','https://im.baden-wuerttemberg.de/de/service/feiertage','state'),
 ('holiday-2030-04-22','2030-04-22','2030-04-22','Ostermontag','https://im.baden-wuerttemberg.de/de/service/feiertage','state'),
 ('holiday-2030-05-30','2030-05-30','2030-05-30','Christi Himmelfahrt','https://im.baden-wuerttemberg.de/de/service/feiertage','state'),
 ('holiday-2030-06-10','2030-06-10','2030-06-10','Pfingstmontag','https://im.baden-wuerttemberg.de/de/service/feiertage','state'),
 ('holiday-2030-06-20','2030-06-20','2030-06-20','Fronleichnam','https://im.baden-wuerttemberg.de/de/service/feiertage','state');

CREATE OR REPLACE FUNCTION public.kompass_english_window_at(p_at timestamptz)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE d date:=(p_at AT TIME ZONE 'Europe/Berlin')::date;
 t time:=(p_at AT TIME ZONE 'Europe/Berlin')::time; reason text; msg text; closure text;
BEGIN
 IF d IS NULL OR d<date '2026-09-14' OR d>date '2030-09-08' THEN
  reason:='calendar_missing';msg:='Der Ferienkalender muss aktualisiert werden. Bitte die Lehrkraft fragen.';
 ELSE
  SELECT label INTO closure FROM public.kompass_english_closures WHERE active AND d BETWEEN starts_on AND ends_on
   ORDER BY (scope='school') DESC,starts_on LIMIT 1;
  IF FOUND THEN reason:='school_closed';msg:='Der Testbereich ist heute geschlossen: '||closure||'. Üben kannst du jederzeit.';
  ELSIF extract(isodow FROM d)>5 THEN reason:='weekend';msg:='Der Testbereich ist am Wochenende geschlossen. Üben kannst du jederzeit.';
  ELSIF t<time '08:00' OR t>=time '12:30' THEN reason:='outside_hours';msg:='Der Testbereich öffnet an Schultagen von 8:00 bis 12:30 Uhr. Üben kannst du jederzeit.';
  ELSE reason:='open';msg:='Der Testbereich ist geöffnet. Bitte vor 12:30 Uhr abgeben.'; END IF;
 END IF;
 RETURN jsonb_build_object('open',reason='open','reason',reason,'message',msg,'test_date',d,
 'server_now',p_at,'timezone','Europe/Berlin','opens_at',(d+time '08:00') AT TIME ZONE 'Europe/Berlin',
 'closes_at',(d+time '12:30') AT TIME ZONE 'Europe/Berlin','calendar_valid_until','2030-09-08');
END $$;
REVOKE ALL ON FUNCTION public.kompass_english_window_at(timestamptz) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.kompass_english_in_test_window(p_at timestamptz)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT (public.kompass_english_window_at(p_at)->>'open')::boolean
$$;
CREATE OR REPLACE FUNCTION public.kompass_english_test_window()
RETURNS jsonb LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT public.kompass_english_window_at(clock_timestamp())
$$;

ALTER TABLE public.kompass_english_tasks ADD COLUMN assessment_config jsonb;
UPDATE public.kompass_english_tasks SET assessment_config='{"id":"u4-test-1","list":"16","range":"shop – now","source":"LWL · Station 1 · Aufgabe 2a","scope":"Wortschatz-Teilnachweis"}' WHERE task_key='vocab:lwl-u4-test-1';
UPDATE public.kompass_english_tasks SET assessment_config='{"id":"u4-test-2","list":"17","range":"way – by (bike)","source":"LWL · Station 2 · Aufgabe 3a","scope":"Wortschatz-Teilnachweis"}' WHERE task_key='vocab:lwl-u4-test-2';
CREATE OR REPLACE FUNCTION public.kompass_english_test_catalog(p_token text,p_pin text)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE gate jsonb; pin_check jsonb; tests jsonb;
BEGIN
 gate:=public.kompass_english_test_window();
 IF NOT (gate->>'open')::boolean THEN RETURN gate||jsonb_build_object('ok',false,'tests','[]'::jsonb); END IF;
 pin_check:=public.kompass_english_check_pin(p_token,p_pin);
 IF NOT (pin_check->>'ok')::boolean THEN RETURN pin_check||jsonb_build_object('tests','[]'::jsonb); END IF;
 gate:=public.kompass_english_test_window();
 IF NOT (gate->>'open')::boolean THEN RETURN gate||jsonb_build_object('ok',false,'tests','[]'::jsonb); END IF;
 SELECT coalesce(jsonb_agg(t.assessment_config||jsonb_build_object('task_key',t.task_key,'title',t.title,
  'unit',t.unit,'question_count',t.expected_questions,'competency_id',c->>'id','competency_text',c->>'text',
  'competency_area',c->>'area') ORDER BY t.unit,t.task_key),'[]'::jsonb)
 INTO tests FROM public.kompass_english_tasks t JOIN public.kompass_shared_state s ON s.id='school'
 CROSS JOIN LATERAL jsonb_array_elements(s.payload->'competencies') c
 WHERE t.is_assessment AND t.assessment_config IS NOT NULL AND t.expected_questions>0
 AND c->>'id'=t.competency_id AND c->>'subject'='Englisch' AND c->>'type'='core';
 RETURN gate||jsonb_build_object('ok',true,'tests',tests);
END $$;
REVOKE ALL ON FUNCTION public.kompass_english_test_catalog(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kompass_english_test_catalog(text,text) TO anon,authenticated;

CREATE OR REPLACE FUNCTION public.kompass_english_add_closure(p_start date,p_end date,p_label text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE result uuid;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.kompass_profiles WHERE id=auth.uid() AND active AND role='admin') THEN
  RAISE EXCEPTION 'Nur Admins dürfen schulweite Sperrtage verwalten.' USING ERRCODE='42501'; END IF;
 IF p_start IS NULL OR p_end IS NULL OR p_end<p_start OR p_end-p_start>366 OR length(trim(p_label)) NOT BETWEEN 1 AND 120 OR p_label IS NULL THEN
  RAISE EXCEPTION 'Bitte einen gültigen Zeitraum und eine Bezeichnung angeben.'; END IF;
 INSERT INTO public.kompass_english_closures(starts_on,ends_on,label,scope,created_by)
 VALUES(p_start,p_end,trim(p_label),'school',auth.uid()) RETURNING id INTO result;
 RETURN result;
END $$;
CREATE OR REPLACE FUNCTION public.kompass_english_set_closure_active(p_id uuid,p_active boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.kompass_profiles WHERE id=auth.uid() AND active AND role='admin') THEN
  RAISE EXCEPTION 'Nur Admins dürfen schulweite Sperrtage verwalten.' USING ERRCODE='42501'; END IF;
 IF p_active IS NULL THEN RAISE EXCEPTION 'Status fehlt.'; END IF;
 UPDATE public.kompass_english_closures SET active=p_active WHERE id=p_id AND scope='school';
 IF NOT FOUND THEN RAISE EXCEPTION 'Schulischer Sperrtag nicht gefunden.'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.kompass_english_add_closure(date,date,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.kompass_english_set_closure_active(uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.kompass_english_add_closure(date,date,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.kompass_english_set_closure_active(uuid,boolean) TO authenticated;
CREATE OR REPLACE FUNCTION public.kompass_english_submit_result_v3(
 p_token text,p_pin text,p_attempt_id uuid,p_task_key text,p_topic text,
 p_points integer,p_max_points integer,p_test_date date)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v jsonb; v_title text; v_at timestamptz; v_existing boolean; v_expected integer;
BEGIN
 v:=public.kompass_english_check_pin(p_token,p_pin);
 IF NOT (v->>'ok')::boolean THEN RETURN v; END IF;
 SELECT title,expected_questions INTO v_title,v_expected FROM public.kompass_english_tasks WHERE task_key=p_task_key AND is_assessment;
 IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'practice_only',true,'message','Dies ist eine Übung, kein Test laut Lernwegeliste. Kein Ergebnis übertragen. Bitte die Seite neu laden und den vorgesehenen LWL-Test öffnen.'); END IF;
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
  'source','english_practice','value',v_status,'level',v_record->'level','score',v_score,'note','LWL-Test · Wortschatz-Teilnachweis');
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
