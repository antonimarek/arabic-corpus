-- Phase 3: search intelligence
-- L2 fuzzy (pg_trgm) + derived normalized search columns (originals untouched)
-- Miss logging + optional L3 vector columns (embeddings filled later)

create extension if not exists pg_trgm;
create extension if not exists vector;

-- ---------------------------------------------------------------------------
-- Normalization helpers (immutable → safe for generated columns)
-- ---------------------------------------------------------------------------
create or replace function public.normalize_arabic(input text)
returns text
language sql
immutable
parallel safe
as $$
  select case
    when input is null then null
    else lower(
      translate(
        regexp_replace(input, E'[\u064B-\u065F\u0670\u06D6-\u06ED]', '', 'g'),
        'أإآٱةى',
        'ااااهي'
      )
    )
  end;
$$;

create or replace function public.normalize_latin(input text)
returns text
language sql
immutable
parallel safe
as $$
  select case
    when input is null then null
    else lower(trim(regexp_replace(input, E'\\s+', ' ', 'g')))
  end;
$$;

-- ---------------------------------------------------------------------------
-- Derived search columns (original arabic / title / gloss stay exact)
-- ---------------------------------------------------------------------------
alter table public.texts
  add column if not exists search_arabic text
    generated always as (public.normalize_arabic(arabic)) stored,
  add column if not exists search_latin text
    generated always as (
      public.normalize_latin(
        coalesce(title, '') || ' ' || coalesce(translation, '')
      )
    ) stored,
  add column if not exists embedding vector(1536);

alter table public.examples
  add column if not exists search_arabic text
    generated always as (public.normalize_arabic(arabic)) stored,
  add column if not exists search_latin text
    generated always as (
      public.normalize_latin(
        coalesce(transliteration, '') || ' ' || coalesce(translation, '')
      )
    ) stored,
  add column if not exists embedding vector(1536);

alter table public.vocabulary
  add column if not exists search_arabic text
    generated always as (public.normalize_arabic(arabic)) stored,
  add column if not exists search_latin text
    generated always as (public.normalize_latin(transliteration)) stored,
  add column if not exists embedding vector(1536);

alter table public.structures
  add column if not exists search_arabic text
    generated always as (public.normalize_arabic(arabic_form)) stored,
  add column if not exists search_latin text
    generated always as (
      public.normalize_latin(
        coalesce(name, '') || ' ' || coalesce(transliteration, '') || ' ' || coalesce(meaning, '')
      )
    ) stored,
  add column if not exists embedding vector(1536);

alter table public.vocabulary_senses
  add column if not exists search_gloss text
    generated always as (public.normalize_latin(gloss)) stored;

-- ---------------------------------------------------------------------------
-- Trigram indexes
-- ---------------------------------------------------------------------------
create index if not exists texts_search_arabic_trgm_idx
  on public.texts using gin (search_arabic gin_trgm_ops);
create index if not exists texts_search_latin_trgm_idx
  on public.texts using gin (search_latin gin_trgm_ops);

create index if not exists examples_search_arabic_trgm_idx
  on public.examples using gin (search_arabic gin_trgm_ops);
create index if not exists examples_search_latin_trgm_idx
  on public.examples using gin (search_latin gin_trgm_ops);

create index if not exists vocabulary_search_arabic_trgm_idx
  on public.vocabulary using gin (search_arabic gin_trgm_ops);
create index if not exists vocabulary_search_latin_trgm_idx
  on public.vocabulary using gin (search_latin gin_trgm_ops);

create index if not exists structures_search_arabic_trgm_idx
  on public.structures using gin (search_arabic gin_trgm_ops);
create index if not exists structures_search_latin_trgm_idx
  on public.structures using gin (search_latin gin_trgm_ops);

create index if not exists vocabulary_senses_search_gloss_trgm_idx
  on public.vocabulary_senses using gin (search_gloss gin_trgm_ops);

-- Vector indexes (useful once embeddings exist; IVFFlat needs rows — create HNSW)
create index if not exists texts_embedding_idx
  on public.texts using hnsw (embedding vector_cosine_ops);
create index if not exists examples_embedding_idx
  on public.examples using hnsw (embedding vector_cosine_ops);
create index if not exists vocabulary_embedding_idx
  on public.vocabulary using hnsw (embedding vector_cosine_ops);
