-- Lesson stats: RLS on lesson_stats and the record_lesson_stats RPC. Run with: pnpm test:db
begin;
select plan(10);

insert into auth.users (id, email) values
  ('99999999-9999-9999-9999-999999999999', 'ivo@example.com'),
  ('aaaaaaaa-0000-0000-0000-aaaaaaaaaaaa', 'lia@example.com');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"99999999-9999-9999-9999-999999999999","role":"authenticated"}', true);

select is(
  (select chapter_id from public.record_lesson_stats((select min(id) from public.lessons), 20, 17, 9)),
  (select chapter_id from public.lessons where id = (select min(id) from public.lessons)),
  'the chapter is taken from the lesson'
);
select is(
  (select correct from public.record_lesson_stats((select min(id) from public.lessons), 20, 19, 15)),
  19,
  'repeating a lesson replaces its stats'
);
select is((select count(*) from public.lesson_stats)::int, 1, 'one row per lesson');

select throws_ok(
  $$ select public.record_lesson_stats((select min(id) from public.lessons), 10, 11, 5) $$,
  '22023', null, 'rejects more correct answers than answers'
);
select throws_ok(
  $$ select public.record_lesson_stats((select min(id) from public.lessons), 10, 8, 9) $$,
  '22023', null, 'rejects a streak longer than the correct answers'
);
select throws_ok(
  $$ select public.record_lesson_stats((select min(id) from public.lessons), 10, 9, 2) $$,
  '22023', null, 'rejects a streak too short for the counts (1 mistake: at least 5 in a row)'
);
select throws_ok(
  $$ select public.record_lesson_stats((select min(id) from public.lessons), 500, 500, 500) $$,
  '22023', null, 'rejects oversized counts'
);
select throws_ok(
  $$ select public.record_lesson_stats(-1, 1, 1, 1) $$,
  '22023', null, 'rejects unknown lessons'
);
select throws_ok(
  $$ insert into public.lesson_stats (lesson_id, chapter_id, answers, correct, best_streak)
     select id, chapter_id, 10, 10, 10 from public.lessons limit 1 $$,
  '42501', null, 'direct inserts are not allowed'
);

select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-aaaaaaaaaaaa","role":"authenticated"}', true);
select is((select count(*) from public.lesson_stats)::int, 0, 'other users cannot see lesson stats');

select * from finish();
rollback;
