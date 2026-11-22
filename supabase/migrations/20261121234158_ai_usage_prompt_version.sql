-- Track which prompt version produced each AI call, to compare cost and quality.
alter table public.ai_usage add column prompt_version text;