create index if not exists structures_embedding_idx
  on public.structures using hnsw (embedding vector_cosine_ops);

-- ---------------------------------------------------------------------------
-- Miss logs
-- ---------------------------------------------------------------------------
create table if not exists public.search_misses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  query text not null,
  layers_tried text[] not null default array['exact', 'fuzzy'],
  created_at timestamptz not null default now()
);

create index if not exists search_misses_owner_created_idx
  on public.search_misses (owner_id, created_at desc);
create index if not exists search_misses_query_trgm_idx
  on public.search_misses using gin (query gin_trgm_ops);

alter table public.search_misses enable row level security;

create policy "search_misses_owner_all"
  on public.search_misses for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Scoring helper
-- ---------------------------------------------------------------------------
create or replace function public.search_field_score(
  q_norm text,
  value text,
  exact_weight float,
  fuzzy_threshold float
)
returns table (score float, match_label text, match_layer text)
language sql
immutable
parallel safe
as $$
  select *
  from (
    select
      case
        when value is null or q_norm is null or length(q_norm) = 0 then 0::float
        when value = q_norm then exact_weight + 100
        when value like q_norm || '%' then exact_weight + 40
        when value like '%' || q_norm || '%' then exact_weight
        when similarity(value, q_norm) >= fuzzy_threshold
          then exact_weight * 0.35 + similarity(value, q_norm) * 55
        else 0::float
      end as score,
      case
        when value is null or q_norm is null or length(q_norm) = 0 then null
        when value = q_norm then 'exact'
        when value like q_norm || '%' then 'prefix'
        when value like '%' || q_norm || '%' then 'contains'
        when similarity(value, q_norm) >= fuzzy_threshold then 'fuzzy'
        else null
      end as match_label,
      case
        when value is null or q_norm is null or length(q_norm) = 0 then null
        when value = q_norm
          or value like q_norm || '%'
          or value like '%' || q_norm || '%' then 'exact'
        when similarity(value, q_norm) >= fuzzy_threshold then 'fuzzy'
        else null
      end as match_layer
  ) scored
  where scored.score > 0;
$$;

-- ---------------------------------------------------------------------------
-- L1 + L2 corpus search (RLS via security invoker)
-- ---------------------------------------------------------------------------
create or replace function public.search_corpus(
  search_query text,
  result_limit int default 40,
  fuzzy_threshold float default 0.22
)
returns table (
  entity_type text,
  entity_id uuid,
  title text,
  arabic text,
  subtitle text,
  score float,
  match_label text,
  match_layer text,
  context text[]
)
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  q text := trim(search_query);
  q_ar text;
  q_la text;
