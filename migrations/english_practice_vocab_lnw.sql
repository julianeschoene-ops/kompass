-- Differentiated vocabulary evidence: server-issued, rotating samples <=20 targets.
BEGIN;
ALTER TABLE public.kompass_english_tasks ADD COLUMN vocabulary_bank jsonb;
ALTER TABLE public.kompass_english_results ADD COLUMN assessment_level text CHECK(assessment_level IN ('G','M','E')), ADD COLUMN assessment_detail jsonb;
CREATE TABLE public.kompass_english_vocab_attempts(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), grade smallint NOT NULL,pupil_id text NOT NULL,
 task_key text NOT NULL REFERENCES public.kompass_english_tasks(task_key), level text NOT NULL CHECK(level IN ('G','M','E')),
 items jsonb NOT NULL,max_points integer NOT NULL CHECK(max_points BETWEEN 1 AND 100),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),test_date date NOT NULL,
 FOREIGN KEY(grade,pupil_id) REFERENCES public.kompass_english_links(grade,pupil_id)
);
ALTER TABLE public.kompass_english_vocab_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.kompass_english_vocab_attempts FROM PUBLIC,anon,authenticated;
CREATE INDEX english_vocab_attempt_history ON public.kompass_english_vocab_attempts(grade,pupil_id,task_key,created_at DESC);
UPDATE public.kompass_english_tasks SET vocabulary_bank='{"words": [{"id": "16-0", "en": "shop", "de": "der Laden; das Geschäft", "meanings": "der Laden; das Geschäft"}, {"id": "16-1", "en": "snack bar", "de": "das Café; die Imbissstube", "meanings": "das Café; die Imbissstube"}, {"id": "16-2", "en": "youth club", "de": "der Jugendtreff", "meanings": "der Jugendtreff"}, {"id": "16-3", "en": "swimming pool", "de": "das Schwimmbad", "meanings": "das Schwimmbad"}, {"id": "16-4", "en": "pitch", "de": "das Spielfeld; der Platz", "meanings": "das Spielfeld; der Platz"}, {"id": "16-5", "en": "supermarket", "de": "der Supermarkt", "meanings": "der Supermarkt"}, {"id": "16-6", "en": "to buy", "de": "kaufen", "meanings": "kaufen"}, {"id": "16-7", "en": "different", "de": "unterschiedlich; anders; verschieden", "meanings": "unterschiedlich; anders; verschieden"}, {"id": "16-8", "en": "product", "de": "das Produkt", "meanings": "das Produkt"}, {"id": "16-9", "en": "to borrow", "de": "ausleihen", "meanings": "ausleihen"}, {"id": "16-10", "en": "clothes", "de": "die Kleider; die Kleidung", "meanings": "die Kleider; die Kleidung"}, {"id": "16-11", "en": "to hang out (with)", "de": "rumhängen (mit); sich treffen (mit); sich herumtreiben (mit)", "meanings": "rumhängen (mit); sich treffen (mit); sich herumtreiben (mit)"}, {"id": "16-12", "en": "sandwich", "de": "das Sandwich; das Butterbrot; das belegte Brot", "meanings": "das Sandwich; das Butterbrot; das belegte Brot"}, {"id": "16-13", "en": "baker’s", "de": "die Bäckerei", "meanings": "die Bäckerei"}, {"id": "16-14", "en": "theatre", "de": "das Theater", "meanings": "das Theater"}, {"id": "16-15", "en": "restaurant", "de": "das Restaurant", "meanings": "das Restaurant"}, {"id": "16-16", "en": "skate park", "de": "der Skatepark", "meanings": "der Skatepark"}, {"id": "16-17", "en": "early", "de": "früh", "meanings": "früh"}, {"id": "16-18", "en": "What about …?", "de": "Was ist mit …?", "meanings": "Was ist mit …?"}, {"id": "16-19", "en": "false", "de": "falsch", "meanings": "falsch"}, {"id": "16-20", "en": "minute", "de": "die Minute", "meanings": "die Minute"}, {"id": "16-21", "en": "to come", "de": "kommen", "meanings": "kommen"}, {"id": "16-22", "en": "now", "de": "jetzt; nun", "meanings": "jetzt; nun"}], "sentences": [{"word_id": "16-0", "word": "shop", "prompt": "Der Laden ist gegenüber dem Park.", "accepted": ["The shop is opposite the park.", "The store is opposite the park."]}, {"word_id": "16-1", "word": "snack bar", "prompt": "Wir treffen uns um vier an der Imbissstube.", "accepted": ["We meet at the snack bar at four.", "We meet at the snack bar at four o clock."]}, {"word_id": "16-2", "word": "youth club", "prompt": "Ich gehe am Freitag zum Jugendtreff.", "accepted": ["I go to the youth club on Friday.", "On Friday I go to the youth club."]}, {"word_id": "16-3", "word": "swimming pool", "prompt": "Das Schwimmbad ist neben dem Park.", "accepted": ["The swimming pool is next to the park.", "The pool is next to the park."]}, {"word_id": "16-5", "word": "supermarket", "prompt": "Der Supermarkt ist in der Nähe der Kirche.", "accepted": ["The supermarket is near the church.", "The supermarket is close to the church."]}, {"word_id": "16-6", "word": "to buy", "prompt": "Ich kaufe ein Sandwich im Supermarkt.", "accepted": ["I buy a sandwich at the supermarket.", "I buy a sandwich in the supermarket."]}, {"word_id": "16-9", "word": "to borrow", "prompt": "Kann ich dein Buch ausleihen?", "accepted": ["Can I borrow your book?", "May I borrow your book?"]}, {"word_id": "16-10", "word": "clothes", "prompt": "Ich kaufe meine Kleidung im Einkaufszentrum.", "accepted": ["I buy my clothes at the shopping centre.", "I buy my clothes in the shopping centre."]}, {"word_id": "16-12", "word": "sandwich", "prompt": "Ich esse ein Sandwich im Park.", "accepted": ["I eat a sandwich in the park.", "I am eating a sandwich in the park."]}, {"word_id": "16-14", "word": "theatre", "prompt": "Das Theater ist gegenüber dem Restaurant.", "accepted": ["The theatre is opposite the restaurant."]}, {"word_id": "16-15", "word": "restaurant", "prompt": "Wir treffen uns am Restaurant um sechs.", "accepted": ["We meet at the restaurant at six.", "We meet at the restaurant at six o clock."]}, {"word_id": "16-16", "word": "skate park", "prompt": "Der Skatepark ist neben dem Jugendtreff.", "accepted": ["The skate park is next to the youth club.", "The skatepark is next to the youth club."]}, {"word_id": "16-17", "word": "early", "prompt": "Der Bus kommt früh.", "accepted": ["The bus comes early.", "The bus arrives early."]}, {"word_id": "16-21", "word": "to come", "prompt": "Kannst du am Freitag zum Jugendtreff kommen?", "accepted": ["Can you come to the youth club on Friday?", "Can you come to the youth club on Fridays?"]}]}'::jsonb, expected_questions=20,assessment_config=assessment_config||'{"kind":"vocabulary","sample_size":20,"differentiated":true}'::jsonb WHERE task_key='vocab:lwl-u4-test-1';
UPDATE public.kompass_english_tasks SET vocabulary_bank='{"words": [{"id": "17-0", "en": "way", "de": "der Weg; die Richtung", "meanings": "der Weg; die Richtung"}, {"id": "17-1", "en": "tourist", "de": "der Tourist; die Touristin", "meanings": "der Tourist; die Touristin"}, {"id": "17-2", "en": "Germany", "de": "Deutschland", "meanings": "Deutschland"}, {"id": "17-3", "en": "to tell", "de": "sagen; erzählen", "meanings": "sagen; erzählen"}, {"id": "17-4", "en": "straight on", "de": "geradeaus", "meanings": "geradeaus"}, {"id": "17-5", "en": "until", "de": "bis", "meanings": "bis"}, {"id": "17-6", "en": "pond", "de": "der Teich; der Tümpel", "meanings": "der Teich; der Tümpel"}, {"id": "17-7", "en": "to turn", "de": "abbiegen", "meanings": "abbiegen"}, {"id": "17-8", "en": "left", "de": "links", "meanings": "links"}, {"id": "17-9", "en": "into", "de": "in; hinein", "meanings": "in; hinein"}, {"id": "17-10", "en": "right", "de": "rechts", "meanings": "rechts; richtig; korrekt"}, {"id": "17-11", "en": "right", "de": "richtig; korrekt", "meanings": "rechts; richtig; korrekt"}, {"id": "17-12", "en": "car park", "de": "der Parkplatz", "meanings": "der Parkplatz"}, {"id": "17-13", "en": "through", "de": "durch", "meanings": "durch"}, {"id": "17-14", "en": "first", "de": "erste/erster/erstes", "meanings": "erste/erster/erstes"}, {"id": "17-15", "en": "crossing", "de": "die Kreuzung", "meanings": "die Kreuzung"}, {"id": "17-16", "en": "restaurant", "de": "das Restaurant", "meanings": "das Restaurant"}, {"id": "17-17", "en": "on the right", "de": "auf der rechten Seite; rechts", "meanings": "auf der rechten Seite; rechts"}, {"id": "17-18", "en": "to take", "de": "dauern", "meanings": "dauern"}, {"id": "17-19", "en": "You’re welcome.", "de": "Gern geschehen.", "meanings": "Gern geschehen."}, {"id": "17-20", "en": "to cross", "de": "überqueren", "meanings": "überqueren"}, {"id": "17-21", "en": "road", "de": "die Straße", "meanings": "die Straße"}, {"id": "17-22", "en": "corner", "de": "die Ecke", "meanings": "die Ecke"}, {"id": "17-23", "en": "opposite", "de": "gegenüber", "meanings": "gegenüber"}, {"id": "17-24", "en": "traffic light", "de": "die Ampel", "meanings": "die Ampel"}, {"id": "17-25", "en": "round", "de": "um … herum", "meanings": "um … herum"}, {"id": "17-26", "en": "roundabout", "de": "der Kreisverkehr", "meanings": "der Kreisverkehr"}, {"id": "17-27", "en": "second", "de": "zweite/zweiter/zweites", "meanings": "zweite/zweiter/zweites"}, {"id": "17-28", "en": "on the left", "de": "auf der linken Seite; links", "meanings": "auf der linken Seite; links"}, {"id": "17-29", "en": "over", "de": "über", "meanings": "über"}, {"id": "17-30", "en": "bridge", "de": "die Brücke", "meanings": "die Brücke"}, {"id": "17-31", "en": "along", "de": "entlang", "meanings": "entlang"}, {"id": "17-32", "en": "car", "de": "das Auto", "meanings": "das Auto"}, {"id": "17-33", "en": "tram", "de": "die Straßenbahn", "meanings": "die Straßenbahn"}, {"id": "17-34", "en": "bus", "de": "der Bus", "meanings": "der Bus"}, {"id": "17-35", "en": "underground train", "de": "die U-Bahn", "meanings": "die U-Bahn"}, {"id": "17-36", "en": "scooter", "de": "der Roller", "meanings": "der Roller"}, {"id": "17-37", "en": "on foot", "de": "zu Fuß", "meanings": "zu Fuß"}, {"id": "17-38", "en": "foot, feet", "de": "der Fuß; die Füße", "meanings": "der Fuß; die Füße"}, {"id": "17-39", "en": "ferry", "de": "die Fähre", "meanings": "die Fähre"}, {"id": "17-40", "en": "motorbike", "de": "das Motorrad", "meanings": "das Motorrad"}, {"id": "17-41", "en": "helicopter", "de": "der Helikopter; der Hubschrauber", "meanings": "der Helikopter; der Hubschrauber"}, {"id": "17-42", "en": "taxi", "de": "das Taxi", "meanings": "das Taxi"}, {"id": "17-43", "en": "plane", "de": "das Flugzeug", "meanings": "das Flugzeug"}, {"id": "17-44", "en": "boat", "de": "das Boot", "meanings": "das Boot"}, {"id": "17-45", "en": "air", "de": "die Luft", "meanings": "die Luft"}, {"id": "17-46", "en": "ground", "de": "der Boden; der Erdboden", "meanings": "der Boden; der Erdboden"}, {"id": "17-47", "en": "long", "de": "lang; lange", "meanings": "lang; lange"}, {"id": "17-48", "en": "bus stop", "de": "die Bushaltestelle", "meanings": "die Bushaltestelle"}, {"id": "17-49", "en": "by (bike)", "de": "mit (dem Fahrrad)", "meanings": "mit (dem Fahrrad)"}], "sentences": [{"word_id": "17-4", "word": "straight on", "prompt": "Geh geradeaus bis zur Kirche.", "accepted": ["Go straight on until you get to the church.", "Go straight on until the church.", "Go straight to the church.", "Walk straight on to the church.", "Go straight on to the church."]}, {"word_id": "17-8", "word": "left", "prompt": "Biege an der Ampel links ab.", "accepted": ["Turn left at the traffic lights.", "Turn left at the traffic light."]}, {"word_id": "17-10", "word": "right", "prompt": "Biege an der Kirche rechts ab.", "accepted": ["Turn right at the church."]}, {"word_id": "17-23", "word": "opposite", "prompt": "Das Museum ist gegenüber dem Park.", "accepted": ["The museum is opposite the park."]}, {"word_id": "17-30", "word": "bridge", "prompt": "Überquere die Brücke und biege links ab.", "accepted": ["Cross the bridge and turn left.", "Go over the bridge and turn left.", "Walk over the bridge and turn left."]}, {"word_id": "17-48", "word": "bus stop", "prompt": "Die Bushaltestelle ist neben dem Supermarkt.", "accepted": ["The bus stop is next to the supermarket.", "There is a bus stop next to the supermarket."]}, {"word_id": "17-37", "word": "on foot", "prompt": "Ich gehe zu Fuß zum Museum.", "accepted": ["I go to the museum on foot.", "I walk to the museum."]}, {"word_id": "17-49", "word": "by (bike)", "prompt": "Ich fahre mit dem Fahrrad zur Schule.", "accepted": ["I go to school by bike.", "I cycle to school.", "I ride my bike to school.", "I go to school by bicycle."]}, {"word_id": "17-17", "word": "on the right", "prompt": "Das Restaurant ist auf der rechten Seite.", "accepted": ["The restaurant is on the right.", "The restaurant is on the right hand side."]}, {"word_id": "17-28", "word": "on the left", "prompt": "Der Park ist auf der linken Seite.", "accepted": ["The park is on the left.", "The park is on the left hand side."]}, {"word_id": "17-31", "word": "along", "prompt": "Geh die Straße entlang.", "accepted": ["Go along the street.", "Walk along the street.", "Go along the road.", "Walk along the road."]}, {"word_id": "17-13", "word": "through", "prompt": "Geh durch den Park.", "accepted": ["Go through the park.", "Walk through the park."]}, {"word_id": "17-20", "word": "to cross", "prompt": "Überquere die Straße an der Ampel.", "accepted": ["Cross the road at the traffic lights.", "Cross the street at the traffic lights.", "Cross the road at the traffic light.", "Cross the street at the traffic light."]}, {"word_id": "17-34", "word": "bus", "prompt": "Wir fahren mit dem Bus ins Stadtzentrum.", "accepted": ["We go to the town centre by bus.", "We go to the city centre by bus.", "We take the bus to the town centre.", "We take the bus to the city centre."]}]}'::jsonb, expected_questions=20,assessment_config=assessment_config||'{"kind":"vocabulary","sample_size":20,"differentiated":true}'::jsonb WHERE task_key='vocab:lwl-u4-test-2';
CREATE OR REPLACE FUNCTION public.kompass_english_normalize(p_text text)
RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path=public,pg_temp AS $$
DECLARE s text:=lower(trim(coalesce(p_text,'')));r record;
BEGIN
 s:=translate(s,'’‘`',repeat(chr(39),3));
 FOR r IN SELECT * FROM jsonb_each_text($j${"i'm":"i am","you're":"you are","we're":"we are","they're":"they are","he's":"he is","she's":"she is","it's":"it is","that's":"that is","there's":"there is","don't":"do not","doesn't":"does not","isn't":"is not","aren't":"are not","wasn't":"was not","weren't":"were not","can't":"can not","cannot":"can not","won't":"will not","centre":"center","theatre":"theater","colour":"color","favourite":"favorite"}$j$::jsonb) LOOP
  s:=regexp_replace(s,'\m'||r.key||'\M',r.value,'g');
 END LOOP;
 s:=replace(replace(replace(replace(s,'ä','ae'),'ö','oe'),'ü','ue'),'ß','ss');
 s:=translate(s,'éèêáàâíìîóòôúùû','eeeaaaiiiooouuu');
 s:=regexp_replace(s,'[.!?,:;“”"„]','','g');s:=regexp_replace(s,'[–—-]',' ','g');
 RETURN trim(regexp_replace(s,'\s+',' ','g'));
