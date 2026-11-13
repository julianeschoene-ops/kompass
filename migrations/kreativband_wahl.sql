BEGIN;

CREATE SCHEMA IF NOT EXISTS kompass_kreativband;
REVOKE ALL ON SCHEMA kompass_kreativband FROM PUBLIC, anon, authenticated;

CREATE TABLE kompass_kreativband.weeks (
  monday date PRIMARY KEY CHECK (extract(isodow FROM monday) = 1),
  grades smallint[] NOT NULL DEFAULT '{}' CHECK (grades <@ ARRAY[5,6,7]::smallint[])
);

CREATE TABLE kompass_kreativband.offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  monday date NOT NULL REFERENCES kompass_kreativband.weeks,
  day date NOT NULL,
  activity text NOT NULL,
  title text NOT NULL CHECK (length(title) BETWEEN 1 AND 150),
  period smallint NOT NULL CHECK (period IN (5,6,56)),
  capacity integer NOT NULL CHECK (capacity BETWEEN 1 AND 500),
  sport boolean NOT NULL,
  cancelled boolean NOT NULL DEFAULT false,
  CHECK (day BETWEEN monday AND monday + 4)
);
CREATE UNIQUE INDEX ON kompass_kreativband.offers(day,activity,period) WHERE NOT cancelled;

CREATE TABLE kompass_kreativband.codes (
  pupil text PRIMARY KEY,
  -- Reprints use the current code. Only the authorized card and rotation RPCs
  -- can read it; the private table has no client grants.
  code text NOT NULL CHECK (code ~ '^[0-9a-f]{32}$'),
  digest bytea GENERATED ALWAYS AS (sha256(code::bytea)) STORED UNIQUE
);

CREATE TABLE kompass_kreativband.bookings (
  offer uuid REFERENCES kompass_kreativband.offers,
  pupil text REFERENCES kompass_kreativband.codes,
  grade smallint NOT NULL CHECK (grade IN (5,6,7)),
  status text NOT NULL DEFAULT 'booked' CHECK (status IN ('booked','cancelled','blocked')),
  PRIMARY KEY (offer, pupil)
);

CREATE INDEX ON kompass_kreativband.bookings(pupil) WHERE status = 'booked';
CREATE INDEX ON kompass_kreativband.offers(monday);

CREATE TABLE kompass_kreativband.blocks (
  monday date NOT NULL REFERENCES kompass_kreativband.weeks,
  pupil text NOT NULL,
  location text NOT NULL CHECK (length(location) <= 160),
  PRIMARY KEY (monday, pupil)
);

CREATE TABLE kompass_kreativband.absences (
  offer uuid NOT NULL,
  pupil text NOT NULL,
  period smallint NOT NULL CHECK (period IN (5,6)),
  status text NOT NULL CHECK (status IN ('missing','excused')),
  note text NOT NULL DEFAULT '' CHECK (length(note) <= 1200),
  PRIMARY KEY (offer, pupil, period),
  FOREIGN KEY (offer, pupil) REFERENCES kompass_kreativband.bookings
);

ALTER TABLE kompass_kreativband.weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE kompass_kreativband.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE kompass_kreativband.codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE kompass_kreativband.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE kompass_kreativband.blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE kompass_kreativband.absences ENABLE ROW LEVEL SECURITY;

CREATE FUNCTION kompass_kreativband.staff() RETURNS boolean
LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.kompass_profiles
    WHERE id = auth.uid() AND active AND role IN ('teacher','admin')
  )
$$;

CREATE FUNCTION kompass_kreativband.planner() RETURNS boolean
LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT kompass_kreativband.staff() AND (
    public.is_kompass_admin() OR EXISTS (
      SELECT 1 FROM public.kompass_grade_access
      WHERE user_id = auth.uid() AND access_level = 'leitung' AND grade IN (5,6,7)
    )
  )
$$;

CREATE FUNCTION kompass_kreativband.coach(p_pupil text) RETURNS boolean
LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.kompass_profiles AS profile
    JOIN public.kompass_creative_roster AS roster ON roster.pupil_id = p_pupil
    JOIN public.kompass_grade_state AS gs ON gs.grade = roster.grade
    CROSS JOIN LATERAL jsonb_array_elements(gs.payload->'pupils') AS p
    WHERE profile.id = auth.uid() AND profile.active AND profile.role IN ('teacher','admin')
      AND NOT roster.archived AND p->>'id' = p_pupil
      AND (
        profile.role = 'admin'
        OR (nullif(lower(btrim(p->>'coachingGroup')), '') =
          nullif(lower(btrim(profile.coaching_groups->>roster.grade::text)), ''))
        OR (nullif(lower(btrim(p->>'coach')), '') = lower(btrim(profile.display_name)))
      )
  )
