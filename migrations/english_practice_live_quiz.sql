-- Live vocabulary quizzes: private data, capability-based pupil access, teacher-only hosting.
CREATE SCHEMA IF NOT EXISTS english_quiz_private;
REVOKE ALL ON SCHEMA english_quiz_private FROM PUBLIC;
GRANT USAGE ON SCHEMA english_quiz_private TO anon, authenticated;
CREATE TABLE english_quiz_private.games (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL, title text NOT NULL,
 questions jsonb NOT NULL, phase text NOT NULL DEFAULT 'lobby', question integer NOT NULL DEFAULT 0,
 deadline timestamptz, expires_at timestamptz NOT NULL DEFAULT now()+interval '6 hours'
);
CREATE TABLE english_quiz_private.players (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), game_id uuid NOT NULL REFERENCES english_quiz_private.games ON DELETE CASCADE,
 secret uuid NOT NULL DEFAULT gen_random_uuid(), personal boolean NOT NULL DEFAULT false,
 pupil_id text, grade smallint, alias text NOT NULL, score integer NOT NULL DEFAULT 0,
 UNIQUE(game_id,grade,pupil_id)
);
CREATE TABLE english_quiz_private.answers (
 player_id uuid REFERENCES english_quiz_private.players ON DELETE CASCADE,
 question integer NOT NULL, choice integer NOT NULL, points integer NOT NULL,
 PRIMARY KEY(player_id,question)
);
ALTER TABLE english_quiz_private.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE english_quiz_private.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE english_quiz_private.answers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA english_quiz_private FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION english_quiz_private.request(p_action text,p_game uuid DEFAULT NULL,p_secret uuid DEFAULT NULL,p_data jsonb DEFAULT '{}')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE g english_quiz_private.games; p english_quiz_private.players; q jsonb; v jsonb;
 teacher boolean; n integer; pts integer; chosen integer; correct integer; alias_name text;
