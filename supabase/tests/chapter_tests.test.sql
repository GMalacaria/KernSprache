-- Chapter tests: questions are server-only, attempts are readable by their owner only.
-- Run with: pnpm test:db
begin;
select plan(6);

insert into auth.users (id, email) values
  ('77777777-7777-7777-7777-777777777777', 'gina@example.com'),
  ('88888888-8888-8888-8888-888888888888', 'hugo@example.com');

-- Rows written by the service role (the Edge Function).
insert into public.chapter_tests (id, user_id, chapter_id, questions, oral_tasks, prompt_version)
select 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '77777777-7777-7777-7777-777777777777', id,
  '[{"id":"q1","prompt":"x","options":["a","b","c","d"],"answer":1}]', '[{"id":"o1","prompt_it":"x"}]', 'test'
from public.chapters limit 1;

insert into public.chapter_test_attempts (user_id, chapter_id, test_id, written_score, oral_score, score, passed, feedback, language)
select '77777777-7777-7777-7777-777777777777', chapter_id, id, 80, 70, 75, true, '{}', 'en'
from public.chapter_tests where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"77777777-7777-7777-7777-777777777777","role":"authenticated"}', true);

select throws_ok('select * from public.chapter_tests', '42501', null, 'learners cannot read the tests (answers stay on the server)');
select throws_ok(
  $$ insert into public.chapter_tests (user_id, chapter_id, questions, oral_tasks, prompt_version)
     select '77777777-7777-7777-7777-777777777777', id, '[]', '[]', 'x' from public.chapters limit 1 $$,
  '42501', null, 'learners cannot write tests'
);
select is((select count(*) from public.chapter_test_attempts)::int, 1, 'learners can read their own attempts');
select throws_ok(
  $$ insert into public.chapter_test_attempts (user_id, chapter_id, test_id, written_score, oral_score, score, passed, feedback, language)
     select user_id, chapter_id, test_id, 100, 100, 100, true, '{}', 'en' from public.chapter_test_attempts limit 1 $$,
  '42501', null, 'learners cannot write attempts (no self-declared pass)'
);

select set_config('request.jwt.claims', '{"sub":"88888888-8888-8888-8888-888888888888","role":"authenticated"}', true);
select is((select count(*) from public.chapter_test_attempts)::int, 0, 'learners cannot see others'' attempts');
select throws_ok('select * from public.chapter_tests', '42501', null, 'other learners cannot read the tests either');

select * from finish();
rollback;
