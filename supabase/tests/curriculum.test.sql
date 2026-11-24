-- Curriculum: shared read-only chapters/lessons, per-user lesson progress. Run with: pnpm test:db
begin;
select plan(10);

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

-- A lesson has a written and an oral part: progress starts with one of them.
insert into public.lesson_progress (lesson_id, written_done_at, written_stats)
select id, now(), '{"answers": 10, "correct": 8, "best_streak": 5}' from public.lessons where slug = 'a1-to-be-hello';
select is(
  (select user_id from public.lesson_progress),
  '55555555-5555-5555-5555-555555555555'::uuid,
  'progress is recorded for the current learner'
);
select ok(
  (select completed_at is null and score is null from public.lesson_progress),
  'a lesson with only the written part done is not completed'
);

select throws_ok(
  $$ update public.lesson_progress set completed_at = now(), score = 80 $$,
  '23514', null, 'a lesson cannot be completed without the oral part'
);
select throws_ok(
  $$ update public.lesson_progress set oral_done_at = now(), completed_at = now() $$,
  '23514', null, 'a completed lesson needs a score'
);
with done as (
  update public.lesson_progress set oral_done_at = now(), completed_at = now(), score = 80 returning completed_at
)
select ok((select completed_at is not null from done), 'the lesson is completed once both parts are done');

select throws_ok(
  $$ insert into public.lesson_progress (user_id, lesson_id, written_done_at)
     select '66666666-6666-6666-6666-666666666666', id, now() from public.lessons where slug = 'a1-to-be-numbers' $$,
  '42501', null, 'learners cannot record progress for others'
);

select set_config('request.jwt.claims', '{"sub":"66666666-6666-6666-6666-666666666666","role":"authenticated"}', true);
select is((select count(*) from public.lesson_progress)::int, 0, 'learners cannot see others'' progress');

select * from finish();
rollback;
