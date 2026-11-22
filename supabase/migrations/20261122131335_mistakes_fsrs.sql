-- Mistakes become review cards too: same FSRS fields as vocab_items (ts-fsrs `Card`).
-- Access is unchanged: the existing "mistakes: own rows" policy covers the new columns.
alter table public.mistakes
  add column due timestamptz not null default now(),
  add column stability double precision not null default 0,
  add column difficulty double precision not null default 0,
  add column elapsed_days integer not null default 0,
  add column scheduled_days integer not null default 0,
  add column learning_steps integer not null default 0,
  add column reps integer not null default 0,
  add column lapses integer not null default 0,
  -- 0 = New, 1 = Learning, 2 = Review, 3 = Relearning
  add column state smallint not null default 0 check (state between 0 and 3),
  add column last_review timestamptz;

create index mistakes_user_due_idx on public.mistakes (user_id, due);
