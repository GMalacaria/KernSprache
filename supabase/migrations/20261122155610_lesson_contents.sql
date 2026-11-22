-- Generated lesson content, one per learner and lesson, tailored to the learner's
-- purpose. Generated ahead of time by the `lesson` Edge Function (service role) so
-- a lesson opens instantly and repeating it costs nothing.

create table public.lesson_contents (
  user_id uuid not null references auth.users (id) on delete cascade,
  lesson_id bigint not null references public.lessons (id) on delete cascade,
  -- Purpose the content was written for: regenerated if the learner changes it.
  purpose public.learning_purpose,
  content jsonb not null,
  prompt_version text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

revoke all on public.lesson_contents from anon, authenticated;
grant select on public.lesson_contents to authenticated;

alter table public.lesson_contents enable row level security;

create policy "lesson_contents: select own" on public.lesson_contents
  for select to authenticated
  using (user_id = (select auth.uid()));
