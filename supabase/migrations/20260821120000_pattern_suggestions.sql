-- Pattern suggestions from deterministic detectors (user validates before morph_patterns).

create table public.pattern_suggestions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'dismissed')),
  detector_id text not null,
  detector_version text not null,
  name text not null,
  arabic_sketch text,
  form_label text,
  cue text,
  meaning_shift text,
  ai_interpretation text,
  confidence text not null default 'medium'
    check (confidence in ('low', 'medium', 'high')),
  signals jsonb not null default '{}'::jsonb,
  reasoning text,
  fingerprint text not null,
  source text not null default 'deterministic'
    check (source in ('deterministic', 'hybrid', 'llm')),
  payload jsonb not null default '{}'::jsonb,
  confirmed_pattern_id uuid references public.morph_patterns (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, fingerprint)
);

create index pattern_suggestions_owner_status_idx
  on public.pattern_suggestions (owner_id, status);
create index pattern_suggestions_owner_updated_idx
  on public.pattern_suggestions (owner_id, updated_at desc);

create trigger pattern_suggestions_set_updated_at
  before update on public.pattern_suggestions
  for each row execute function public.set_updated_at();

alter table public.pattern_suggestions enable row level security;

create policy "pattern_suggestions_owner_all"
  on public.pattern_suggestions for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
