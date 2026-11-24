-- A lesson has two parts, written and oral, and is completed only when both are done,
-- so that neither skill is skipped. lesson_progress now also holds a lesson in progress:
-- one row per learner and lesson, with the time each part was finished and its answers.
--   written_done_at / oral_done_at  when each part was finished
--   written_stats / oral_stats      {"answers", "correct", "best_streak"} of that part
--   completed_at / score            set when the second part is done (score over both parts)
alter table public.lesson_progress
  alter column completed_at drop not null,
  alter column completed_at drop default,
  alter column score drop not null,
  add column written_done_at timestamptz,
  add column oral_done_at timestamptz,
  add column written_stats jsonb,
  add column oral_stats jsonb;

-- Lessons completed before the split count as done in both parts.
update public.lesson_progress
  set written_done_at = completed_at, oral_done_at = completed_at
  where completed_at is not null;

alter table public.lesson_progress
  add constraint lesson_progress_completed_needs_both_parts
    check (completed_at is null or (written_done_at is not null and oral_done_at is not null)),
  add constraint lesson_progress_completed_has_score
    check ((completed_at is null) = (score is null));
