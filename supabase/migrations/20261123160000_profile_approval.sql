-- New accounts must be approved by the owner before they can use the app (and spend
-- AI credit). The Edge Functions refuse unapproved users; the owner approves from the
-- Supabase dashboard (Table Editor > profiles > approved).

alter table public.profiles add column approved boolean not null default false;

-- Everyone who exists today keeps access.
update public.profiles set approved = true;

-- The first account is approved automatically (the owner on a fresh database, e.g. local
-- development); every later account waits for approval.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, approved)
  values (new.id, not exists (select 1 from public.profiles where approved));
  return new;
end;
$$;

-- A signed-in learner can update their own profile (RLS) but never their own approval.
-- The dashboard and the service role have no auth.uid(), so they can change it.
create function public.protect_profile_approval()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.approved is distinct from old.approved and auth.uid() is not null then
    raise exception 'approval can only be changed by the owner' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger profiles_protect_approval
  before update of approved on public.profiles
  for each row execute function public.protect_profile_approval();
