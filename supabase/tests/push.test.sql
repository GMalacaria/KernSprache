-- Push subscriptions and reminder log. Run with: pnpm test:db
begin;
select plan(7);

insert into auth.users (id, email) values
  ('99999999-9999-9999-9999-999999999991', 'ivo@example.com'),
  ('99999999-9999-9999-9999-999999999992', 'lia@example.com');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"99999999-9999-9999-9999-999999999991","role":"authenticated"}', true);

select lives_ok(
  $$ select public.register_push_subscription('https://push.example/abc', 'key1', 'auth1') $$,
  'a learner can register a subscription'
);
select is((select count(*) from public.push_subscriptions)::int, 1, 'and sees it');

select set_config('request.jwt.claims', '{"sub":"99999999-9999-9999-9999-999999999992","role":"authenticated"}', true);
select is((select count(*) from public.push_subscriptions)::int, 0, 'others do not see it');

-- Same browser, another account: the subscription moves to the new owner.
select lives_ok(
  $$ select public.register_push_subscription('https://push.example/abc', 'key2', 'auth2') $$,
  'the same endpoint can be registered by someone else'
);
select is((select p256dh from public.push_subscriptions), 'key2', 'and now belongs to them');

select throws_ok('select * from public.reminder_log', '42501', null, 'learners cannot read the reminder log');

reset role;
select set_config('request.jwt.claims', '', true);
set local role anon;
select throws_ok(
  $$ select public.register_push_subscription('https://push.example/x', 'k', 'a') $$,
  '42501', null, 'anonymous callers cannot register'
);

select * from finish();
rollback;
