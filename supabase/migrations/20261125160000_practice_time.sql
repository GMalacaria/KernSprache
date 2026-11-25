-- The daily goal now counts only the path (lessons and chapter tests). Review and free dialogue are
-- extra practice: their time is still saved per day, for future statistics, but it never completes
-- the goal. add_study_time is unchanged (written/oral halves of the goal); add_practice_time adds the
-- practice seconds and leaves completed_at alone.
create type public.practice_kind as enum ('review', 'dialogue');

alter table public.study_days
  add column review_seconds integer not null default 0 check (review_seconds >= 0),
  add column dialogue_seconds integer not null default 0 check (dialogue_seconds >= 0);

create function public.add_practice_time(p_day date, p_kind public.practice_kind, p_seconds integer)
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
  -- Same limits as add_study_time: small chunks, only around today.
  if p_seconds < 0 or p_seconds > 120 then
    raise exception 'invalid seconds: %', p_seconds using errcode = '22023';
  end if;
  if p_day not between current_date - 1 and current_date + 1 then
    raise exception 'invalid day: %', p_day using errcode = '22023';
  end if;

  insert into public.study_days as d (user_id, day, goal_minutes, review_seconds, dialogue_seconds)
  select
    v_user,
    p_day,
    p.daily_goal_minutes,
    case when p_kind = 'review' then p_seconds else 0 end,
    case when p_kind = 'dialogue' then p_seconds else 0 end
  from public.profiles p
  where p.id = v_user
  on conflict (user_id, day) do update set
    review_seconds = d.review_seconds + case when p_kind = 'review' then p_seconds else 0 end,
    dialogue_seconds = d.dialogue_seconds + case when p_kind = 'dialogue' then p_seconds else 0 end
  returning * into v_row;

  return v_row;
end;
$$;

revoke execute on function public.add_practice_time(date, public.practice_kind, integer) from public, anon;
grant execute on function public.add_practice_time(date, public.practice_kind, integer) to authenticated;
