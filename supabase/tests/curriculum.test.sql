-- Curriculum: shared read-only chapters/lessons, per-user lesson progress. Run with: pnpm test:db
begin;
select plan(6);

insert into auth.users (id, email) values
  ('55555555-5555-5555-5555-555555555555', 'eva@example.com'),
  ('66666666-6666-6666-6666-666666666666', 'fabio@example.com');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"55555555-5555-5555-5555-555555555555","role":"authenticated"}', true);

select is((select count(*) from public.chapters)::int, 24, 'learners can read the 24 chapters');
select is((select count(*) from public.lessons)::int, 96, 'learners can read the 96 lessons');

select throws_ok(
  $$ insert into public.lessons (chapter_id, sort_order, slug, title, focus)
     select id, 99, 'x', 'x', 'x' from public.chapters limit 1 $$,
  '42501', null, 'lessons are read-only for learners'
);

insert into public.lesson_progress (lesson_id, score)
select id, 80 from public.lessons where slug = 'a1-to-be-hello';
select is(
  (select user_id from public.lesson_progress),
  '55555555-5555-5555-5555-555555555555'::uuid,
  'progress is recorded for the current learner'
);

select throws_ok(
  $$ insert into public.lesson_progress (user_id, lesson_id, score)
     select '66666666-6666-6666-6666-666666666666', id, 50 from public.lessons where slug = 'a1-to-be-numbers' $$,
  '42501', null, 'learners cannot record progress for others'
);

select set_config('request.jwt.claims', '{"sub":"66666666-6666-6666-6666-666666666666","role":"authenticated"}', true);
select is((select count(*) from public.lesson_progress)::int, 0, 'learners cannot see others'' progress');

select * from finish();
rollback;
