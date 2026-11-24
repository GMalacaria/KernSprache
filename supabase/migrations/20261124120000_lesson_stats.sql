-- Exercise statistics of each completed lesson (answers, mistakes, longest run of
-- correct answers), kept for the end-of-chapter summary and a future profile page.
-- One row per user and lesson: repeating a lesson replaces it with the latest run.

create table public.lesson_stats (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  lesson_id bigint not null references public.lessons (id) on delete cascade,
  -- Denormalised from lessons so chapter totals need no join.
  chapter_id bigint not null references public.chapters (id) on delete cascade,
  answers integer not null check (answers between 0 and 100),
  correct integer not null check (correct between 0 and answers),
  best_streak integer not null check (best_streak between 0 and correct),
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create index lesson_stats_user_chapter_idx on public.lesson_stats (user_id, chapter_id);

revoke all on public.lesson_stats from anon, authenticated;
grant select on public.lesson_stats to authenticated;

alter table public.lesson_stats enable row level security;

create policy "lesson_stats: select own" on public.lesson_stats
  for select to authenticated
  using (user_id = (select auth.uid()));

-- Writes go only through record_lesson_stats. The quiz is graded in the browser,
-- so the numbers cannot be proven, but the function rejects impossible ones: the
-- chapter comes from the lesson, at most 100 answers, and the longest streak must
-- fit the counts (k mistakes split the correct answers into at most k + 1 runs,
-- so the longest run is at least ceil(correct / (mistakes + 1))).
create function public.record_lesson_stats(
  p_lesson_id bigint,
  p_answers integer,
  p_correct integer,
  p_best_streak integer
)
returns public.lesson_stats
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_chapter bigint;
  v_row public.lesson_stats;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  select l.chapter_id into v_chapter from public.lessons l where l.id = p_lesson_id;
  if v_chapter is null then
    raise exception 'unknown lesson: %', p_lesson_id using errcode = '22023';
  end if;
  if p_answers is null or p_correct is null or p_best_streak is null
     or p_answers not between 0 and 100
     or p_correct not between 0 and p_answers
     or p_best_streak not between 0 and p_correct
     or (p_correct > 0 and p_best_streak * (p_answers - p_correct + 1) < p_correct) then
    raise exception 'invalid stats: % answers, % correct, streak %', p_answers, p_correct, p_best_streak
      using errcode = '22023';
  end if;

  insert into public.lesson_stats as s (user_id, lesson_id, chapter_id, answers, correct, best_streak)
  values (v_user, p_lesson_id, v_chapter, p_answers, p_correct, p_best_streak)
  on conflict (user_id, lesson_id) do update set
    answers = excluded.answers,
    correct = excluded.correct,
    best_streak = excluded.best_streak,
    completed_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

revoke execute on function public.record_lesson_stats(bigint, integer, integer, integer) from public, anon;
grant execute on function public.record_lesson_stats(bigint, integer, integer, integer) to authenticated;
