-- Why the learner studies English: steers dialogue situations, vocabulary and lesson examples.
-- One purpose per learner; `goal` (free text, already present) adds details in their own words.

create type public.learning_purpose as enum ('leisure', 'travel', 'work', 'love');

alter table public.profiles
  add column purpose public.learning_purpose,
  -- Set when the first-run questions (purpose, daily goal, placement test) are done.
  add column onboarded_at timestamptz;
