-- Switching the studied language: the profile mirrors the active language. Run with: pnpm test:db
begin;
select plan(6);

insert into auth.users (id, email) values ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'noa@example.com');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"dddddddd-dddd-dddd-dddd-dddddddddddd","role":"authenticated"}', true);

update public.profiles set level = 'B1', purpose = 'work', onboarded_at = now()
where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

select public.set_active_language('de');
select is(
  (select active_language::text || ' ' || level::text || ' ' || coalesce(purpose::text, '-') || ' ' || (onboarded_at is null)::text
   from public.profiles),
  'de A1 - true',
  'a new language starts from A1, with no purpose and no onboarding'
);
select is(
  (select level::text || ' ' || purpose::text from public.learner_languages where language = 'en'),
  'B1 work',
  'the language left behind keeps its level and purpose'
);

update public.profiles set level = 'A2', purpose = 'travel', onboarded_at = now()
where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
select is(
  (select level::text || ' ' || purpose::text from public.learner_languages where language = 'de'),
  'A2 travel',
  'profile changes go to the active language'
);

select public.set_active_language('en');
select is(
  (select active_language::text || ' ' || level::text || ' ' || purpose::text from public.profiles),
  'en B1 work',
  'switching back restores the level and purpose of that language'
);
select is((select count(*) from public.learner_languages)::int, 2, 'one row per studied language');

select throws_ok(
  $$ select public.set_active_language('it') $$,
  '22023', null, 'the native language cannot be studied'
);

select * from finish();
rollback;