begin
  if q is null or length(q) = 0 then
    return;
  end if;

  q_ar := public.normalize_arabic(q);
  q_la := public.normalize_latin(q);

  return query
  with candidates as (
    -- texts
    select
      'text'::text as entity_type,
      t.id as entity_id,
      t.title,
      left(t.arabic, 180) as arabic,
      t.translation as subtitle,
      greatest(
        coalesce((select s.score from public.search_field_score(q_ar, t.search_arabic, 50, fuzzy_threshold) s limit 1), 0),
        coalesce((select s.score from public.search_field_score(q_la, t.search_latin, 70, fuzzy_threshold) s limit 1), 0),
        coalesce((select s.score from public.search_field_score(q_la, public.normalize_latin(t.title), 80, fuzzy_threshold) s limit 1), 0)
      ) as score,
      coalesce(
        (select s.match_label from public.search_field_score(q_la, public.normalize_latin(t.title), 80, fuzzy_threshold) s limit 1),
        (select s.match_label from public.search_field_score(q_ar, t.search_arabic, 50, fuzzy_threshold) s limit 1),
        (select s.match_label from public.search_field_score(q_la, t.search_latin, 70, fuzzy_threshold) s limit 1)
      ) as match_label,
      coalesce(
        (select s.match_layer from public.search_field_score(q_la, public.normalize_latin(t.title), 80, fuzzy_threshold) s limit 1),
        (select s.match_layer from public.search_field_score(q_ar, t.search_arabic, 50, fuzzy_threshold) s limit 1),
        (select s.match_layer from public.search_field_score(q_la, t.search_latin, 70, fuzzy_threshold) s limit 1)
      ) as match_layer,
      array_remove(array[t.source], null) as context
    from public.texts t
    where t.owner_id = auth.uid()

    union all

    -- examples
    select
      'example'::text,
      e.id,
      e.arabic,
      e.arabic,
      coalesce(e.translation, e.transliteration),
      greatest(
        coalesce((select s.score from public.search_field_score(q_ar, e.search_arabic, 70, fuzzy_threshold) s limit 1), 0),
        coalesce((select s.score from public.search_field_score(q_la, e.search_latin, 60, fuzzy_threshold) s limit 1), 0)
      ),
      coalesce(
        (select s.match_label from public.search_field_score(q_ar, e.search_arabic, 70, fuzzy_threshold) s limit 1),
        (select s.match_label from public.search_field_score(q_la, e.search_latin, 60, fuzzy_threshold) s limit 1)
      ),
      coalesce(
        (select s.match_layer from public.search_field_score(q_ar, e.search_arabic, 70, fuzzy_threshold) s limit 1),
        (select s.match_layer from public.search_field_score(q_la, e.search_latin, 60, fuzzy_threshold) s limit 1)
      ),
      array_remove(
        array[
          (select tx.title from public.texts tx where tx.id = e.text_id)
        ],
        null
      )
    from public.examples e
    where e.owner_id = auth.uid()

    union all

    -- vocabulary
    select
      'vocabulary'::text,
      v.id,
      v.arabic,
      v.arabic,
      (
        select vs.gloss || ' (' || vs.lang || ')'
        from public.vocabulary_senses vs
        where vs.vocabulary_id = v.id
        order by vs.created_at
        limit 1
      ),
      greatest(
        coalesce((select s.score from public.search_field_score(q_ar, v.search_arabic, 90, fuzzy_threshold) s limit 1), 0),
        coalesce((select s.score from public.search_field_score(q_la, v.search_latin, 75, fuzzy_threshold) s limit 1), 0),
        coalesce((
          select max(s.score)
          from public.vocabulary_senses vs
          cross join lateral public.search_field_score(q_la, vs.search_gloss, 70, fuzzy_threshold) s
          where vs.vocabulary_id = v.id
        ), 0)
      ),
      coalesce(
        (select s.match_label from public.search_field_score(q_ar, v.search_arabic, 90, fuzzy_threshold) s limit 1),
        (select s.match_label from public.search_field_score(q_la, v.search_latin, 75, fuzzy_threshold) s limit 1),
        'gloss'
      ),
      coalesce(
        (select s.match_layer from public.search_field_score(q_ar, v.search_arabic, 90, fuzzy_threshold) s limit 1),
        (select s.match_layer from public.search_field_score(q_la, v.search_latin, 75, fuzzy_threshold) s limit 1),
        (
          select s.match_layer
          from public.vocabulary_senses vs
          cross join lateral public.search_field_score(q_la, vs.search_gloss, 70, fuzzy_threshold) s
          where vs.vocabulary_id = v.id
          order by s.score desc
          limit 1
        )
      ),
      array_remove(array[v.part_of_speech], null)
    from public.vocabulary v
    where v.owner_id = auth.uid()

    union all

    -- structures
    select
      'structure'::text,
      st.id,
      st.name,
      st.arabic_form,
      coalesce(st.meaning, st.transliteration),
      greatest(
        coalesce((select s.score from public.search_field_score(q_la, public.normalize_latin(st.name), 95, fuzzy_threshold) s limit 1), 0),
        coalesce((select s.score from public.search_field_score(q_ar, st.search_arabic, 85, fuzzy_threshold) s limit 1), 0),
        coalesce((select s.score from public.search_field_score(q_la, st.search_latin, 65, fuzzy_threshold) s limit 1), 0)
      ),
      coalesce(
        (select s.match_label from public.search_field_score(q_la, public.normalize_latin(st.name), 95, fuzzy_threshold) s limit 1),
        (select s.match_label from public.search_field_score(q_ar, st.search_arabic, 85, fuzzy_threshold) s limit 1),
        (select s.match_label from public.search_field_score(q_la, st.search_latin, 65, fuzzy_threshold) s limit 1)
      ),
      coalesce(
        (select s.match_layer from public.search_field_score(q_la, public.normalize_latin(st.name), 95, fuzzy_threshold) s limit 1),
        (select s.match_layer from public.search_field_score(q_ar, st.search_arabic, 85, fuzzy_threshold) s limit 1),
        (select s.match_layer from public.search_field_score(q_la, st.search_latin, 65, fuzzy_threshold) s limit 1)
      ),
      array[
        (
          select count(*)::text || ' examples'
          from public.example_structures es
          where es.structure_id = st.id
        )
      ]
    from public.structures st
    where st.owner_id = auth.uid()
  )
  select
    c.entity_type,
    c.entity_id,
    c.title,
    c.arabic,
    c.subtitle,
    c.score,
    c.match_label,
    c.match_layer,
    c.context
  from candidates c
  where c.score > 0
  order by c.score desc, c.title
  limit greatest(result_limit, 1);
