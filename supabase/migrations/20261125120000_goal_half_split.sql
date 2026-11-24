-- The daily goal now needs both skills: a day is completed only when at least half of
-- the goal was spent on written work AND half on oral work (with 20 minutes: 10 + 10;
-- 18 + 2 is not enough), so that neither is skipped. The total is still recorded.
-- Days already completed keep their completed_at. Same signature, so grants are kept.
create or replace function public.add_study_time(p_day date, p_mode public.study_mode, p_seconds integer)
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

  -- Half of the goal in seconds is goal_minutes * 30, for each of the two halves.
  if v_row.completed_at is null
     and v_row.written_seconds >= v_row.goal_minutes * 30
     and v_row.oral_seconds >= v_row.goal_minutes * 30 then
    update public.study_days
      set completed_at = now()
      where user_id = v_user and day = p_day
      returning * into v_row;
  end if;

  return v_row;
end;
$$;
