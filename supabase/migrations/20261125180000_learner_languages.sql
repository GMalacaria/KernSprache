-- Languages per learner (PLAN-multilingua.md, PR 3), additive only: nothing is renamed or dropped, so the app and
-- the functions already in production keep working before and after this migration. Existing data is English.
-- The single-language columns (profiles.level/purpose/goal/onboarded_at, vocab_items.en/it, *_it) stay until the
-- code reads the new ones; they are renamed or dropped in PR 10.

create type public.language_code as enum ('it', 'en', 'fr', 'es', 'de');

-- ---------------------------------------------------------------------------
-- profiles: native language (= interface language) and the language being studied now
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column native_language public.language_code not null default 'it',
  add column active_language public.language_code not null default 'en',
  add constraint profiles_active_language_not_native check (active_language <> native_language);

-- ---------------------------------------------------------------------------
-- learner_languages: one row per language a learner studies, with its own level and purpose
-- ---------------------------------------------------------------------------
create table public.learner_languages (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  language public.language_code not null,
  level public.cefr_level not null default 'A1',
  purpose public.learning_purpose,
  -- Details of the purpose in the learner's words (was profiles.goal).
  goal text,
  onboarded_at timestamptz,
  placement_done_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, language)
);

create trigger learner_languages_set_updated_at
  before update on public.learner_languages
  for each row execute function public.set_updated_at();

alter table public.learner_languages enable row level security;

create policy "learner_languages: select own" on public.learner_languages
  for select to authenticated using (user_id = (select auth.uid()));
create policy "learner_languages: insert own" on public.learner_languages
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "learner_languages: update own" on public.learner_languages
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "learner_languages: delete own" on public.learner_languages
  for delete to authenticated using (user_id = (select auth.uid()));

-- Until the app writes learner_languages itself (PR 9), the profile is the source: every change to its
-- level, purpose, goal or onboarding is copied to the row of the active language. PR 9 drops this trigger.
create function public.sync_learner_language()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.learner_languages (user_id, language, level, purpose, goal, onboarded_at)
  values (new.id, new.active_language, new.level, new.purpose, new.goal, new.onboarded_at)
  on conflict (user_id, language) do update
    set level = excluded.level,
        purpose = excluded.purpose,
        goal = excluded.goal,
        onboarded_at = excluded.onboarded_at;
  return new;
end;
$$;

revoke execute on function public.sync_learner_language() from public, anon, authenticated;

create trigger profiles_sync_learner_language
  after insert or update of level, purpose, goal, onboarded_at on public.profiles
  for each row execute function public.sync_learner_language();

-- ---------------------------------------------------------------------------
-- language on the per-learner tables (existing rows are English)
-- ---------------------------------------------------------------------------
alter table public.sessions add column language public.language_code not null default 'en';
alter table public.mistakes add column language public.language_code not null default 'en';
alter table public.vocab_items add column language public.language_code not null default 'en';
alter table public.placement_results add column language public.language_code not null default 'en';
alter table public.chapter_test_attempts add column language public.language_code not null default 'en';
-- The voice cache key gets the language in PR 4 (the same spelling can be a word in two languages).
alter table public.tts_cache add column language public.language_code not null default 'en';

-- The same word can be studied in two languages ("die" in German and English).
drop index public.vocab_items_user_en_key;
create unique index vocab_items_user_language_en_key on public.vocab_items (user_id, language, lower(en));

-- A placement test marks when the learner placed themselves in that language.
create function public.mark_placement_done()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.learner_languages
  set placement_done_at = new.created_at
  where user_id = new.user_id and language = new.language;
  return new;
end;
$$;

revoke execute on function public.mark_placement_done() from public, anon, authenticated;

create trigger placement_results_mark_done
  after insert on public.placement_results
  for each row execute function public.mark_placement_done();

-- ---------------------------------------------------------------------------
-- curriculum per language: chapters belong to a language, slugs and order are unique within it
-- ---------------------------------------------------------------------------
alter table public.chapters add column language public.language_code not null default 'en';

alter table public.chapters drop constraint curriculum_topics_slug_key;
alter table public.chapters drop constraint curriculum_topics_level_sort_order_key;
alter table public.chapters
  add constraint chapters_language_slug_key unique (language, slug),
  add constraint chapters_language_level_sort_order_key unique (language, level, sort_order);

-- Lesson slugs only need to be unique within their chapter.
alter table public.lessons drop constraint lessons_slug_key;
alter table public.lessons add constraint lessons_chapter_id_slug_key unique (chapter_id, slug);

-- ---------------------------------------------------------------------------
-- backfill: every existing learner studies English, with the profile's level and purpose
-- ---------------------------------------------------------------------------
insert into public.learner_languages (user_id, language, level, purpose, goal, onboarded_at, placement_done_at, created_at)
select
  p.id,
  'en',
  p.level,
  p.purpose,
  p.goal,
  p.onboarded_at,
  (select max(r.created_at) from public.placement_results r where r.user_id = p.id),
  p.created_at
from public.profiles p
on conflict (user_id, language) do nothing;
