-- Study time: RLS on study_days and the add_study_time RPC. Run with: pnpm test:db
begin;
select plan(9);

insert into auth.users (id, email) values
  ('33333333-3333-3333-3333-333333333333', 'carla@example.com'),
  ('44444444-4444-4444-4444-444444444444', 'dario@example.com');
update public.profiles set daily_goal_minutes = 5 where id = '33333333-3333-3333-3333-333333333333';

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', true);

select is(
  (select written_seconds from public.add_study_time(current_date, 'written', 90)),
  90,
  'first call creates the day with written time'
);
select is(
  (select goal_minutes from public.study_days where day = current_date),
  5,
  'goal is snapshotted from the profile'
);
select add_study_time(current_date, 'written', 100);
select add_study_time(current_date, 'oral', 100);
select ok(
  (select completed_at is null from public.study_days where day = current_date),
  'not completed below the goal (290s of 300s)'
);
select ok(
  (select completed_at is null from public.add_study_time(current_date, 'written', 110)),
  'not completed when the total passes the goal but the oral half is missing (300s written + 100s oral)'
);
select ok(
  (select completed_at is not null from public.add_study_time(current_date, 'oral', 50)),
  'completed_at is set once both halves are reached (150s oral of a 300s goal)'
);

select throws_ok(
  $$ select public.add_study_time(current_date, 'written', 3600) $$,
  '22023', null, 'rejects oversized increments'
);
select throws_ok(
  $$ select public.add_study_time(current_date - 30, 'written', 10) $$,
  '22023', null, 'rejects days far from today'
);
select throws_ok(
  $$ insert into public.study_days (day, goal_minutes) values (current_date + 1, 20) $$,
  '42501', null, 'direct inserts are not allowed'
);

select set_config('request.jwt.claims', '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}', true);
select is((select count(*) from public.study_days)::int, 0, 'other users cannot see study days');

select * from finish();
rollback;
