-- ts-fsrs 6 no longer uses `elapsed_days` (it is derived from last_review when needed),
-- and nothing reads or writes it: drop it from both review-card tables.
alter table public.vocab_items drop column elapsed_days;
alter table public.mistakes drop column elapsed_days;
