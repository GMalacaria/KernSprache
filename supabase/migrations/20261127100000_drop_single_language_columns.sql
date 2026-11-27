-- Last step of the multilingual plan (PLAN-multilingua.md, PR 10): what was written for a single language goes away.
-- Not additive: the app and the functions released with it must go out together (see "Release" in the PR).

-- ---------------------------------------------------------------------------
-- The profile no longer mirrors the active language: level, purpose, goal and onboarding live in learner_languages.
-- ---------------------------------------------------------------------------
-- The profile was the source until now: make sure the active language's row has its latest values.
insert into public.learner_languages (user_id, language, level, purpose, goal, onboarded_at)
select id, active_language, level, purpose, goal, onboarded_at from public.profiles
on conflict (user_id, language) do update
  set level = excluded.level,
      purpose = excluded.purpose,
      goal = excluded.goal,
      onboarded_at = excluded.onboarded_at;

drop trigger profiles_sync_learner_language on public.profiles;
drop function public.sync_learner_language();

-- Switching only changes the active language (creating its row the first time).
create or replace function public.set_active_language(p_language public.language_code)
returns void
language plpgsql
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  native public.language_code;
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  select native_language into native from public.profiles where id = uid;
  if p_language = native then
    raise exception 'the native language cannot be studied' using errcode = '22023';
  end if;
  insert into public.learner_languages (user_id, language) values (uid, p_language)
  on conflict (user_id, language) do nothing;
  update public.profiles set active_language = p_language where id = uid;
end;
$$;

alter table public.profiles
  drop column level,
  drop column purpose,
  drop column goal,
  drop column onboarded_at;

-- ---------------------------------------------------------------------------
-- Neutral column names
-- ---------------------------------------------------------------------------
alter table public.vocab_items rename column en to term;
alter table public.vocab_items rename column it to translation;
alter index public.vocab_items_user_language_en_key rename to vocab_items_user_language_term_key;
alter table public.mistakes rename column explanation_it to explanation;
alter table public.chapters rename column description_it to description;

-- ---------------------------------------------------------------------------
-- Every row says its language: no more "English unless stated"
-- ---------------------------------------------------------------------------
alter table public.chapters alter column language drop default;
alter table public.sessions alter column language drop default;
alter table public.mistakes alter column language drop default;
alter table public.vocab_items alter column language drop default;
alter table public.placement_results alter column language drop default;
alter table public.chapter_test_attempts alter column language drop default;
alter table public.tts_cache alter column language drop default;

-- ---------------------------------------------------------------------------
-- Lessons are only in the shared cache (lesson_content_cache)
-- ---------------------------------------------------------------------------
drop table public.lesson_contents;
