-- Lesson content shared between learners (PLAN-multilingua.md, PR 5). A lesson is generated once per native
-- language, purpose and prompt version and reused by everyone with the same ones: the prompt holds no data of a
-- single learner. Only the `lesson` function (service role) reads and writes it.
-- lesson_contents (one copy per learner) stays for one release: the chapter test and older clients read it.

create table public.lesson_content_cache (
  lesson_id bigint not null references public.lessons (id) on delete cascade,
  native_language public.language_code not null,
  purpose public.learning_purpose,
  prompt_version text not null,
  -- Null while a request is generating it.
  content jsonb,
  -- A generation in progress holds the row until then; after it another request may take over.
  generating_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lesson_content_cache_key unique nulls not distinct (lesson_id, native_language, purpose, prompt_version)
);

create trigger lesson_content_cache_set_updated_at
  before update on public.lesson_content_cache
  for each row execute function public.set_updated_at();

revoke all on public.lesson_content_cache from anon, authenticated;
alter table public.lesson_content_cache enable row level security;
-- No policies: learners never read it directly.

-- Claims the generation of a lesson: true when the caller should generate it (no row yet, or a previous
-- generation stalled), false when the content exists or another request is generating it right now.
create function public.claim_lesson_generation(
  p_lesson_id bigint,
  p_native_language public.language_code,
  p_purpose public.learning_purpose,
  p_prompt_version text,
  p_seconds integer default 120
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  claimed boolean;
begin
  insert into public.lesson_content_cache as c (lesson_id, native_language, purpose, prompt_version, generating_until)
  values (p_lesson_id, p_native_language, p_purpose, p_prompt_version, now() + make_interval(secs => p_seconds))
  on conflict on constraint lesson_content_cache_key do update
    set generating_until = excluded.generating_until
    where c.content is null and (c.generating_until is null or c.generating_until < now())
  returning true into claimed;
  return coalesce(claimed, false);
end;
$$;

revoke execute on function public.claim_lesson_generation(bigint, public.language_code, public.learning_purpose, text, integer)
  from public, anon, authenticated;