$$;

CREATE FUNCTION kompass_kreativband.today() RETURNS date
LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT (now() AT TIME ZONE 'Europe/Berlin')::date
$$;

-- Keep write APIs inside a non-exposed schema. The public invoker functions at
-- the bottom provide the PostgREST entry points.
CREATE FUNCTION kompass_kreativband.student(p_code text, p_monday date, p_offer uuid DEFAULT NULL, p_cancel boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  child public.kompass_creative_roster;
  week kompass_kreativband.weeks;
  offer_row kompass_kreativband.offers;
  blockade kompass_kreativband.blocks;
  sport_count int;
  offers jsonb;
BEGIN
  IF p_code IS NULL OR p_code !~ '^[0-9A-Fa-f -]{32,45}$'
    OR translate(p_code, ' -', '') !~ '^[0-9A-Fa-f]{32}$' THEN
    RAISE EXCEPTION 'Der KOMPASS-Code stimmt nicht.';
  END IF;
  SELECT r.* INTO child FROM kompass_kreativband.codes AS c
    JOIN public.kompass_creative_roster AS r ON r.pupil_id = c.pupil
    WHERE c.digest = sha256(convert_to(lower(translate(p_code, ' -', '')), 'UTF8'))
      AND NOT r.archived AND r.grade IN (5,6,7);
  IF NOT FOUND THEN RAISE EXCEPTION 'Der KOMPASS-Code stimmt nicht.'; END IF;

  -- All weekly writes take the same lock, including cancellation and sanctions.
  IF p_offer IS NOT NULL THEN
    SELECT * INTO week FROM kompass_kreativband.weeks WHERE monday = p_monday FOR UPDATE;
    -- Recheck a code that may have been revoked while waiting on the week.
    PERFORM 1 FROM kompass_kreativband.codes
      WHERE pupil = child.pupil_id AND digest = sha256(convert_to(lower(translate(p_code, ' -', '')), 'UTF8')) FOR KEY SHARE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Der KOMPASS-Code stimmt nicht.'; END IF;
  ELSE
    SELECT * INTO week FROM kompass_kreativband.weeks WHERE monday = p_monday;
  END IF;
  IF NOT coalesce(child.grade = ANY(week.grades), false) THEN
    IF p_offer IS NOT NULL THEN RAISE EXCEPTION 'Die Wahl ist noch geschlossen.'; END IF;
    RETURN jsonb_build_object('open',false);
  END IF;

  SELECT * INTO blockade FROM kompass_kreativband.blocks WHERE pupil = child.pupil_id AND monday = p_monday;
  IF FOUND THEN
    IF p_offer IS NOT NULL THEN RAISE EXCEPTION 'Für diese Woche ist deine Wahl gesperrt.'; END IF;
    RETURN jsonb_build_object('open',true,'blocked',true,'location',blockade.location);
  END IF;

  IF p_offer IS NOT NULL THEN
    SELECT * INTO offer_row FROM kompass_kreativband.offers WHERE id = p_offer AND monday = p_monday;
    IF NOT FOUND OR offer_row.cancelled OR offer_row.day < kompass_kreativband.today() THEN
      RAISE EXCEPTION 'Dieses Angebot ist nicht mehr buchbar.';
    END IF;
    IF p_cancel THEN
      UPDATE kompass_kreativband.bookings SET status = 'cancelled'
        WHERE offer = p_offer AND pupil = child.pupil_id AND status = 'booked'
          AND NOT EXISTS (SELECT 1 FROM kompass_kreativband.absences WHERE offer = p_offer AND pupil = child.pupil_id)
          AND NOT EXISTS (SELECT 1 FROM public.kompass_creative_visits_v2 v
            WHERE v.pupil_id = child.pupil_id AND v.activity_id = offer_row.activity
              AND v.visit->>'date' = offer_row.day::text AND nullif(v.visit->>'cancelledAt','') IS NULL);
      IF NOT FOUND AND EXISTS (
        SELECT 1 FROM kompass_kreativband.bookings WHERE offer = p_offer AND pupil = child.pupil_id AND status = 'booked'
      ) THEN RAISE EXCEPTION 'Die Anwesenheit wurde bereits erfasst. Die Buchung kann nicht mehr storniert werden.'; END IF;
    ELSIF NOT EXISTS (
      SELECT 1 FROM kompass_kreativband.bookings WHERE offer = p_offer AND pupil = child.pupil_id AND status = 'booked'
    ) THEN
      IF child.grade = 7 AND extract(isodow FROM offer_row.day) IN (1,4) THEN
        RAISE EXCEPTION 'Für Jahrgang 7 läuft die Einteilung an diesem Tag über die Lehrkräfte.';
      END IF;
      IF EXISTS (
        SELECT 1 FROM kompass_kreativband.bookings b
        JOIN kompass_kreativband.offers o ON o.id = b.offer
        WHERE b.pupil = child.pupil_id AND b.status = 'booked' AND NOT o.cancelled AND o.day = offer_row.day
          AND (o.period = offer_row.period OR 56 IN (o.period, offer_row.period))
      ) THEN RAISE EXCEPTION 'Für diese Stunde hast du schon ein Angebot gebucht.'; END IF;
      IF offer_row.sport AND 4 <= (
        SELECT count(*) FROM kompass_kreativband.bookings b
        JOIN kompass_kreativband.offers o ON o.id = b.offer
        WHERE b.pupil = child.pupil_id AND b.status = 'booked' AND NOT o.cancelled AND o.monday = p_monday AND o.sport
      ) THEN RAISE EXCEPTION 'Du hast diese Woche schon vier Sportangebote gebucht.'; END IF;
      IF offer_row.capacity <= (
        SELECT count(*) FROM kompass_kreativband.bookings WHERE offer = p_offer AND status = 'booked'
      ) THEN RAISE EXCEPTION 'Der letzte Platz ist inzwischen vergeben.'; END IF;
      INSERT INTO kompass_kreativband.bookings (offer,pupil,grade) VALUES (p_offer,child.pupil_id,child.grade)
        ON CONFLICT (offer,pupil) DO UPDATE SET status = 'booked', grade = excluded.grade;
    END IF;
  END IF;

  SELECT count(*) INTO sport_count FROM kompass_kreativband.bookings b
    JOIN kompass_kreativband.offers o ON o.id = b.offer
    WHERE b.pupil = child.pupil_id AND b.status = 'booked' AND NOT o.cancelled AND o.monday = p_monday AND o.sport;
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id',o.id,'day',o.day,'title',o.title,'period',o.period,'sport',o.sport,'free',
    CASE WHEN o.cancelled THEN 0 ELSE o.capacity - (
      SELECT count(*) FROM kompass_kreativband.bookings b WHERE b.offer = o.id AND b.status = 'booked'
    ) END,
    'booked',EXISTS(SELECT 1 FROM kompass_kreativband.bookings b WHERE b.offer = o.id AND b.pupil = child.pupil_id AND b.status = 'booked'),
    'cancelled',o.cancelled,
    'selectable',o.day >= kompass_kreativband.today() AND NOT (child.grade = 7 AND extract(isodow FROM o.day) IN (1,4)),
    'occupied',EXISTS(
      SELECT 1 FROM kompass_kreativband.bookings b JOIN kompass_kreativband.offers other ON other.id = b.offer
      WHERE b.pupil = child.pupil_id AND b.status = 'booked' AND NOT other.cancelled
        AND other.id <> o.id AND other.day = o.day AND (other.period = o.period OR 56 IN (other.period,o.period))
    )
  ) ORDER BY o.day,o.period,o.title), '[]') INTO offers FROM kompass_kreativband.offers o
  WHERE o.monday = p_monday AND (NOT o.cancelled OR EXISTS (
    SELECT 1 FROM kompass_kreativband.bookings b WHERE b.offer = o.id AND b.pupil = child.pupil_id AND b.status = 'booked'
  ));
  RETURN jsonb_build_object('open',true,'offers',offers,'sportCount',sport_count,'grade',child.grade);
