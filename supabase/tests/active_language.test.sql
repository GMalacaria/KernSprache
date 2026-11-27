-- Switching the studied language: each language keeps its own level and purpose in learner_languages.
-- Run with: pnpm test:db
begin;
select plan(6);

insert into auth.users (id, email) values ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'noa@example.com');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"dddddddd-dddd-dddd-dddd-dddddddddddd","role":"authenticated"}', true);

select public.set_active_language('en');
update public.learner_languages set level = 'B1', purpose = 'work', onboarded_at = now() where language = 'en';

select public.set_active_language('de');
select is((select active_language::text from public.profiles), 'de', 'the active language changes');
select is(
  (select level::text || ' ' || coalesce(purpose::text, '-') || ' ' || (onboarded_at is null)::text
   from public.learner_languages where language = 'de'),
  'A1 - true',
  'a new language starts from A1, with no purpose and no onboarding'
);
select is(
  (select level::text || ' ' || purpose::text from public.learner_languages where language = 'en'),
  'B1 work',
  'the language left behind keeps its level and purpose'
);

select public.set_active_language('en');
select is((select count(*) from public.learner_languages)::int, 2, 'switching back does not add a row');

select throws_ok(
  $$ select public.set_active_language('it') $$,
  '22023', null, 'the native language cannot be studied'
);
select hasnt_column('public', 'profiles', 'level', 'the profile no longer has the per-language columns');

select * from finish();
rollback;
