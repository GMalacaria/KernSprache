-- RLS checks. Run with: pnpm exec supabase test db
begin;
select plan(9);

-- Two users; the signup trigger creates their profiles.
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'alice@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'bob@example.com');

select is(
  (select count(*) from public.profiles
    where id in ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222'))::int, 2,
  'signup trigger creates a profile per user'
);

-- Act as Alice.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

insert into public.sessions (id, kind) values ('aaaaaaaa-0000-0000-0000-000000000001', 'dialogue');
insert into public.mistakes (session_id, original, corrected, explanation_it, category)
  values ('aaaaaaaa-0000-0000-0000-000000000001', 'I has a dog', 'I have a dog', 'Con "I" si usa "have".', 'verb_tense');
insert into public.vocab_items (en, it) values ('dog', 'cane');

select is((select count(*) from public.profiles)::int, 1, 'Alice sees only her profile');
select is((select user_id from public.sessions limit 1), '11111111-1111-1111-1111-111111111111'::uuid, 'user_id defaults to auth.uid()');

select throws_ok(
  $$ insert into public.vocab_items (user_id, en, it) values ('22222222-2222-2222-2222-222222222222', 'cat', 'gatto') $$,
  '42501', null, 'Alice cannot insert rows for Bob'
);

select throws_ok(
  $$ insert into public.curriculum_topics (level, sort_order, slug, title) values ('A1', 99, 'x', 'x') $$,
  '42501', null, 'curriculum is read-only for users'
);

-- Act as Bob.
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);

select is((select count(*) from public.sessions)::int, 0, 'Bob cannot see Alice''s sessions');
select is((select count(*) from public.mistakes)::int, 0, 'Bob cannot see Alice''s mistakes');
select is((select count(*) from public.vocab_items)::int, 0, 'Bob cannot see Alice''s vocabulary');

-- Bob cannot attach a mistake to Alice's session (composite FK on session_id, user_id).
select throws_ok(
  $$ insert into public.mistakes (session_id, original, corrected, explanation_it)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'x', 'y', 'z') $$,
  '23503', null, 'mistakes cannot reference another user''s session'
);

select * from finish();
rollback;
