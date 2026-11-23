-- Daily reminders: Web Push subscriptions can be taken over by whoever is signed in
-- on the device, a log keeps at most one reminder per user and local day, and pg_cron
-- calls the send-reminders Edge Function every hour.

-- ---------------------------------------------------------------------------
-- Register a subscription (a browser keeps its endpoint across accounts)
-- ---------------------------------------------------------------------------
create or replace function public.register_push_subscription(p_endpoint text, p_p256dh text, p_auth text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth)
  on conflict (endpoint) do update
    set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth;
end;
$$;

revoke all on function public.register_push_subscription(text, text, text) from public, anon;
grant execute on function public.register_push_subscription(text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- reminder_log: one reminder per user and local day (service role only)
-- ---------------------------------------------------------------------------
create table public.reminder_log (
  user_id uuid not null references auth.users (id) on delete cascade,
  -- Local day of the learner (profiles.timezone) the reminder was sent for.
  day date not null,
  -- streak | due_reviews | daily_goal
  kind text not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, day)
);

revoke all on public.reminder_log from anon, authenticated;
alter table public.reminder_log enable row level security;

-- ---------------------------------------------------------------------------
-- Hourly schedule. The project URL and a shared secret live in Vault:
--   select vault.create_secret('https://<ref>.supabase.co', 'project_url');
--   select vault.create_secret('<random string>', 'reminders_secret');
-- (the same random string is the CRON_SECRET of the function). Without them the job does nothing.
-- ---------------------------------------------------------------------------
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

create or replace function public.call_send_reminders()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  base_url text;
  cron_secret text;
begin
  select decrypted_secret into base_url from vault.decrypted_secrets where name = 'project_url';
  select decrypted_secret into cron_secret from vault.decrypted_secrets where name = 'reminders_secret';
  if base_url is null or cron_secret is null then
    return;
  end if;
  perform net.http_post(
    url := base_url || '/functions/v1/send-reminders',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', cron_secret),
    body := '{}'::jsonb,
    timeout_milliseconds := 55000
  );
end;
$$;

revoke all on function public.call_send_reminders() from public, anon, authenticated;

select cron.schedule('send-reminders', '0 * * * *', 'select public.call_send_reminders()');
