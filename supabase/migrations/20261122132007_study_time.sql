-- Daily study goal and active study time, split between written and oral practice.

alter table public.profiles
  add column daily_goal_minutes integer not null default 20
    check (daily_goal_minutes between 5 and 120);

create type public.study_mode as enum ('written', 'oral');

-- One row per user and local day (in the user's timezone, computed by the client).
create table public.study_days (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day date not null,
  -- Snapshot of the goal when the day started, so changing it later does not rewrite history.
  goal_minutes integer not null check (goal_minutes between 5 and 120),
  written_seconds integer not null default 0 check (written_seconds >= 0),
  oral_seconds integer not null default 0 check (oral_seconds >= 0),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

create trigger study_days_set_updated_at
  before update on public.study_days
  for each row execute function public.set_updated_at();

revoke all on public.study_days from anon, authenticated;
grant select on public.study_days to authenticated;

alter table public.study_days enable row level security;

create policy "study_days: select own" on public.study_days
  for select to authenticated
  using (user_id = (select auth.uid()));

-- Writes go only through add_study_time: atomic increments, bounded per call,
-- and completed_at set by the server when the goal is reached.
create function public.add_study_time(p_day date, p_mode public.study_mode, p_seconds integer)
returns public.study_days
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_row public.study_days;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  -- The client flushes every few seconds; a larger chunk means a bug or tampering.
  if p_seconds < 0 or p_seconds > 120 then
    raise exception 'invalid seconds: %', p_seconds using errcode = '22023';
  end if;
  -- Accept only today or yesterday (timezone edges), never arbitrary days.
  if p_day not between current_date - 1 and current_date + 1 then
    raise exception 'invalid day: %', p_day using errcode = '22023';
  end if;

  insert into public.study_days as d (user_id, day, goal_minutes, written_seconds, oral_seconds)
  select
    v_user,
    p_day,
    p.daily_goal_minutes,
    case when p_mode = 'written' then p_seconds else 0 end,
    case when p_mode = 'oral' then p_seconds else 0 end
  from public.profiles p
  where p.id = v_user
  on conflict (user_id, day) do update set
    written_seconds = d.written_seconds + case when p_mode = 'written' then p_seconds else 0 end,
    oral_seconds = d.oral_seconds + case when p_mode = 'oral' then p_seconds else 0 end
  returning * into v_row;

  if v_row.completed_at is null
     and v_row.written_seconds + v_row.oral_seconds >= v_row.goal_minutes * 60 then
    update public.study_days
      set completed_at = now()
      where user_id = v_user and day = p_day
      returning * into v_row;
  end if;

  return v_row;
end;
$$;

revoke execute on function public.add_study_time(date, public.study_mode, integer) from public, anon;
grant execute on function public.add_study_time(date, public.study_mode, integer) to authenticated;
