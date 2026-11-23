-- End-of-chapter tests: half written, half oral. The questions (with answers) live
-- only on the server: learners get no privileges on chapter_tests, the
-- chapter-test Edge Function reads and writes it with the service role.
-- Attempts are readable by their owner and written only by the function.

create table public.chapter_tests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  chapter_id bigint not null references public.chapters (id) on delete cascade,
  -- [{ "id", "prompt", "options": [4 strings], "answer": 0-3 }]
  questions jsonb not null,
  -- [{ "id", "prompt_it" }]
  oral_tasks jsonb not null,
  prompt_version text not null,
  created_at timestamptz not null default now()
);

create index chapter_tests_user_chapter_idx on public.chapter_tests (user_id, chapter_id, created_at desc);

create table public.chapter_test_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  chapter_id bigint not null references public.chapters (id) on delete cascade,
  test_id uuid not null references public.chapter_tests (id) on delete cascade,
  written_score integer not null check (written_score between 0 and 100),
  oral_score integer not null check (oral_score between 0 and 100),
  score integer not null check (score between 0 and 100),
  passed boolean not null,
  -- { "feedback_it", "strengths_it", "to_improve_it", "wrong": [{ "id", "chosen", "answer" }] }
  feedback jsonb not null,
  created_at timestamptz not null default now()
);

create index chapter_test_attempts_user_chapter_idx
  on public.chapter_test_attempts (user_id, chapter_id, created_at desc);

revoke all on public.chapter_tests, public.chapter_test_attempts from anon, authenticated;
grant select on public.chapter_test_attempts to authenticated;

-- RLS on with no policy on chapter_tests: nothing is visible to learners.
alter table public.chapter_tests enable row level security;
alter table public.chapter_test_attempts enable row level security;

create policy "chapter_test_attempts: select own" on public.chapter_test_attempts
  for select to authenticated
  using (user_id = (select auth.uid()));