END
$$;

CREATE FUNCTION kompass_kreativband.plan(p_action text, p_monday date, p_data jsonb DEFAULT '{}')
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  week kompass_kreativband.weeks;
  target kompass_kreativband.offers;
  activity_id text := p_data->>'activity';
  activity_title text;
  slot smallint := (p_data->>'period')::smallint;
  places integer := (p_data->>'capacity')::integer;
BEGIN
  IF NOT kompass_kreativband.planner() THEN RAISE EXCEPTION 'Keine Berechtigung für die Wochenplanung.' USING ERRCODE = '42501'; END IF;
  IF p_monday IS NULL OR extract(isodow FROM p_monday) <> 1 THEN RAISE EXCEPTION 'Bitte einen Montag auswählen.'; END IF;
  IF p_action <> 'read' THEN
    IF p_monday + 4 < kompass_kreativband.today() THEN RAISE EXCEPTION 'Diese Woche ist bereits vorbei.'; END IF;
    INSERT INTO kompass_kreativband.weeks (monday) VALUES (p_monday) ON CONFLICT DO NOTHING;
    SELECT * INTO week FROM kompass_kreativband.weeks WHERE monday = p_monday FOR UPDATE;
  END IF;
  CASE p_action
    WHEN 'read' THEN NULL;
    WHEN 'release' THEN
      UPDATE kompass_kreativband.weeks SET grades = ARRAY(
        SELECT DISTINCT value::smallint FROM jsonb_array_elements_text(p_data->'grades') ORDER BY 1
      ) WHERE monday = p_monday;
    WHEN 'copy' THEN
      IF EXISTS (SELECT 1 FROM kompass_kreativband.offers WHERE monday = p_monday) THEN
        RAISE EXCEPTION 'Für diese Woche gibt es bereits Angebote.';
      END IF;
      INSERT INTO kompass_kreativband.offers (monday,day,activity,title,period,capacity,sport)
        SELECT p_monday,day+7,activity,title,period,capacity,sport FROM kompass_kreativband.offers
        WHERE monday = p_monday-7 AND NOT cancelled AND day+7 >= kompass_kreativband.today();
    WHEN 'add' THEN
      IF activity_id IS NULL OR activity_id !~ '^[a-zA-Z0-9_-]{1,150}$' THEN
        RAISE EXCEPTION 'Bitte ein bestehendes Kreativband-Angebot auswählen.';
      END IF;
      SELECT a->>'name' INTO activity_title FROM public.kompass_shared_state s
        CROSS JOIN LATERAL jsonb_array_elements(coalesce(s.payload->'activities','[]'::jsonb)) a
        WHERE s.id = 'school' AND a->>'id' = activity_id AND a->>'type' = 'Kreativband' LIMIT 1;
      IF activity_title IS NULL THEN
        -- The default offers may have been generated by the legacy client
        -- without a shared write. The planner selects only existing catalog entries.
        activity_title := nullif(btrim(p_data->>'title'), '');
      END IF;
      IF (p_data->>'day')::date < kompass_kreativband.today() THEN RAISE EXCEPTION 'Dieser Termin ist bereits vorbei.'; END IF;
      IF activity_id = 'creative_heimbacher_hof' THEN slot := 56; END IF;
      IF EXISTS (SELECT 1 FROM kompass_kreativband.offers o WHERE o.day = (p_data->>'day')::date
        AND o.activity = activity_id AND NOT o.cancelled AND (o.period = 56 OR slot = 56 OR o.period = slot)) THEN
        RAISE EXCEPTION 'Dieses Angebot gibt es in der gewählten Stunde bereits.';
      END IF;
      INSERT INTO kompass_kreativband.offers (monday,day,activity,title,period,capacity,sport)
        VALUES (p_monday,(p_data->>'day')::date,activity_id,activity_title,
          CASE WHEN activity_id = 'creative_heimbacher_hof' THEN 56 ELSE slot END,
          places, activity_id = 'creative_heimbacher_hof' OR (p_data->>'sport')::boolean);
    WHEN 'capacity', 'cancel' THEN
      SELECT * INTO target FROM kompass_kreativband.offers WHERE id = (p_data->>'id')::uuid AND monday = p_monday;
      IF NOT FOUND OR target.cancelled OR target.day < kompass_kreativband.today() THEN RAISE EXCEPTION 'Dieses Angebot kann nicht mehr geändert werden.'; END IF;
      IF p_action = 'cancel' THEN
        IF EXISTS (SELECT 1 FROM kompass_kreativband.absences WHERE offer = target.id)
          OR EXISTS (SELECT 1 FROM kompass_kreativband.bookings b
            CROSS JOIN LATERAL kompass_kreativband.slot_visits(target.day,target.activity,b.pupil) v
            WHERE b.offer = target.id AND (target.period = 56 OR v.period = target.period)) THEN
          RAISE EXCEPTION 'Für dieses Angebot wurde bereits Anwesenheit erfasst.';
        END IF;
        UPDATE kompass_kreativband.offers SET cancelled = true WHERE id = target.id;
      ELSE
        IF places < (SELECT count(*) FROM kompass_kreativband.bookings WHERE offer = target.id AND status = 'booked') THEN
          RAISE EXCEPTION 'Es sind bereits mehr Plätze gebucht.';
        END IF;
        UPDATE kompass_kreativband.offers SET capacity = places WHERE id = target.id;
      END IF;
    ELSE RAISE EXCEPTION 'Unbekannte Aktion.';
  END CASE;
  RETURN jsonb_build_object(
    'grades',coalesce((SELECT to_jsonb(w.grades) FROM kompass_kreativband.weeks w WHERE w.monday = p_monday),'[]'),
    'offers',coalesce((SELECT jsonb_agg(to_jsonb(o) || jsonb_build_object(
      'booked',(SELECT count(*) FROM kompass_kreativband.bookings b WHERE b.offer = o.id AND b.status = 'booked')
    ) ORDER BY o.day,o.period,o.title) FROM kompass_kreativband.offers o WHERE o.monday = p_monday),'[]')
  );
