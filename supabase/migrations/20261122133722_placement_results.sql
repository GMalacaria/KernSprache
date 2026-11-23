-- Results of the initial placement test (written + oral). Written only by the
-- placement-test Edge Function with the service role; learners can read their own.

create table public.placement_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  -- { "<question id>": <chosen option index> }
  written_answers jsonb not null,
  written_correct integer not null check (written_correct >= 0),
  written_total integer not null check (written_total > 0),
  written_level public.cefr_level not null,
  -- [{ "id": "...", "transcript": "..." }], empty when the oral part was skipped
  oral_transcripts jsonb not null default '[]',
  oral_level public.cefr_level,
  -- { "feedback_it": "...", "strengths_it": [...], "to_improve_it": [...] }
  oral_feedback jsonb,
  final_level public.cefr_level not null,
  created_at timestamptz not null default now()
);

create index placement_results_user_created_idx on public.placement_results (user_id, created_at desc);

revoke all on public.placement_results from anon, authenticated;
grant select on public.placement_results to authenticated;

alter table public.placement_results enable row level security;

create policy "placement_results: select own" on public.placement_results
  for select to authenticated
  using (user_id = (select auth.uid()));
