-- Cache of synthesised speech: one audio file per (voice, sentence), shared by everyone,
-- so a sentence that comes back is not generated again. Only the `speak` function
-- (service role) reads and writes: the table has RLS on and no policies, and the
-- storage bucket is private (clients get short-lived signed URLs from the function).
create table public.tts_cache (
  key text primary key, -- sha256 of voice + normalised text
  text text not null,
  voice text not null,
  path text not null,
  created_at timestamptz not null default now()
);

alter table public.tts_cache enable row level security;

insert into storage.buckets (id, name, public)
values ('tts', 'tts', false)
on conflict (id) do nothing;