END
$$;

CREATE FUNCTION kompass_kreativband.issue_code(p_pupil text)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  new_code text := replace(gen_random_uuid()::text,'-','');
BEGIN
  IF NOT (kompass_kreativband.planner() OR kompass_kreativband.coach(p_pupil)) THEN
    RAISE EXCEPTION 'Keine Berechtigung für diesen KOMPASS-Code.' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.kompass_creative_roster WHERE pupil_id = p_pupil AND NOT archived AND grade IN (5,6,7)) THEN
    RAISE EXCEPTION 'Das Kind ist nicht in der aktiven Schülerliste.';
  END IF;
  INSERT INTO kompass_kreativband.codes(pupil,code) VALUES (p_pupil,new_code)
    ON CONFLICT (pupil) DO UPDATE SET code = excluded.code;
  RETURN new_code;
END
$$;

CREATE FUNCTION kompass_kreativband.print_codes(p_grade smallint)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF p_grade IS NULL OR p_grade NOT IN (5,6,7) OR NOT kompass_kreativband.staff()
    OR NOT public.has_kompass_grade_access(p_grade,'leitung') THEN
    RAISE EXCEPTION 'Keine Berechtigung für die Codekarten dieses Jahrgangs.' USING ERRCODE = '42501';
  END IF;

  INSERT INTO kompass_kreativband.codes(pupil,code)
    SELECT pupil_id,replace(gen_random_uuid()::text,'-','') FROM public.kompass_creative_roster
    WHERE grade = p_grade AND NOT archived ORDER BY pupil_id
    ON CONFLICT (pupil) DO NOTHING;

  RETURN coalesce((
    SELECT jsonb_agg(jsonb_build_object('first',r.first_name,'last',r.last_name,'class',r.class_name,'code',c.code)
      ORDER BY r.class_name,lower(r.last_name),lower(r.first_name),r.pupil_id)
    FROM kompass_kreativband.codes c JOIN public.kompass_creative_roster r ON r.pupil_id = c.pupil
    WHERE r.grade = p_grade AND NOT r.archived
  ),'[]');
