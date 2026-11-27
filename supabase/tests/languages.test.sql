-- Languages per learner: learner_languages (RLS), language on the learner tables, curriculum unique per language.
-- Run with: pnpm test:db
begin;
select plan(13);

insert into auth.users (id, email) values
  ('77777777-7777-7777-7777-777777777777', 'gina@example.com'),
  ('88888888-8888-8888-8888-888888888888', 'hugo@example.com');

select is(
  (select native_language::text || ' ' || active_language::text from public.profiles
    where id = '77777777-7777-7777-7777-777777777777'),
  'it en',
  'native Italian, studying English by default'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"77777777-7777-7777-7777-777777777777","role":"authenticated"}', true);

insert into public.learner_languages (language, level, purpose, goal, onboarded_at) values ('en', 'B1', 'work', 'riunioni', now());
select is(
  (select level::text || ' ' || purpose::text || ' ' || goal || ' ' || (onboarded_at is not null)::text
    from public.learner_languages where language = 'en'),
  'B1 work riunioni true',
  'a learner keeps level, purpose and details per language'
);

select is((select count(*) from public.learner_languages)::int, 1, 'Gina sees only her languages');

insert into public.learner_languages (language, level) values ('de', 'A1');
select is((select count(*) from public.learner_languages)::int, 2, 'a learner can add a language');
select throws_ok(
  $$ insert into public.learner_languages (user_id, language) values ('88888888-8888-8888-8888-888888888888', 'fr') $$,
  '42501', null, 'a learner cannot add a language for someone else'
);

select throws_ok(
  $$ update public.profiles set active_language = 'it' where id = '77777777-7777-7777-7777-777777777777' $$,
  '23514', null, 'the studied language differs from the native one'
);

-- The same spelling can be a word in two languages; within one language it is still unique.
insert into public.vocab_items (term, translation, language) values ('die', 'morire', 'en');
insert into public.vocab_items (term, translation, language) values ('die', 'il/la (articolo)', 'de');
select is((select count(*) from public.vocab_items)::int, 2, 'the same word in two languages');
select throws_ok(
  $$ insert into public.vocab_items (term, translation, language) values ('Die', 'dado', 'en') $$,
  '23505', null, 'a word is unique within a language'
);
select throws_ok(
  $$ insert into public.vocab_items (term, translation) values ('cat', 'gatto') $$,
  '23502', null, 'every word says its language'
);

select is(
  (select count(*) from public.chapters where language = 'en')::int, 24,
  'the existing curriculum is English'
);

reset role;

-- A placement test marks the language as placed.
insert into public.placement_results (user_id, written_answers, written_correct, written_total, written_level, final_level, language)
values ('77777777-7777-7777-7777-777777777777', '{}', 8, 16, 'A2', 'A2', 'en');
select ok(
  (select placement_done_at is not null from public.learner_languages
    where user_id = '77777777-7777-7777-7777-777777777777' and language = 'en'),
  'a placement result marks the language as placed'
);

-- Curriculum: the same slug and position can exist in another language, not twice in one.
insert into public.chapters (language, level, sort_order, slug, title)
select 'it', level, sort_order, slug, title from public.chapters where language = 'en' and sort_order = 1 and level = 'A1';
select is((select count(*) from public.chapters where slug = (select slug from public.chapters where language = 'it'))::int, 2,
  'a chapter slug can repeat in another language');
select throws_ok(
  $$ insert into public.chapters (language, level, sort_order, slug, title) values ('it', 'A1', 1, 'other', 'x') $$,
  '23505', null, 'level and order are unique within a language'
);

select * from finish();
rollback;
