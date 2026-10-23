-- English Practice -> KOMPASS. Run once in the KOMPASS Supabase SQL editor.
-- Additive migration: existing rosters, competencies and assessments are untouched.
BEGIN;

CREATE TABLE IF NOT EXISTS public.kompass_english_links (
  grade smallint NOT NULL REFERENCES public.kompass_grade_state(grade),
  pupil_id text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  PRIMARY KEY (grade, pupil_id)
);
CREATE TABLE IF NOT EXISTS public.kompass_english_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grade smallint NOT NULL,
  pupil_id text NOT NULL,
  attempt_id uuid NOT NULL,
  task_key text NOT NULL CHECK (length(task_key) BETWEEN 1 AND 80),
  topic text NOT NULL CHECK (length(topic) BETWEEN 1 AND 200),
  points integer NOT NULL CHECK (points >= 0),
  max_points integer NOT NULL CHECK (max_points BETWEEN 1 AND 500 AND points <= max_points),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'english_practice_selfcheck' CHECK (source = 'english_practice_selfcheck'),
  UNIQUE (grade, pupil_id, attempt_id),
  FOREIGN KEY (grade, pupil_id) REFERENCES public.kompass_english_links(grade, pupil_id)
);
CREATE INDEX IF NOT EXISTS kompass_english_results_pupil_date
  ON public.kompass_english_results(grade, pupil_id, submitted_at DESC);
ALTER TABLE public.kompass_english_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kompass_english_results ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.kompass_english_links FROM anon, authenticated;
REVOKE ALL ON public.kompass_english_results FROM anon, authenticated;
GRANT SELECT ON public.kompass_english_results TO authenticated;

CREATE OR REPLACE FUNCTION public.kompass_english_teacher_access(p_grade smallint, p_manage boolean DEFAULT false)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.kompass_profiles p
    WHERE p.id = auth.uid() AND p.active AND p.role <> 'lernatelier'
      AND public.has_kompass_grade_access(p_grade, CASE WHEN p_manage THEN 'leitung' ELSE 'teacher' END)
  )
$$;
REVOKE ALL ON FUNCTION public.kompass_english_teacher_access(smallint,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.kompass_english_teacher_access(smallint,boolean) TO authenticated;
DROP POLICY IF EXISTS kompass_english_results_teacher_read ON public.kompass_english_results;
CREATE POLICY kompass_english_results_teacher_read ON public.kompass_english_results
  FOR SELECT TO authenticated USING (public.kompass_english_teacher_access(grade));

-- Tokens are returned once for printing; only SHA-256 hashes are retained.
CREATE OR REPLACE FUNCTION public.kompass_english_issue_code(p_grade smallint, p_pupil_id text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_token text;
BEGIN
  IF NOT public.kompass_english_teacher_access(p_grade, true) THEN
    RAISE EXCEPTION 'Keine Berechtigung zur Codeverwaltung.' USING ERRCODE='42501';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.kompass_grade_state g,
      LATERAL jsonb_array_elements(coalesce(g.payload->'pupils','[]'::jsonb)) p
    WHERE g.grade=p_grade AND p->>'id'=p_pupil_id
      AND coalesce(p->>'archived','false') <> 'true'
  ) THEN RAISE EXCEPTION 'Kind nicht im aktiven Cloudbestand gefunden.'; END IF;
  v_token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  INSERT INTO public.kompass_english_links(grade,pupil_id,token_hash,created_by)
    VALUES(p_grade,p_pupil_id,encode(sha256(convert_to(v_token,'UTF8')),'hex'),auth.uid())
    ON CONFLICT(grade,pupil_id) DO UPDATE SET token_hash=EXCLUDED.token_hash,
      active=true,created_at=now(),created_by=auth.uid();
  RETURN v_token;
END $$;

CREATE OR REPLACE FUNCTION public.kompass_english_revoke_code(p_grade smallint, p_pupil_id text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NOT public.kompass_english_teacher_access(p_grade, true) THEN
    RAISE EXCEPTION 'Keine Berechtigung zur Codeverwaltung.' USING ERRCODE='42501';
  END IF;
  UPDATE public.kompass_english_links SET active=false WHERE grade=p_grade AND pupil_id=p_pupil_id;
END $$;

-- No table access for children. This endpoint returns only the first name.
CREATE OR REPLACE FUNCTION public.kompass_english_resolve_code(p_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_name text;
BEGIN
  IF p_token IS NULL OR p_token !~ '^[a-f0-9]{64}$' THEN
    RAISE EXCEPTION 'Code ungültig oder gesperrt.';
  END IF;
  SELECT p->>'first' INTO v_name FROM public.kompass_english_links l
    JOIN public.kompass_grade_state g ON g.grade=l.grade,
    LATERAL jsonb_array_elements(coalesce(g.payload->'pupils','[]'::jsonb)) p
    WHERE l.token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex') AND l.active
      AND p->>'id'=l.pupil_id AND coalesce(p->>'archived','false') <> 'true';
  IF NOT FOUND THEN RAISE EXCEPTION 'Code ungültig oder gesperrt.'; END IF;
  RETURN jsonb_build_object('first_name',coalesce(v_name,'Hallo'));
END $$;

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
    OR p_task_key NOT LIKE 'vocab:%' OR p_points IS NULL OR p_max_points IS NULL
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

REVOKE ALL ON FUNCTION public.kompass_english_issue_code(smallint,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.kompass_english_revoke_code(smallint,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.kompass_english_resolve_code(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.kompass_english_submit_result(text,uuid,text,text,integer,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kompass_english_issue_code(smallint,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.kompass_english_revoke_code(smallint,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.kompass_english_resolve_code(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.kompass_english_submit_result(text,uuid,text,text,integer,integer) TO anon, authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
