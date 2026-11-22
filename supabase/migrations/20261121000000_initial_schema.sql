-- Initial schema: profiles, curriculum, sessions, mistakes, vocabulary (FSRS),
-- push subscriptions and AI usage tracking. RLS is enabled on every table.

-- ---------------------------------------------------------------------------
-- Enum types
-- ---------------------------------------------------------------------------
create type public.cefr_level as enum ('A1', 'A2', 'B1', 'B2');

create type public.session_kind as enum ('lesson', 'dialogue', 'review');

create type public.mistake_category as enum (
  'verb_tense',
  'article',
  'preposition',
  'word_order',
  'vocabulary',
  'spelling',
  'other'
);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  level public.cefr_level not null default 'A1',
  goal text,
  reminder_time time not null default '19:00',
  timezone text not null default 'Europe/Rome',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Create a profile automatically when a user signs up.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- curriculum_topics (shared reference data, read-only for users)
-- ---------------------------------------------------------------------------
create table public.curriculum_topics (
  id bigint generated always as identity primary key,
  level public.cefr_level not null,
  sort_order integer not null,
  slug text not null unique,
  title text not null,
  unique (level, sort_order)
);

-- ---------------------------------------------------------------------------
-- sessions
-- ---------------------------------------------------------------------------
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  topic_id bigint references public.curriculum_topics (id) on delete set null,
  kind public.session_kind not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  -- Lets child tables reference (id, user_id) so a row can only point
  -- to a session owned by the same user.
  unique (id, user_id),
  check (ended_at is null or ended_at >= started_at)
);

create index sessions_user_started_idx on public.sessions (user_id, started_at desc);

-- ---------------------------------------------------------------------------
-- mistakes
-- ---------------------------------------------------------------------------
create table public.mistakes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  session_id uuid,
  original text not null,
  corrected text not null,
  explanation_it text not null,
  category public.mistake_category not null default 'other',
  created_at timestamptz not null default now(),
  foreign key (session_id, user_id)
    references public.sessions (id, user_id)
    on delete set null (session_id)
);

create index mistakes_user_created_idx on public.mistakes (user_id, created_at desc);
create index mistakes_session_idx on public.mistakes (session_id);

-- ---------------------------------------------------------------------------
-- vocab_items (FSRS card fields mirror ts-fsrs `Card`)
-- ---------------------------------------------------------------------------
create table public.vocab_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  en text not null,
  it text not null,
  -- FSRS state
  due timestamptz not null default now(),
  stability double precision not null default 0,
  difficulty double precision not null default 0,
  elapsed_days integer not null default 0,
  scheduled_days integer not null default 0,
  learning_steps integer not null default 0,
  reps integer not null default 0,
  lapses integer not null default 0,
  -- 0 = New, 1 = Learning, 2 = Review, 3 = Relearning
  state smallint not null default 0 check (state between 0 and 3),
  last_review timestamptz,
  created_at timestamptz not null default now()
);

create unique index vocab_items_user_en_key on public.vocab_items (user_id, lower(en));
create index vocab_items_user_due_idx on public.vocab_items (user_id, due);

-- ---------------------------------------------------------------------------
-- push_subscriptions (Web Push)
-- ---------------------------------------------------------------------------
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

-- ---------------------------------------------------------------------------
-- ai_usage (token accounting, written by Edge Functions)
-- ---------------------------------------------------------------------------
create table public.ai_usage (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete set null,
  function_name text not null,
  model text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cache_creation_input_tokens integer not null default 0,
  cache_read_input_tokens integer not null default 0,
  created_at timestamptz not null default now()
);

create index ai_usage_created_idx on public.ai_usage (created_at desc);

-- ---------------------------------------------------------------------------
-- Grants: nothing for anonymous users; authenticated users get only what
-- the policies below allow. Edge Functions use the service role (bypasses RLS).
-- ---------------------------------------------------------------------------
revoke all on
  public.profiles,
  public.curriculum_topics,
  public.sessions,
  public.mistakes,
  public.vocab_items,
  public.push_subscriptions,
  public.ai_usage
from anon, authenticated;

grant select, update on public.profiles to authenticated;
grant select on public.curriculum_topics to authenticated;
grant select, insert, update, delete on public.sessions to authenticated;
grant select, insert, update, delete on public.mistakes to authenticated;
grant select, insert, update, delete on public.vocab_items to authenticated;
grant select, insert, delete on public.push_subscriptions to authenticated;
grant select on public.ai_usage to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.curriculum_topics enable row level security;
alter table public.sessions enable row level security;
alter table public.mistakes enable row level security;
alter table public.vocab_items enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.ai_usage enable row level security;

-- profiles: rows are created by the signup trigger, never by the client.
create policy "profiles: select own" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

create policy "profiles: update own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- curriculum_topics: readable by every signed-in user.
create policy "curriculum_topics: read" on public.curriculum_topics
  for select to authenticated
  using (true);

-- Per-user tables: full access to own rows only.
create policy "sessions: own rows" on public.sessions
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "mistakes: own rows" on public.mistakes
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "vocab_items: own rows" on public.vocab_items
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "push_subscriptions: own rows" on public.push_subscriptions
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "ai_usage: select own" on public.ai_usage
  for select to authenticated
  using (user_id = (select auth.uid()));
