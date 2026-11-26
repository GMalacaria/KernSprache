-- What the learner said and how it went (PLAN-multilingua.md, PR 6): chat messages, pronunciation results,
-- dictation scores and the transcripts of the oral answers of the chapter tests. Kept for the profile per language.

create type public.message_role as enum ('learner', 'tutor');
create type public.message_input as enum ('text', 'voice');
create type public.pronunciation_source as enum ('dialogue', 'repeat', 'review', 'test');

-- ---------------------------------------------------------------------------
-- session_messages: every turn of a dialogue (free or in a lesson), written by tutor-chat
-- ---------------------------------------------------------------------------
create table public.session_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  session_id uuid not null,
  role public.message_role not null,
  content text not null check (length(content) between 1 and 4000),
  -- How the learner wrote it (a voice message is its transcript); null for the tutor.
  input public.message_input,
  created_at timestamptz not null default now(),
  foreign key (session_id, user_id) references public.sessions (id, user_id) on delete cascade,
  check ((role = 'learner') = (input is not null))
);

create index session_messages_session_idx on public.session_messages (session_id, created_at);

alter table public.session_messages enable row level security;
create policy "session_messages: select own" on public.session_messages
  for select to authenticated using (user_id = (select auth.uid()));
create policy "session_messages: insert own" on public.session_messages
  for insert to authenticated with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- pronunciation_results: every judged recording, written by transcribe
-- ---------------------------------------------------------------------------
create table public.pronunciation_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  language public.language_code not null,
  source public.pronunciation_source not null,
  -- The sentence the learner was reading aloud, when there was one.
  expected_text text,
  transcript text not null,
  score integer not null check (score between 0 and 100),
  -- [{ "word": "...", "tip_it": "..." }]
  words jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create index pronunciation_results_user_language_idx on public.pronunciation_results (user_id, language, created_at desc);

alter table public.pronunciation_results enable row level security;
create policy "pronunciation_results: select own" on public.pronunciation_results
  for select to authenticated using (user_id = (select auth.uid()));
create policy "pronunciation_results: insert own" on public.pronunciation_results
  for insert to authenticated with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- dictation_results: one row per dictation sentence done, written by the PWA (graded in the browser, like the
-- quiz: the numbers are checked for consistency, not proven)
-- ---------------------------------------------------------------------------
create table public.dictation_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  lesson_id bigint not null references public.lessons (id) on delete cascade,
  sentence text not null check (length(sentence) between 1 and 400),
  score integer not null check (score between 0 and 100),
  wrong_attempts integer not null check (wrong_attempts between 0 and 50),
  text_shown boolean not null,
  created_at timestamptz not null default now()
);

create index dictation_results_user_lesson_idx on public.dictation_results (user_id, lesson_id);

alter table public.dictation_results enable row level security;
create policy "dictation_results: select own" on public.dictation_results
  for select to authenticated using (user_id = (select auth.uid()));
create policy "dictation_results: insert own" on public.dictation_results
  for insert to authenticated with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- chapter tests: the transcripts of the spoken answers, next to their scores
-- ---------------------------------------------------------------------------
alter table public.chapter_test_attempts add column oral_transcripts jsonb not null default '[]';
