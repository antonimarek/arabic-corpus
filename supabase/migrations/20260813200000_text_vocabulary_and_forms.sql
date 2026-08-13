-- Per-text focus vocabulary + learner-curated surface forms.
-- Original Arabic stays exact. Search keys use normalize_arabic.

-- ---------------------------------------------------------------------------
-- text_vocabulary (this text exists to teach these words)
-- ---------------------------------------------------------------------------
create table public.text_vocabulary (
  text_id uuid not null references public.texts (id) on delete cascade,
  vocabulary_id uuid not null references public.vocabulary (id) on delete cascade,
  role text not null default 'focus',
  created_at timestamptz not null default now(),
  primary key (text_id, vocabulary_id),
  constraint text_vocabulary_role_check check (role in ('focus'))
);

create index text_vocabulary_vocabulary_id_idx
  on public.text_vocabulary (vocabulary_id);

alter table public.text_vocabulary enable row level security;

create policy "text_vocabulary_owner_all"
  on public.text_vocabulary for all
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

insert into public.text_vocabulary (text_id, vocabulary_id, role)
select distinct e.text_id, ev.vocabulary_id, 'focus'
from public.example_vocabulary ev
inner join public.examples e on e.id = ev.example_id
where e.text_id is not null
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- vocabulary_forms (surface variants; dialect truth, not a stemmer)
-- ---------------------------------------------------------------------------
create table public.vocabulary_forms (
  id uuid primary key default gen_random_uuid(),
  vocabulary_id uuid not null references public.vocabulary (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  arabic text not null,
  search_arabic text generated always as (public.normalize_arabic(arabic)) stored,
  created_at timestamptz not null default now()
);

create unique index vocabulary_forms_vocab_search_idx
  on public.vocabulary_forms (vocabulary_id, search_arabic);

create unique index vocabulary_forms_owner_search_idx
  on public.vocabulary_forms (owner_id, search_arabic);

create index vocabulary_forms_search_arabic_idx
  on public.vocabulary_forms (search_arabic);

alter table public.vocabulary_forms enable row level security;

create policy "vocabulary_forms_owner_all"
  on public.vocabulary_forms for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