END
$$;

CREATE FUNCTION kompass_kreativband.coaching(p_pupil text, p_action text, p_monday date DEFAULT NULL, p_data jsonb DEFAULT '{}')
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT kompass_kreativband.coach(p_pupil) THEN RAISE EXCEPTION 'Keine Berechtigung für dieses Coachingkind.' USING ERRCODE = '42501'; END IF;
  CASE p_action
    WHEN 'read' THEN NULL;
    WHEN 'block', 'unblock' THEN
      IF p_monday IS NULL OR extract(isodow FROM p_monday) <> 1 OR p_monday+4 < kompass_kreativband.today() THEN
        RAISE EXCEPTION 'Bitte einen Montag in einer laufenden oder kommenden Woche wählen.';
      END IF;
      INSERT INTO kompass_kreativband.weeks (monday) VALUES (p_monday) ON CONFLICT DO NOTHING;
      PERFORM 1 FROM kompass_kreativband.weeks WHERE monday = p_monday FOR UPDATE;
      IF p_action = 'block' THEN
        INSERT INTO kompass_kreativband.blocks VALUES (p_monday,p_pupil,coalesce(btrim(p_data->>'location'),''))
          ON CONFLICT (monday,pupil) DO UPDATE SET location = excluded.location;
        UPDATE kompass_kreativband.bookings b SET status = 'blocked'
          FROM kompass_kreativband.offers o
          WHERE b.offer = o.id AND b.pupil = p_pupil AND b.status = 'booked' AND o.monday = p_monday
            AND o.day >= kompass_kreativband.today()
            AND NOT EXISTS (SELECT 1 FROM kompass_kreativband.absences a WHERE a.offer = b.offer AND a.pupil = b.pupil)
            AND NOT EXISTS (SELECT 1 FROM public.kompass_creative_visits_v2 v WHERE v.pupil_id = b.pupil
              AND v.activity_id = o.activity AND v.visit->>'date' = o.day::text AND nullif(v.visit->>'cancelledAt','') IS NULL);
      ELSE
        DELETE FROM kompass_kreativband.blocks WHERE monday = p_monday AND pupil = p_pupil;
      END IF;
    WHEN 'note' THEN
      UPDATE kompass_kreativband.absences SET note = coalesce(btrim(p_data->>'note'),'')
        WHERE pupil = p_pupil AND offer = (p_data->>'offer')::uuid AND period = (p_data->>'period')::smallint;
      IF NOT FOUND THEN RAISE EXCEPTION 'Die Rückmeldung ist nicht mehr vorhanden.'; END IF;
    ELSE RAISE EXCEPTION 'Unbekannte Aktion.';
  END CASE;
  RETURN jsonb_build_object(
    'blocks',coalesce((SELECT jsonb_agg(jsonb_build_object('monday',monday,'location',location) ORDER BY monday DESC)
      FROM kompass_kreativband.blocks WHERE pupil = p_pupil AND monday+4 >= kompass_kreativband.today()),'[]'),
    'absences',coalesce((SELECT jsonb_agg(jsonb_build_object('offer',o.id,'title',o.title,'day',o.day,
      'period',a.period,'status',a.status,'note',a.note) ORDER BY o.day DESC,a.period DESC)
      FROM kompass_kreativband.absences a JOIN kompass_kreativband.offers o ON o.id = a.offer
      WHERE a.pupil = p_pupil AND NOT o.cancelled
        AND NOT EXISTS (SELECT 1 FROM kompass_kreativband.slot_visits(o.day,o.activity,a.pupil) v WHERE v.period = a.period)),'[]')
  );
