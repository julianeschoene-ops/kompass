BEGIN;

-- Keep the task and item IDs stable: attempts already in progress store their own items.
WITH revisions(task_key, item_id, prompt, answers) AS (
  VALUES
    ('assessment:lwl-u3-grammar', 'u3-grammar-G-1', 'She ___ (go) to school with her friend.', NULL::jsonb),
    ('assessment:lwl-u3-grammar', 'u3-grammar-G-2', 'Tom ___ (watch) a film in the evening.', NULL::jsonb),
    ('assessment:lwl-u3-grammar', 'u3-grammar-G-3', 'We ___ (not like) homework.', NULL::jsonb),
    ('assessment:lwl-u3-grammar', 'u3-grammar-G-5', '___ you play football?', NULL::jsonb),
    ('assessment:lwl-u3-grammar', 'u3-grammar-M-1', 'Verneine: My brother plays football.', '["My brother does not play football.", "My brother doesn''t play football."]'::jsonb),
    ('assessment:lwl-u3-grammar', 'u3-grammar-M-3', 'Frage nach dem Ort: Ben lives in a house.', NULL::jsonb),
    ('assessment:lwl-u5-grammar', 'grammar-M-1', 'Verneine: She played football.', '["She did not play football.", "She didn''t play football."]'::jsonb)
), updated AS (
  SELECT t.task_key, jsonb_agg(
    CASE WHEN r.item_id IS NULL THEN item
      ELSE item || jsonb_build_object('prompt', r.prompt) ||
        CASE WHEN r.answers IS NULL THEN '{}'::jsonb ELSE jsonb_build_object('accepted', r.answers) END
    END ORDER BY ord) items
  FROM public.kompass_english_tasks t
  CROSS JOIN LATERAL jsonb_array_elements(t.vocabulary_bank->'check_items') WITH ORDINALITY q(item,ord)
  LEFT JOIN revisions r ON r.task_key=t.task_key AND r.item_id=item->>'item_id'
  WHERE t.task_key IN ('assessment:lwl-u3-grammar','assessment:lwl-u5-grammar')
  GROUP BY t.task_key
)
UPDATE public.kompass_english_tasks t SET vocabulary_bank=jsonb_set(t.vocabulary_bank,'{check_items}',u.items)
FROM updated u WHERE t.task_key=u.task_key;

-- The M section checks meaning through a context, rather than repeating G translation.
WITH revisions(task_key, word_id, prompt) AS (
  VALUES
    ('vocab:lwl-u3-test-1','12-0','You get up, go to school and do your homework every day. That is your ...'),
    ('vocab:lwl-u3-test-1','14-1','You are not in the house. You are ...'),
    ('vocab:lwl-u4-test-1','16-8','A shop has many things to buy. Each thing is a ...'),
    ('vocab:lwl-u4-test-1','16-9','Which verb means: take a friend’s book and give it back later?'),
    ('vocab:lwl-u4-test-1','16-10','You wear a shirt, a jacket and shoes. These are your ...'),
    ('vocab:lwl-u4-test-1','16-14','You go there to see a play. It is a ...'),
    ('vocab:lwl-u4-test-1','16-16','You can ride your skateboard there. It is a ...'),
    ('vocab:lwl-u4-test-1','16-17','School starts at eight. You are there at seven. You are ...'),
    ('vocab:lwl-u4-test-2','17-0','You are new in town. You ask: Can you tell me the ... to the park?'),
    ('vocab:lwl-u4-test-2','17-3','Which verb means: give your friend some information?'),
    ('vocab:lwl-u4-test-2','17-5','Go straight on ... you see the park.'),
    ('vocab:lwl-u4-test-2','17-7','Which verb means: go left or right at a crossing?'),
    ('vocab:lwl-u4-test-2','17-11','Your answer is not wrong. It is ...'),
    ('vocab:lwl-u5-test-1','u5-1-13','It is big and has leaves. You can sit under it in the park. It is a ...'),
    ('vocab:lwl-u5-test-2','u5-3-13','You go there to listen to a band play music. It is a ...'),
    ('vocab:lwl-u5-test-2','u5-4-1','This yellow fruit tastes very sour. It is a ...'),
    ('vocab:lwl-u5-test-2','u5-4-3','You can put this sweet thing in your tea. It is ...'),
    ('vocab:lwl-u5-test-3','u5-5-1','You sit in it at the fair. It goes up and down very fast. It is a ...'),
    ('vocab:lwl-u5-test-3','u5-6-9','You sleep in it when you go camping. It is a ...'),
    ('vocab:lwl-u5-test-4','u5-7-11','In the story, the knight has a long metal weapon. It is a ...')
), updated AS (
  SELECT t.task_key, jsonb_agg(CASE WHEN r.word_id IS NULL THEN item
    ELSE item || jsonb_build_object('prompt',r.prompt) END ORDER BY ord) items
  FROM public.kompass_english_tasks t
  CROSS JOIN LATERAL jsonb_array_elements(t.vocabulary_bank->'meanings') WITH ORDINALITY q(item,ord)
  LEFT JOIN revisions r ON r.task_key=t.task_key AND r.word_id=item->>'word_id'
  WHERE t.task_key IN (SELECT DISTINCT task_key FROM revisions)
  GROUP BY t.task_key
)
UPDATE public.kompass_english_tasks t SET vocabulary_bank=jsonb_set(t.vocabulary_bank,'{meanings}',u.items)
FROM updated u WHERE t.task_key=u.task_key;

WITH revisions(word_id,prompt,answers) AS (
  VALUES
    ('17-4','Gehe geradeaus, bis du den Park siehst.','["Go straight on until you see the park."]'::jsonb),
    ('17-8','Biege an der ersten Kreuzung links ab.','["Turn left at the first crossing."]'::jsonb),
    ('17-9','Biege an der zweiten Kreuzung rechts ab.','["Turn right at the second crossing."]'::jsonb)
), updated AS (
  SELECT jsonb_agg(CASE WHEN r.word_id IS NULL THEN item ELSE item ||
    jsonb_build_object('prompt',r.prompt,'accepted',r.answers) END ORDER BY ord) items
  FROM public.kompass_english_tasks t
  CROSS JOIN LATERAL jsonb_array_elements(t.vocabulary_bank->'sentences') WITH ORDINALITY q(item,ord)
  LEFT JOIN revisions r ON r.word_id=item->>'word_id'
  WHERE t.task_key='vocab:lwl-u4-test-2'
)
UPDATE public.kompass_english_tasks t SET vocabulary_bank=jsonb_set(t.vocabulary_bank,'{sentences}',u.items)
FROM updated u WHERE t.task_key='vocab:lwl-u4-test-2';

COMMIT;