BEGIN
 teacher := auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM public.kompass_profiles WHERE id=auth.uid() AND active AND role IN ('teacher','leitung','admin'));
 IF p_action='create' THEN
  IF NOT teacher THEN RAISE EXCEPTION 'Nur Lehrkräfte können ein Live-Quiz starten.' USING ERRCODE='42501'; END IF;
  IF jsonb_typeof(p_data->'questions') IS DISTINCT FROM 'array' OR jsonb_array_length(p_data->'questions')<>15 THEN RAISE EXCEPTION 'Bitte genau 15 Fragen auswählen.'; END IF;
  FOR q IN SELECT value FROM jsonb_array_elements(p_data->'questions') LOOP
   IF jsonb_typeof(q->'options') IS DISTINCT FROM 'array' OR jsonb_array_length(q->'options')<>4 OR (q->>'answer')::integer NOT BETWEEN 0 AND 3 OR length(q->>'prompt') NOT BETWEEN 1 AND 300 THEN RAISE EXCEPTION 'Ungültige Frage.'; END IF;
  END LOOP;
  INSERT INTO english_quiz_private.games(owner_id,title,questions) VALUES(auth.uid(),left(p_data->>'title',150),p_data->'questions') RETURNING * INTO g;
 ELSE
  SELECT * INTO g FROM english_quiz_private.games WHERE id=p_game AND expires_at>now() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Dieses Quiz ist abgelaufen oder nicht vorhanden.'; END IF;
 END IF;
 teacher := teacher AND g.owner_id=auth.uid();
 IF p_secret IS NOT NULL THEN SELECT * INTO p FROM english_quiz_private.players WHERE game_id=g.id AND secret=p_secret; END IF;
 IF p_action='join' THEN
  IF g.phase<>'lobby' THEN RAISE EXCEPTION 'Das Quiz hat bereits begonnen.'; END IF;
  IF p.id IS NULL THEN
   IF (SELECT count(*) FROM english_quiz_private.players WHERE game_id=g.id)>=100 THEN RAISE EXCEPTION 'Das Quiz ist voll.'; END IF;
   IF p_data->>'mode'='personal' THEN
    v:=public.kompass_english_resolve_code_v2(p_data->>'token',p_data->>'pin');
    IF coalesce((v->>'ok')::boolean,false)=false THEN RAISE EXCEPTION 'Bitte zuerst mit deinem persönlichen Code anmelden.'; END IF;
    SELECT l.grade,l.pupil_id INTO p.grade,p.pupil_id FROM public.kompass_english_links l WHERE l.active AND l.token_hash=encode(sha256(convert_to(p_data->>'token','UTF8')),'hex');
    IF p.pupil_id IS NULL THEN RAISE EXCEPTION 'Persönlicher Zugang ungültig.'; END IF;
    IF EXISTS(SELECT 1 FROM english_quiz_private.players x WHERE x.game_id=g.id AND x.grade=p.grade AND x.pupil_id=p.pupil_id) THEN RAISE EXCEPTION 'Du bist schon auf einem anderen Gerät dabei.'; END IF;
   ELSIF p_data->>'mode' IS DISTINCT FROM 'guest' THEN RAISE EXCEPTION 'Bitte einen Spielmodus wählen.'; END IF;
   SELECT count(*)+1 INTO n FROM english_quiz_private.players WHERE game_id=g.id;
   INSERT INTO english_quiz_private.players(game_id,personal,pupil_id,grade,alias) VALUES(g.id,p.pupil_id IS NOT NULL,p.pupil_id,p.grade,'Spieler '||n) RETURNING * INTO p;
  END IF;
 ELSIF p_action IN ('start','reveal','next','finish') THEN
  IF NOT coalesce(teacher,false) THEN RAISE EXCEPTION 'Nur die Spielleitung kann das Quiz steuern.' USING ERRCODE='42501'; END IF;
  IF p_action='start' AND g.phase='lobby' THEN g.phase:='question';g.question:=0;g.deadline:=now()+interval '20 seconds';
  ELSIF p_action='reveal' AND g.phase='question' THEN g.phase:='reveal';
  ELSIF p_action='next' AND g.phase='reveal' THEN
   IF g.question=14 THEN g.phase:='finished'; ELSE g.question:=g.question+1;g.phase:='question';g.deadline:=now()+interval '20 seconds'; END IF;
  ELSIF p_action='finish' THEN g.phase:='finished';
  ELSE RAISE EXCEPTION 'Diese Aktion ist gerade nicht möglich.'; END IF;
  UPDATE english_quiz_private.games SET phase=g.phase,question=g.question,deadline=g.deadline WHERE id=g.id;
 ELSIF p_action='answer' THEN
  IF p.id IS NULL THEN RAISE EXCEPTION 'Bitte zuerst beitreten.'; END IF;
  IF g.phase<>'question' OR now()>g.deadline OR (p_data->>'question')::integer<>g.question THEN RAISE EXCEPTION 'Die Antwortzeit ist vorbei.'; END IF;
  chosen:=(p_data->>'choice')::integer;
  IF chosen IS NULL OR chosen NOT BETWEEN 0 AND 3 THEN RAISE EXCEPTION 'Ungültige Antwort.'; END IF;
  correct:=(g.questions->g.question->>'answer')::integer;
  pts:=CASE WHEN chosen=correct THEN 1000+greatest(0,least(200,floor(extract(epoch FROM g.deadline-now())*10)::integer)) ELSE 0 END;
  INSERT INTO english_quiz_private.answers VALUES(p.id,g.question,chosen,pts) ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS n=ROW_COUNT;
  IF n=1 THEN UPDATE english_quiz_private.players SET score=score+pts WHERE id=p.id RETURNING * INTO p; END IF;
 ELSIF p_action NOT IN ('state','create') THEN RAISE EXCEPTION 'Unbekannte Aktion.';
 END IF;
 -- Before joining, only lobby metadata is returned. Solutions are never sent during a question.
 q:=CASE WHEN teacher OR p.id IS NOT NULL THEN (g.questions->g.question)-'answer' ELSE NULL END;
 IF g.phase IN ('reveal','finished') AND q IS NOT NULL THEN q:=q||jsonb_build_object('answer',g.questions->g.question->'answer'); END IF;
 RETURN jsonb_build_object('id',g.id,'title',g.title,'phase',g.phase,'question',g.question,'total',15,'deadline',g.deadline,'serverTime',now(),'q',q,
 'count',(SELECT count(*) FROM english_quiz_private.players WHERE game_id=g.id),
 'answered',(SELECT count(*) FROM english_quiz_private.answers a JOIN english_quiz_private.players x ON x.id=a.player_id WHERE x.game_id=g.id AND a.question=g.question),
 'me',CASE WHEN p.id IS NOT NULL THEN jsonb_build_object('id',p.id,'secret',p.secret,'alias',p.alias,'personal',p.personal,'score',p.score,'choice',(SELECT choice FROM english_quiz_private.answers WHERE player_id=p.id AND question=g.question)) END,
 'leaders',CASE WHEN (teacher OR p.id IS NOT NULL) AND g.phase IN ('lobby','reveal','finished') THEN (SELECT coalesce(jsonb_agg(t),'[]') FROM (SELECT id,alias,score FROM english_quiz_private.players WHERE game_id=g.id ORDER BY score DESC,alias LIMIT 100) t) ELSE '[]'::jsonb END);
END $$;
REVOKE ALL ON FUNCTION english_quiz_private.request(text,uuid,uuid,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION english_quiz_private.request(text,uuid,uuid,jsonb) TO anon,authenticated;
CREATE OR REPLACE FUNCTION public.kompass_english_quiz(p_action text,p_game uuid DEFAULT NULL,p_secret uuid DEFAULT NULL,p_data jsonb DEFAULT '{}')
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT english_quiz_private.request(p_action,p_game,p_secret,p_data) $$;
REVOKE ALL ON FUNCTION public.kompass_english_quiz(text,uuid,uuid,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kompass_english_quiz(text,uuid,uuid,jsonb) TO anon,authenticated;
