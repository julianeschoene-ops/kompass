BEGIN;
UPDATE public.kompass_english_tasks t SET vocabulary_bank=jsonb_set(t.vocabulary_bank,'{sentences}',
 (SELECT jsonb_agg(s||jsonb_build_object('accepted',(SELECT jsonb_agg(a) FROM jsonb_array_elements(s->'accepted') a
 WHERE a#>>'{}' NOT IN ('Can you come to the youth club on Fridays?','There is a bus stop next to the supermarket.','Go straight to the church.'))))
 FROM jsonb_array_elements(t.vocabulary_bank->'sentences') s)) WHERE t.vocabulary_bank IS NOT NULL;
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
 s:=regexp_replace(s,'[.!?,:;“”"„]','','g');s:=regexp_replace(s,'[–—-]',' ','g');
 RETURN trim(regexp_replace(s,'\s+',' ','g'));
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
