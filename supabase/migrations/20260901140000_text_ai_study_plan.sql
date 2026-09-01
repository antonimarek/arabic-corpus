-- Pasted AI-generated study plan (markdown), separate from heuristic study_pack.
alter table public.texts
  add column if not exists ai_study_plan text;

comment on column public.texts.ai_study_plan is
  'User-pasted markdown study plan from external AI review (ChatGPT, Claude, etc.).';
