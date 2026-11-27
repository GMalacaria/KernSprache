-- Speech cache: only the service role may read it, and the audio bucket is private. Run with: pnpm test:db
begin;
select plan(4);

-- Random keys: the test must not collide with rows a real database already has.
insert into public.tts_cache (key, text, voice, path, language) values (md5(random()::text), 'Where were you?', 'Kore', 'a.wav', 'en');
insert into auth.users (id, email) values ('bbbbbbbb-0000-0000-0000-bbbbbbbbbbbb', 'tea@example.com');

select is((select public from storage.buckets where id = 'tts'), false, 'the tts bucket is private');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-bbbbbbbbbbbb","role":"authenticated"}', true);

select is((select count(*) from public.tts_cache)::int, 0, 'a signed-in user cannot read the cache');
select throws_ok(
  $$ insert into public.tts_cache (key, text, voice, path, language) values (md5(random()::text), 'x', 'Kore', 'b.wav', 'en') $$,
  '42501', null, 'a signed-in user cannot write the cache'
);

set local role anon;
select is((select count(*) from public.tts_cache)::int, 0, 'an anonymous caller cannot read the cache');

select * from finish();
rollback;
