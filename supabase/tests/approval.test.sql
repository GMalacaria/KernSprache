-- Account approval: the first account is approved, later ones wait, nobody approves themselves.
-- Run with: pnpm test:db
begin;
select plan(6);

-- Start from a database without profiles (reset only in this transaction).
delete from auth.users;

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'owner@example.com'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'newcomer@example.com');

select is(
  (select approved from public.profiles where id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  true, 'the first account is approved automatically'
);
select is(
  (select approved from public.profiles where id = 'aaaaaaaa-0000-0000-0000-000000000002'),
  false, 'later accounts wait for approval'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000002","role":"authenticated"}', true);

select throws_ok(
  $$ update public.profiles set approved = true where id = 'aaaaaaaa-0000-0000-0000-000000000002' $$,
  '42501', null, 'a learner cannot approve themselves'
);
select lives_ok(
  $$ update public.profiles set goal = 'viaggi' where id = 'aaaaaaaa-0000-0000-0000-000000000002' $$,
  'but can still edit the rest of their profile'
);
select is((select approved from public.profiles), false, 'and stays unapproved');

reset role;
select set_config('request.jwt.claims', '', true);
update public.profiles set approved = true where id = 'aaaaaaaa-0000-0000-0000-000000000002';
select is(
  (select approved from public.profiles where id = 'aaaaaaaa-0000-0000-0000-000000000002'),
  true, 'the owner approves from the dashboard (no auth.uid)'
);

select * from finish();
rollback;
