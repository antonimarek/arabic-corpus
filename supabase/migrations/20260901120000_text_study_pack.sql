-- Structured lesson study pack (recall phrases, confusion moments, grammar threads).
alter table public.texts
  add column if not exists study_pack jsonb;

comment on column public.texts.study_pack is
  'Lesson study pack JSON: recall phrases, confusion moments, grammar threads, weekly plan.';