END
$$;

-- Legacy visits without a period occupy the remaining booked periods in order.
-- The record is adopted on confirmation, so a manual +1 never needs re-entry.
CREATE FUNCTION kompass_kreativband.slot_visits(p_day date, p_activity text, p_pupil text)
RETURNS TABLE (period smallint, visit_key text, grade smallint)
LANGUAGE sql STABLE SET search_path = '' AS $$
  WITH slots AS (
    SELECT s.period::smallint
    FROM kompass_kreativband.bookings b JOIN kompass_kreativband.offers o ON o.id = b.offer
    CROSS JOIN (VALUES (5),(6)) s(period)
    WHERE b.pupil = p_pupil AND b.status = 'booked' AND NOT o.cancelled AND o.day = p_day AND o.activity = p_activity
      AND o.period IN (s.period,56)
  ), visits AS (
    SELECT v.visit_key,v.grade,v.visit
    FROM public.kompass_creative_visits_v2 v
    WHERE v.pupil_id = p_pupil AND v.activity_id = p_activity AND v.visit->>'date' = p_day::text
      AND nullif(v.visit->>'cancelledAt','') IS NULL
  ), explicit AS (
    SELECT DISTINCT ON (s.period) s.period,v.visit_key,v.grade
    FROM slots s JOIN visits v ON v.visit->>'period' = s.period::text
    ORDER BY s.period,v.visit_key
  ), free_slots AS (
    SELECT s.period,row_number() OVER (ORDER BY s.period) AS ord
    FROM slots s WHERE NOT EXISTS (SELECT 1 FROM explicit e WHERE e.period = s.period)
  ), legacy AS (
    SELECT v.visit_key,v.grade,row_number() OVER (ORDER BY v.visit->>'createdAt',v.visit_key) AS ord
    FROM visits v WHERE v.visit->>'period' IS NULL
  )
  SELECT * FROM explicit UNION ALL
  SELECT s.period,l.visit_key,l.grade FROM free_slots s JOIN legacy l USING (ord)
