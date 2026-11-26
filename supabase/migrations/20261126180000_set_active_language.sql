-- Switching the studied language (PLAN-multilingua.md, PR 9). The profile keeps mirroring the active language
-- (level, purpose, goal, onboarded_at), so the app and the functions that still read the profile see the language
-- being studied. Switching copies the language's row into the profile; a language studied for the first time gets
-- a row with no purpose and no onboarding, so the app runs the first-access flow (purpose, placement) for it.

create function public.set_active_language(p_language public.language_code)
returns void
language plpgsql
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  native public.language_code;
  row public.learner_languages;
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
  select * into row from public.learner_languages where user_id = uid and language = p_language;

  -- The sync trigger copies these values back into the same row: nothing changes there.
  update public.profiles
  set active_language = p_language,
      level = row.level,
      purpose = row.purpose,
      goal = row.goal,
      onboarded_at = row.onboarded_at
  where id = uid;
end;
$$;

revoke execute on function public.set_active_language(public.language_code) from public, anon;
grant execute on function public.set_active_language(public.language_code) to authenticated;