END $$;
CREATE OR REPLACE FUNCTION public.kompass_english_word_key(p_text text)
RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path=public,pg_temp AS $$
DECLARE s text:=replace(public.kompass_english_normalize(p_text),'''','');aliases jsonb:='{"store":"shop","bicycle":"bike","airplane":"plane","aeroplane":"plane","parking lot":"car park","subway":"underground train","underground":"underground train","clothing":"clothes","motorcycle":"motorbike","cab":"taxi","traffic lights":"traffic light","skatepark":"skate park"}';
BEGIN
 IF s!~'^(a lot|a little|a few|a bit|a pair|a kind)\M' THEN s:=regexp_replace(s,'^(the|a|an|der|die|das|den|dem|ein|eine|einen|einem|einer)\s+',''); END IF;
 s:=regexp_replace(s,'^to\s+','');RETURN coalesce(aliases->>s,s);
END $$;
CREATE OR REPLACE FUNCTION public.kompass_english_answer_forms(p_accepted jsonb,p_word boolean)
RETURNS SETOF text LANGUAGE plpgsql IMMUTABLE SET search_path=public,pg_temp AS $$
DECLARE v text;part text;full_form text;short_form text;
BEGIN
 FOR v IN SELECT jsonb_array_elements_text(p_accepted) LOOP
  FOR part IN SELECT regexp_split_to_table(v,'[;/]') LOOP
   full_form:=replace(replace(part,'(',''),')','');short_form:=regexp_replace(part,'\([^)]*\)','','g');
   IF p_word THEN full_form:=public.kompass_english_word_key(full_form);short_form:=public.kompass_english_word_key(short_form);
   ELSE full_form:=public.kompass_english_normalize(full_form);short_form:=public.kompass_english_normalize(short_form); END IF;
   IF full_form<>'' THEN RETURN NEXT full_form;END IF;
   IF short_form<>'' AND short_form<>full_form AND short_form NOT IN ('by','to','with','mit','von','zu','bei','a','an','the') THEN RETURN NEXT short_form; END IF;
  END LOOP;
 END LOOP;
END $$;
CREATE OR REPLACE FUNCTION public.kompass_english_one_edit(a text,b text)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE SET search_path=public,pg_temp AS $$
DECLARE x integer:=1;y integer:=1;edits integer:=0;diff integer[]:='{}';n integer;temp text;
BEGIN
 IF a=b OR abs(length(a)-length(b))>1 THEN RETURN false; END IF;
 IF length(a)=length(b) THEN
  FOR n IN 1..length(a) LOOP IF substr(a,n,1)<>substr(b,n,1) THEN diff:=array_append(diff,n);END IF;END LOOP;
  RETURN cardinality(diff)=1 OR (cardinality(diff)=2 AND diff[2]=diff[1]+1 AND substr(a,diff[1],1)=substr(b,diff[2],1) AND substr(a,diff[2],1)=substr(b,diff[1],1));
 END IF;
 IF length(a)>length(b) THEN temp:=a;a:=b;b:=temp;END IF;
 WHILE x<=length(a) AND y<=length(b) LOOP
  IF substr(a,x,1)=substr(b,y,1) THEN x:=x+1;y:=y+1;ELSE edits:=edits+1;y:=y+1;IF edits>1 THEN RETURN false;END IF;END IF;
 END LOOP;
 RETURN true;
END $$;
CREATE OR REPLACE FUNCTION public.kompass_english_minor_typo(a text,b text,p_sentence boolean)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE aa text[]:=string_to_array(a,' ');bb text[]:=string_to_array(b,' ');n integer;diff integer:=0;x text;y text;
 protected text[]:=ARRAY['left','right','early','late','first','second','under','over','there','their','where','were','then','than','quiet','quite','from','form','never','always','often','close','closed','house','horse','mouth','mouse'];
BEGIN
 IF a='' OR b='' OR cardinality(aa)<>cardinality(bb) THEN RETURN false;END IF;
 FOR n IN 1..cardinality(aa) LOOP
  x:=aa[n];y:=bb[n];IF x=y THEN CONTINUE;END IF;
  IF length(y)<5 OR length(x)<4 OR x=ANY(protected) OR y=ANY(protected)
    OR NOT public.kompass_english_one_edit(x,y) THEN RETURN false; END IF;
  IF EXISTS(SELECT 1 FROM public.kompass_english_tasks t CROSS JOIN LATERAL jsonb_array_elements(t.vocabulary_bank->'words') w
   WHERE t.vocabulary_bank IS NOT NULL AND (public.kompass_english_word_key(w->>'en')=x OR public.kompass_english_word_key(w->>'de')=x)) THEN RETURN false;END IF;
  IF p_sentence AND (y IN ('not','no','is','are','was','were','has','have','do','does','did','can','will','to','at','on','in','by')
   OR regexp_replace(x,'(s|ed|ing)$','')=regexp_replace(y,'(s|ed|ing)$','')) THEN RETURN false;END IF;
  diff:=diff+1;IF diff>1 THEN RETURN false;END IF;
 END LOOP;
 RETURN diff=1;
END $$;
CREATE OR REPLACE FUNCTION public.kompass_english_mark_answer(p_given text,p_accepted jsonb,p_kind text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE a text;form text;is_word boolean:=p_kind<>'sentence';max_p integer:=CASE WHEN p_kind='sentence' THEN 4 ELSE 2 END;
BEGIN
 IF trim(coalesce(p_given,''))='' THEN RETURN jsonb_build_object('kind','incorrect','points',0);END IF;
 a:=CASE WHEN is_word THEN public.kompass_english_word_key(p_given) ELSE public.kompass_english_normalize(p_given) END;
 FOR form IN SELECT public.kompass_english_answer_forms(p_accepted,is_word) LOOP
  IF a=form THEN RETURN jsonb_build_object('kind','correct','points',max_p);END IF;
 END LOOP;
 FOR form IN SELECT public.kompass_english_answer_forms(p_accepted,is_word) LOOP
  IF public.kompass_english_minor_typo(a,form,NOT is_word) THEN RETURN jsonb_build_object('kind','spelling','points',max_p-1);END IF;
 END LOOP;
 RETURN jsonb_build_object('kind',CASE WHEN is_word THEN 'incorrect' ELSE 'review' END,'points',0);
END $$;
REVOKE ALL ON FUNCTION public.kompass_english_normalize(text),public.kompass_english_word_key(text),public.kompass_english_answer_forms(jsonb,boolean),public.kompass_english_one_edit(text,text),public.kompass_english_minor_typo(text,text,boolean),public.kompass_english_mark_answer(text,jsonb,text) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.kompass_english_start_vocab(p_token text,p_pin text,p_task_key text,p_level text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE gate jsonb;l public.kompass_english_links;t public.kompass_english_tasks;prev jsonb; selected jsonb; sentence_items jsonb:='[]';word_items jsonb;all_items jsonb;attempt public.kompass_english_vocab_attempts; n integer:=0;item jsonb;max_p integer:=0;
BEGIN
 gate:=public.kompass_english_access_window(p_token,p_pin);
 IF coalesce((gate->>'open')::boolean,false) IS NOT true THEN RETURN gate||jsonb_build_object('ok',false); END IF;
 IF p_level IS NULL OR p_level NOT IN ('G','M','E') THEN RAISE EXCEPTION 'Bitte das mit der Lehrkraft vereinbarte Niveau wählen.'; END IF;
 SELECT * INTO STRICT l FROM public.kompass_english_links WHERE active AND token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex') FOR UPDATE;
 SELECT * INTO t FROM public.kompass_english_tasks WHERE task_key=p_task_key AND is_assessment AND vocabulary_bank IS NOT NULL;
 IF NOT FOUND THEN RAISE EXCEPTION 'Dieser Vokabeltest ist nicht freigegeben.'; END IF;
 IF (SELECT count(*) FROM public.kompass_english_vocab_attempts WHERE grade=l.grade AND pupil_id=l.pupil_id AND created_at>clock_timestamp()-interval '1 day')>=100 THEN RAISE EXCEPTION 'Zu viele Teststarts. Bitte die Lehrkraft fragen.'; END IF;
 SELECT items INTO prev FROM public.kompass_english_vocab_attempts WHERE grade=l.grade AND pupil_id=l.pupil_id AND task_key=p_task_key ORDER BY created_at DESC LIMIT 1;
 prev:=coalesce(prev,'[]'::jsonb);
 IF p_level='E' THEN
  SELECT jsonb_agg(x) INTO sentence_items FROM (SELECT s AS x FROM jsonb_array_elements(t.vocabulary_bank->'sentences') s
   ORDER BY EXISTS(SELECT 1 FROM jsonb_array_elements(prev) p WHERE p->>'word_id'=s->>'word_id' AND p->>'kind'='sentence'),random() LIMIT 5) q;
  IF jsonb_array_length(sentence_items)<>5 THEN RAISE EXCEPTION 'Satzaufgaben fehlen.'; END IF;
 END IF;
 SELECT jsonb_agg(x) INTO selected FROM (SELECT w AS x FROM jsonb_array_elements(t.vocabulary_bank->'words') w
  WHERE NOT EXISTS(SELECT 1 FROM jsonb_array_elements(sentence_items) si WHERE si->>'word_id'=w->>'id')
  ORDER BY EXISTS(SELECT 1 FROM jsonb_array_elements(prev) p WHERE p->>'word_id'=w->>'id'),random() LIMIT CASE WHEN p_level='E' THEN 15 ELSE 20 END) q;
 word_items:='[]';
 FOR item IN SELECT value FROM jsonb_array_elements(selected) LOOP
  n:=n+1;
  word_items:=word_items||jsonb_build_array(jsonb_build_object('word_id',item->>'id','word',item->>'en','kind',CASE WHEN p_level='G' AND n<=10 THEN 'en-de' ELSE 'de-en' END,
   'prompt',CASE WHEN p_level='G' AND n<=10 THEN item->>'en' ELSE split_part(item->>'de',';',1) END,
   'accepted',jsonb_build_array(CASE WHEN p_level='G' AND n<=10 THEN item->>'meanings' ELSE item->>'en' END),'max_points',2));
 END LOOP;
 all_items:=word_items;
 FOR item IN SELECT value FROM jsonb_array_elements(sentence_items) LOOP
  all_items:=all_items||jsonb_build_array(item||jsonb_build_object('kind','sentence','max_points',4));
 END LOOP;
 IF jsonb_array_length(all_items)>20 OR jsonb_array_length(all_items)=0 THEN RAISE EXCEPTION 'Ungültige Testauswahl.'; END IF;
 SELECT sum((x->>'max_points')::integer) INTO max_p FROM jsonb_array_elements(all_items) x;
 INSERT INTO public.kompass_english_vocab_attempts(grade,pupil_id,task_key,level,items,max_points,test_date)
 VALUES(l.grade,l.pupil_id,p_task_key,p_level,all_items,max_p,(gate->>'test_date')::date) RETURNING * INTO attempt;
 RETURN jsonb_build_object('ok',true,'id',attempt.id,'level',p_level,'items',(SELECT jsonb_agg(q-'accepted'-'word') FROM jsonb_array_elements(all_items) q),'max_points',max_p,'test_date',attempt.test_date);
END $$;
REVOKE ALL ON FUNCTION public.kompass_english_start_vocab(text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kompass_english_start_vocab(text,text,text,text) TO anon,authenticated;
CREATE OR REPLACE FUNCTION public.kompass_english_submit_vocab(p_token text,p_pin text,p_attempt_id uuid,p_answers jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE gate jsonb;l public.kompass_english_links;a public.kompass_english_vocab_attempts;old public.kompass_english_results; total integer:=0;review boolean:=false;answer jsonb;item jsonb;detail jsonb;title text;idx integer:=0;mark jsonb;graded jsonb:='[]';submitted jsonb:='[]';feedback jsonb:='[]';
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
  feedback:=feedback||jsonb_build_array(mark||jsonb_build_object('prompt',item->>'prompt','given',coalesce(answer->>'given',''),'max_points',item->'max_points','example',item#>>'{accepted,0}'));
  total:=total+(mark->>'points')::integer;review:=review OR mark->>'kind'='review';
 END LOOP;
 detail:=jsonb_build_object('needs_review',review,'answers',graded,'submitted',submitted,'items',a.items,'feedback',feedback,'level',a.level);
 SELECT * INTO old FROM public.kompass_english_results WHERE grade=l.grade AND pupil_id=l.pupil_id AND attempt_id=p_attempt_id;
 IF FOUND THEN
  IF old.assessment_detail IS DISTINCT FROM detail THEN RAISE EXCEPTION 'Dieser Versuch wurde bereits mit anderen Antworten gespeichert.'; END IF;
  RETURN jsonb_build_object('saved',true,'needs_review',review,'points',total,'max_points',a.max_points,'feedback',feedback);
 END IF;
 IF NOT (gate->>'open')::boolean OR a.test_date IS DISTINCT FROM (gate->>'test_date')::date THEN RETURN gate||jsonb_build_object('ok',false,'window_closed',true,'message','Die Abgabezeit ist beendet oder der Versuch stammt von einem anderen Tag.'); END IF;
 SELECT t.title INTO title FROM public.kompass_english_tasks t WHERE task_key=a.task_key AND is_assessment;
 IF NOT FOUND THEN RAISE EXCEPTION 'Test nicht mehr freigegeben.'; END IF;
 INSERT INTO public.kompass_english_results(grade,pupil_id,attempt_id,task_key,topic,points,max_points,assessment_level,assessment_detail)
 VALUES(a.grade,a.pupil_id,a.id,a.task_key,title||' · Testniveau '||a.level,total,a.max_points,a.level,detail);
 RETURN jsonb_build_object('saved',true,'needs_review',review,'points',total,'max_points',a.max_points,'feedback',feedback);
END $$;
REVOKE ALL ON FUNCTION public.kompass_english_submit_vocab(text,text,uuid,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kompass_english_submit_vocab(text,text,uuid,jsonb) TO anon,authenticated;
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

CREATE OR REPLACE FUNCTION public.kompass_english_submit_result_v3(
 p_token text,p_pin text,p_attempt_id uuid,p_task_key text,p_topic text,
 p_points integer,p_max_points integer,p_test_date date)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v jsonb; v_title text; v_at timestamptz; v_existing boolean; v_expected integer; v_kind text;
BEGIN
 v:=public.kompass_english_check_pin(p_token,p_pin);
 IF NOT (v->>'ok')::boolean THEN RETURN v; END IF;
 SELECT title,expected_questions,coalesce(assessment_config->>'kind','vocabulary') INTO v_title,v_expected,v_kind FROM public.kompass_english_tasks WHERE task_key=p_task_key AND is_assessment;
 IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'practice_only',true,'message','Dies ist eine Übung, kein Test laut Lernwegeliste. Kein Ergebnis übertragen. Bitte die Seite neu laden und den vorgesehenen LWL-Test öffnen.'); END IF;
 IF v_kind='teacher' THEN RETURN jsonb_build_object('ok',false,'update_required',true,'message','Diese Aufgabe wird von der Lehrkraft direkt in der Kompetenz bewertet. Es gibt keine automatische Punkteübertragung.'); END IF;
 IF p_task_key IN ('vocab:lwl-u4-test-1','vocab:lwl-u4-test-2') THEN RETURN jsonb_build_object('ok',false,'update_required',true,'message','Bitte Seite neu laden und den neuen Vokabel-Lernnachweis mit Niveau und höchstens 20 Aufgaben starten.'); END IF;
 IF p_max_points IS DISTINCT FROM v_expected THEN RETURN jsonb_build_object('ok',false,'update_required',true,'message','Unvollständiger LWL-Test. Bitte die Seite neu laden und den vollständigen Test öffnen.'); END IF;
 -- Lost acknowledgments may be retried after closing, without adding evidence.
 SELECT EXISTS(SELECT 1 FROM public.kompass_english_results r JOIN public.kompass_english_links l
  ON l.grade=r.grade AND l.pupil_id=r.pupil_id
  WHERE l.token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex') AND r.attempt_id=p_attempt_id) INTO v_existing;
 v_at:=clock_timestamp();
 v:=public.kompass_english_window_for_token(p_token,v_at);
 IF NOT v_existing AND (NOT (v->>'open')::boolean
   OR p_test_date IS NULL OR p_test_date<>(v_at AT TIME ZONE 'Europe/Berlin')::date) THEN
  RETURN v||jsonb_build_object('ok',false,'window_closed',true,'message',CASE WHEN (v->>'open')::boolean THEN 'Dieser Versuch stammt von einem anderen Tag und kann nicht übertragen werden.' ELSE v->>'message' END);
 END IF;
 RETURN public.kompass_english_submit_result(p_token,p_attempt_id,p_task_key,v_title,p_points,p_max_points)||jsonb_build_object('ok',true);
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
