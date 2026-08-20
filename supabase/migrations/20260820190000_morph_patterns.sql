-- Morphological patterns (word-formation moves). Distinct from structures (chunks/idioms).

create table public.morph_patterns (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  arabic_sketch text,
  form_label text,
  meaning_shift text,
  cue text,
  notes text,
  mastery_state text not null default 'noticed'
    check (mastery_state in ('noticed', 'recognizing', 'using')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index morph_patterns_owner_id_idx on public.morph_patterns (owner_id);
create index morph_patterns_updated_at_idx
  on public.morph_patterns (updated_at desc);

create table public.pattern_vocabulary (
  pattern_id uuid not null references public.morph_patterns (id) on delete cascade,
  vocabulary_id uuid not null references public.vocabulary (id) on delete cascade,
  role text not null default 'related'
    check (role in ('base', 'derived', 'related')),
  created_at timestamptz not null default now(),
  primary key (pattern_id, vocabulary_id)
);

create index pattern_vocabulary_vocabulary_id_idx
  on public.pattern_vocabulary (vocabulary_id);

create trigger morph_patterns_set_updated_at
  before update on public.morph_patterns
  for each row execute function public.set_updated_at();

alter table public.morph_patterns enable row level security;
alter table public.pattern_vocabulary enable row level security;

create policy "morph_patterns_owner_all"
  on public.morph_patterns for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "pattern_vocabulary_owner_all"
  on public.pattern_vocabulary for all
  using (
    exists (
      select 1 from public.morph_patterns p
      where p.id = pattern_id and p.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.morph_patterns p
      where p.id = pattern_id and p.owner_id = auth.uid()
    )
  );