end;
$$;

grant execute on function public.search_corpus(text, int, float) to authenticated;

-- ---------------------------------------------------------------------------
-- L3 semantic search (only rows with embeddings; query vector from app)
-- ---------------------------------------------------------------------------
create or replace function public.search_corpus_semantic(
  query_embedding vector(1536),
  result_limit int default 20,
  match_threshold float default 0.72
)
returns table (
  entity_type text,
  entity_id uuid,
  title text,
  arabic text,
  subtitle text,
  score float,
  match_label text,
  match_layer text,
  context text[]
)
language plpgsql
stable
security invoker
set search_path = public
as $$
begin
  return query
  with semantic as (
    select
      'text'::text as entity_type,
      t.id as entity_id,
      t.title,
      left(t.arabic, 180) as arabic,
      t.translation as subtitle,
      (1 - (t.embedding <=> query_embedding))::float as score,
      'semantic'::text as match_label,
      'semantic'::text as match_layer,
      array_remove(array[t.source], null) as context
    from public.texts t
    where t.owner_id = auth.uid()
      and t.embedding is not null
      and 1 - (t.embedding <=> query_embedding) >= match_threshold

    union all

    select
      'example',
      e.id,
      e.arabic,
      e.arabic,
      coalesce(e.translation, e.transliteration),
      (1 - (e.embedding <=> query_embedding))::float,
      'semantic',
      'semantic',
      '{}'::text[]
    from public.examples e
    where e.owner_id = auth.uid()
      and e.embedding is not null
      and 1 - (e.embedding <=> query_embedding) >= match_threshold

    union all

    select
      'vocabulary',
      v.id,
      v.arabic,
      v.arabic,
      (
        select vs.gloss || ' (' || vs.lang || ')'
        from public.vocabulary_senses vs
        where vs.vocabulary_id = v.id
        order by vs.created_at
        limit 1
      ),
      (1 - (v.embedding <=> query_embedding))::float,
      'semantic',
      'semantic',
      array_remove(array[v.part_of_speech], null)
    from public.vocabulary v
    where v.owner_id = auth.uid()
      and v.embedding is not null
      and 1 - (v.embedding <=> query_embedding) >= match_threshold

    union all

    select
      'structure',
      st.id,
      st.name,
      st.arabic_form,
      coalesce(st.meaning, st.transliteration),
      (1 - (st.embedding <=> query_embedding))::float,
      'semantic',
      'semantic',
      '{}'::text[]
    from public.structures st
    where st.owner_id = auth.uid()
      and st.embedding is not null
      and 1 - (st.embedding <=> query_embedding) >= match_threshold
  )
  select
    s.entity_type,
    s.entity_id,
    s.title,
    s.arabic,
    s.subtitle,
    s.score,
    s.match_label,
    s.match_layer,
    s.context
  from semantic s
  order by s.score desc
  limit greatest(result_limit, 1);
end;
$$;

grant execute on function public.search_corpus_semantic(vector, int, float) to authenticated;

-- ---------------------------------------------------------------------------
-- Log a search miss
-- ---------------------------------------------------------------------------
create or replace function public.log_search_miss(
  miss_query text,
  layers text[] default array['exact', 'fuzzy']
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;
  if miss_query is null or length(trim(miss_query)) = 0 then
    return;
  end if;

  insert into public.search_misses (owner_id, query, layers_tried)
  values (auth.uid(), trim(miss_query), layers);
end;
$$;

grant execute on function public.log_search_miss(text, text[]) to authenticated;
