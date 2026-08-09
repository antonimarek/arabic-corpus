-- Personal Levantine Arabic corpus — core schema
-- Original Arabic is stored exactly. No silent normalization.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- texts
-- ---------------------------------------------------------------------------
create table public.texts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  arabic text not null,
  translation text,
  source text,
  occurred_on date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index texts_owner_id_idx on public.texts (owner_id);
create index texts_title_idx on public.texts (title);
create index texts_created_at_idx on public.texts (created_at desc);

-- ---------------------------------------------------------------------------
-- examples (text_id nullable — free-standing sentences allowed)
-- ---------------------------------------------------------------------------
create table public.examples (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  text_id uuid references public.texts (id) on delete set null,
  arabic text not null,
  translation text,
  transliteration text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index examples_owner_id_idx on public.examples (owner_id);
create index examples_text_id_idx on public.examples (text_id);

-- ---------------------------------------------------------------------------
-- vocabulary + senses (multiple meanings; lang e.g. en / pl)
-- ---------------------------------------------------------------------------
create table public.vocabulary (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  arabic text not null,
  transliteration text,
  part_of_speech text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index vocabulary_owner_id_idx on public.vocabulary (owner_id);

create table public.vocabulary_senses (
  id uuid primary key default gen_random_uuid(),
  vocabulary_id uuid not null references public.vocabulary (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  gloss text not null,
  lang text not null default 'en',
  notes text,
  created_at timestamptz not null default now()
);

create index vocabulary_senses_vocabulary_id_idx
  on public.vocabulary_senses (vocabulary_id);
create index vocabulary_senses_gloss_idx
  on public.vocabulary_senses (gloss);

-- ---------------------------------------------------------------------------
-- structures (chunks / patterns / idioms — not only formal rules)
-- ---------------------------------------------------------------------------
create table public.structures (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  arabic_form text,
  transliteration text,
  meaning text,
  explanation text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index structures_owner_id_idx on public.structures (owner_id);
create index structures_name_idx on public.structures (name);

-- ---------------------------------------------------------------------------
-- tags (free-form; no rigid taxonomy)
-- ---------------------------------------------------------------------------
create table public.tags (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (owner_id, name)
);

create index tags_owner_id_idx on public.tags (owner_id);

create table public.text_tags (
  text_id uuid not null references public.texts (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  primary key (text_id, tag_id)
);

create table public.example_tags (
  example_id uuid not null references public.examples (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  primary key (example_id, tag_id)
);

create table public.vocabulary_tags (
  vocabulary_id uuid not null references public.vocabulary (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  primary key (vocabulary_id, tag_id)
);

create table public.structure_tags (
  structure_id uuid not null references public.structures (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  primary key (structure_id, tag_id)
);

-- ---------------------------------------------------------------------------
-- graph joins
-- ---------------------------------------------------------------------------
create table public.example_vocabulary (
  example_id uuid not null references public.examples (id) on delete cascade,
  vocabulary_id uuid not null references public.vocabulary (id) on delete cascade,
  primary key (example_id, vocabulary_id)
);

create table public.example_structures (
  example_id uuid not null references public.examples (id) on delete cascade,
  structure_id uuid not null references public.structures (id) on delete cascade,
  primary key (example_id, structure_id)
);

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger texts_set_updated_at
  before update on public.texts
  for each row execute function public.set_updated_at();

create trigger examples_set_updated_at
  before update on public.examples
  for each row execute function public.set_updated_at();

create trigger vocabulary_set_updated_at
  before update on public.vocabulary
  for each row execute function public.set_updated_at();

create trigger structures_set_updated_at
  before update on public.structures
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS — single-owner personal app
-- ---------------------------------------------------------------------------
alter table public.texts enable row level security;
alter table public.examples enable row level security;
alter table public.vocabulary enable row level security;
alter table public.vocabulary_senses enable row level security;
alter table public.structures enable row level security;
alter table public.tags enable row level security;
alter table public.text_tags enable row level security;
alter table public.example_tags enable row level security;
alter table public.vocabulary_tags enable row level security;
alter table public.structure_tags enable row level security;
alter table public.example_vocabulary enable row level security;
alter table public.example_structures enable row level security;

create policy "texts_owner_all"
  on public.texts for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "examples_owner_all"
  on public.examples for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "vocabulary_owner_all"
  on public.vocabulary for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "vocabulary_senses_owner_all"
  on public.vocabulary_senses for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "structures_owner_all"
  on public.structures for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "tags_owner_all"
  on public.tags for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- Join tables: allow if the related owned entity belongs to the user
create policy "text_tags_owner_all"
  on public.text_tags for all
  using (
    exists (
      select 1 from public.texts t
      where t.id = text_id and t.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.texts t
      where t.id = text_id and t.owner_id = auth.uid()
    )
  );

create policy "example_tags_owner_all"
  on public.example_tags for all
  using (
    exists (
      select 1 from public.examples e
      where e.id = example_id and e.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.examples e
      where e.id = example_id and e.owner_id = auth.uid()
    )
  );

create policy "vocabulary_tags_owner_all"
  on public.vocabulary_tags for all
  using (
    exists (
      select 1 from public.vocabulary v
      where v.id = vocabulary_id and v.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.vocabulary v
      where v.id = vocabulary_id and v.owner_id = auth.uid()
    )
  );

create policy "structure_tags_owner_all"
  on public.structure_tags for all
  using (
    exists (
      select 1 from public.structures s
      where s.id = structure_id and s.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.structures s
      where s.id = structure_id and s.owner_id = auth.uid()
    )
  );

create policy "example_vocabulary_owner_all"
  on public.example_vocabulary for all
  using (
    exists (
      select 1 from public.examples e
      where e.id = example_id and e.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.examples e
      where e.id = example_id and e.owner_id = auth.uid()
    )
  );

create policy "example_structures_owner_all"
  on public.example_structures for all
  using (
    exists (
      select 1 from public.examples e
      where e.id = example_id and e.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.examples e
      where e.id = example_id and e.owner_id = auth.uid()
    )
  );