$$;

CREATE FUNCTION kompass_kreativband.attendance(p_day date, p_activity text, p_offer uuid DEFAULT NULL,
  p_pupil text DEFAULT NULL, p_period smallint DEFAULT NULL, p_status text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  target kompass_kreativband.offers;
  booking kompass_kreativband.bookings;
  prior record;
  entry_key text;
  staff_name text;
  visit_data jsonb;
BEGIN
  IF NOT kompass_kreativband.staff() THEN RAISE EXCEPTION 'Keine Berechtigung für die Anwesenheit.' USING ERRCODE = '42501'; END IF;
  IF p_offer IS NOT NULL THEN
    PERFORM 1 FROM kompass_kreativband.weeks w
      JOIN kompass_kreativband.offers o ON o.monday = w.monday WHERE o.id = p_offer FOR UPDATE OF w;
    SELECT * INTO target FROM kompass_kreativband.offers WHERE id = p_offer AND day = p_day AND activity = p_activity AND NOT cancelled;
    IF NOT FOUND OR p_day > kompass_kreativband.today() OR p_period IS NULL OR p_period NOT IN (5,6)
      OR target.period NOT IN (p_period,56) THEN RAISE EXCEPTION 'Dieser Termin kann nicht erfasst werden.'; END IF;
    SELECT * INTO booking FROM kompass_kreativband.bookings WHERE offer = p_offer AND pupil = p_pupil AND status = 'booked';
    IF NOT FOUND THEN RAISE EXCEPTION 'Das Kind hat für diesen Termin keine aktive Buchung.'; END IF;
    SELECT * INTO prior FROM kompass_kreativband.slot_visits(p_day,p_activity,p_pupil) s WHERE s.period = p_period;
    IF p_status = 'present' THEN
      DELETE FROM kompass_kreativband.absences WHERE offer = p_offer AND pupil = p_pupil AND period = p_period;
      IF prior.visit_key IS NOT NULL THEN
        UPDATE public.kompass_creative_visits_v2 SET visit = visit || jsonb_build_object('period',p_period),
          updated_at = clock_timestamp(), updated_by = auth.uid()
        WHERE grade = prior.grade AND visit_key = prior.visit_key AND visit->>'period' IS NULL;
      ELSE
        SELECT display_name INTO staff_name FROM public.kompass_profiles WHERE id = auth.uid();
        entry_key := p_day::text||'|'||p_activity||'|'||p_pupil||'|wahl-'||p_period;
        visit_data := jsonb_build_object('date',p_day,'activityId',p_activity,'pupilId',p_pupil,
          'period',p_period,'createdAt',clock_timestamp(),'recordedBy',staff_name);
        INSERT INTO public.kompass_creative_visits_v2 (grade,visit_key,pupil_id,activity_id,visit,updated_by)
          VALUES (booking.grade,entry_key,p_pupil,p_activity,visit_data,auth.uid())
          ON CONFLICT (grade,visit_key) DO UPDATE SET visit = excluded.visit,updated_at = clock_timestamp(),updated_by = auth.uid();
      END IF;
    ELSIF p_status IN ('missing','excused','clear') THEN
      IF prior.visit_key IS NOT NULL THEN RAISE EXCEPTION 'Bitte zuerst den erfassten Besuch über −1 stornieren.'; END IF;
      IF p_status = 'clear' THEN
        DELETE FROM kompass_kreativband.absences WHERE offer = p_offer AND pupil = p_pupil AND period = p_period;
      ELSE
        INSERT INTO kompass_kreativband.absences (offer,pupil,period,status) VALUES (p_offer,p_pupil,p_period,p_status)
          ON CONFLICT (offer,pupil,period) DO UPDATE SET status = excluded.status;
      END IF;
    ELSE
      RAISE EXCEPTION 'Unbekannter Anwesenheitsstatus.';
    END IF;
  END IF;

  RETURN coalesce((
    SELECT jsonb_agg(jsonb_build_object('offer',o.id,'pupil',b.pupil,'grade',b.grade,'period',s.period,
      'name',concat_ws(' ',r.first_name,r.last_name),
      'status',CASE WHEN v.visit_key IS NOT NULL THEN 'present' ELSE coalesce(a.status,'') END)
      ORDER BY s.period,r.last_name,r.first_name)
    FROM kompass_kreativband.offers o JOIN kompass_kreativband.bookings b ON b.offer = o.id
    JOIN public.kompass_creative_roster r ON r.pupil_id = b.pupil
    CROSS JOIN (VALUES (5),(6)) s(period)
    LEFT JOIN kompass_kreativband.absences a ON a.offer = o.id AND a.pupil = b.pupil AND a.period = s.period
    LEFT JOIN LATERAL kompass_kreativband.slot_visits(p_day,p_activity,b.pupil) v ON v.period = s.period
    WHERE o.day = p_day AND o.activity = p_activity AND NOT o.cancelled AND b.status = 'booked' AND o.period IN (s.period,56)
  ),'[]');
END
$$;

-- API-layer wrappers have invoker privileges. Only the named entry points
-- below receive execute grants, and all staff actions check auth.uid().
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA kompass_kreativband FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA kompass_kreativband TO anon, authenticated;
GRANT EXECUTE ON FUNCTION kompass_kreativband.student(text,date,uuid,boolean) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION kompass_kreativband.plan(text,date,jsonb),
  kompass_kreativband.issue_code(text), kompass_kreativband.print_codes(smallint), kompass_kreativband.coaching(text,text,date,jsonb),
  kompass_kreativband.attendance(date,text,uuid,text,smallint,text) TO authenticated;

CREATE FUNCTION public.kompass_kb_student(p_code text,p_monday date,p_offer uuid DEFAULT NULL,p_cancel boolean DEFAULT false)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$
  SELECT kompass_kreativband.student(p_code,p_monday,p_offer,p_cancel)
$$;
CREATE FUNCTION public.kompass_kb_plan(p_action text,p_monday date,p_data jsonb DEFAULT '{}')
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$
  SELECT kompass_kreativband.plan(p_action,p_monday,p_data)
$$;
CREATE FUNCTION public.kompass_kb_issue_code(p_pupil text)
RETURNS text LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$
  SELECT kompass_kreativband.issue_code(p_pupil)
$$;
CREATE FUNCTION public.kompass_kb_print_codes(p_grade smallint)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$
  SELECT kompass_kreativband.print_codes(p_grade)
$$;
CREATE FUNCTION public.kompass_kb_coaching(p_pupil text,p_action text,p_monday date DEFAULT NULL,p_data jsonb DEFAULT '{}')
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$
  SELECT kompass_kreativband.coaching(p_pupil,p_action,p_monday,p_data)
$$;
CREATE FUNCTION public.kompass_kb_attendance(p_day date,p_activity text,p_offer uuid DEFAULT NULL,
  p_pupil text DEFAULT NULL,p_period smallint DEFAULT NULL,p_status text DEFAULT NULL)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$
  SELECT kompass_kreativband.attendance(p_day,p_activity,p_offer,p_pupil,p_period,p_status)
$$;

REVOKE ALL ON FUNCTION public.kompass_kb_student(text,date,uuid,boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.kompass_kb_plan(text,date,jsonb),public.kompass_kb_issue_code(text),public.kompass_kb_print_codes(smallint),
  public.kompass_kb_coaching(text,text,date,jsonb),public.kompass_kb_attendance(date,text,uuid,text,smallint,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.kompass_kb_student(text,date,uuid,boolean) TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.kompass_kb_plan(text,date,jsonb),public.kompass_kb_issue_code(text),public.kompass_kb_print_codes(smallint),
  public.kompass_kb_coaching(text,text,date,jsonb),public.kompass_kb_attendance(date,text,uuid,text,smallint,text) TO authenticated;
NOTIFY pgrst,'reload schema';

COMMIT;
