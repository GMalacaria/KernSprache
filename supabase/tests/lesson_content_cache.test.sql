-- Shared lesson content: no access for learners, one generation at a time. Run with: pnpm test:db
begin;
select plan(7);

insert into auth.users (id, email) values ('99999999-9999-9999-9999-999999999999', 'ivo@example.com');

-- The service role (no role switch) claims the first generation; a second claim waits for it.
select ok(
  public.claim_lesson_generation((select min(id) from public.lessons), 'it', 'travel', 'lesson.test'),
  'the first request claims the generation'
);
select ok(
  not public.claim_lesson_generation((select min(id) from public.lessons), 'it', 'travel', 'lesson.test'),
  'a second request does not generate the same lesson at the same time'
);
select ok(
  public.claim_lesson_generation((select min(id) from public.lessons), 'it', null, 'lesson.test'),
  'another purpose (even none) is another lesson'
);

-- A stalled generation can be taken over; a finished one cannot.
update public.lesson_content_cache set generating_until = now() - interval '1 second'
where purpose = 'travel' and prompt_version = 'lesson.test';
select ok(
  public.claim_lesson_generation((select min(id) from public.lessons), 'it', 'travel', 'lesson.test'),
  'a stalled generation is taken over'
);
update public.lesson_content_cache set content = '{}', generating_until = null
where purpose = 'travel' and prompt_version = 'lesson.test';
select ok(
  not public.claim_lesson_generation((select min(id) from public.lessons), 'it', 'travel', 'lesson.test', 0),
  'a lesson already generated is not generated again'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"99999999-9999-9999-9999-999999999999","role":"authenticated"}', true);

select throws_ok(
  $$ select * from public.lesson_content_cache $$,
  '42501', null, 'learners cannot read the shared cache'
);
select throws_ok(
  $$ select public.claim_lesson_generation(1, 'it', 'travel', 'x') $$,
  '42501', null, 'learners cannot claim a generation'
);

select * from finish();
rollback;
