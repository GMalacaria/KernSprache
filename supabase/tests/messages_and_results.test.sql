-- Chat messages, pronunciation and dictation results: own rows only. Run with: pnpm test:db
begin;
select plan(9);

insert into auth.users (id, email) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'lia@example.com'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'max@example.com');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}', true);

insert into public.sessions (id, kind, language) values ('cccccccc-0000-0000-0000-000000000001', 'dialogue', 'en');
insert into public.session_messages (session_id, role, content, input) values
  ('cccccccc-0000-0000-0000-000000000001', 'learner', 'I go to the cinema yesterday.', 'voice'),
  ('cccccccc-0000-0000-0000-000000000001', 'tutor', 'Nice! What did you see?', null);
select is((select count(*) from public.session_messages)::int, 2, 'a dialogue keeps its messages');
select throws_ok(
  $$ insert into public.session_messages (session_id, role, content) values
     ('cccccccc-0000-0000-0000-000000000001', 'learner', 'no input') $$,
  '23514', null, 'a learner message says whether it was written or spoken'
);

insert into public.pronunciation_results (language, source, expected_text, transcript, score, words)
values ('en', 'repeat', 'Where were you?', 'Where was you?', 70, '[{"word": "were", "tip_it": "x"}]');
insert into public.dictation_results (lesson_id, sentence, score, wrong_attempts, text_shown)
select min(id), 'She is a tourist.', 80, 1, false from public.lessons;
select is((select count(*) from public.pronunciation_results)::int, 1, 'a pronunciation result is saved');
select is((select count(*) from public.dictation_results)::int, 1, 'a dictation result is saved');
select throws_ok(
  $$ insert into public.dictation_results (lesson_id, sentence, score, wrong_attempts, text_shown)
     select min(id), 'x', 120, 0, false from public.lessons $$,
  '23514', null, 'a dictation score is between 0 and 100'
);

-- Max sees none of Lia's rows and cannot write into her session.
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}', true);
select is((select count(*) from public.session_messages)::int, 0, 'messages are private');
select is((select count(*) from public.pronunciation_results)::int, 0, 'pronunciation results are private');
select is((select count(*) from public.dictation_results)::int, 0, 'dictation results are private');
select throws_ok(
  $$ insert into public.session_messages (session_id, role, content, input) values
     ('cccccccc-0000-0000-0000-000000000001', 'learner', 'hi', 'text') $$,
  '23503', null, 'nobody writes into another learner''s session'
);

select * from finish();
rollback;
