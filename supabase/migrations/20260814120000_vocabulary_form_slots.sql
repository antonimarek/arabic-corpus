-- Citation slots on vocabulary_forms (present 3ms / noun plural).
-- Extra unlabeled forms stay allowed. Search scores form surfaces.

alter table public.vocabulary_forms
  add column if not exists slot text;

alter table public.vocabulary_forms
  drop constraint if exists vocabulary_forms_slot_check;

alter table public.vocabulary_forms
  add constraint vocabulary_forms_slot_check
  check (slot is null or slot in ('present_3ms', 'plural'));

create unique index if not exists vocabulary_forms_vocab_slot_idx
  on public.vocabulary_forms (vocabulary_id, slot)
  where slot is not null;

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
        coalesce((
          select max(s.score)
          from public.vocabulary_forms vf
          cross join lateral public.search_field_score(q_ar, vf.search_arabic, 88, fuzzy_threshold) s
          where vf.vocabulary_id = v.id
        ), 0),
        coalesce((select s.score from public.search_field_score(q_ar, public.normalize_arabic(v.root), 80, fuzzy_threshold) s limit 1), 0),
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
        (
          select s.match_label
          from public.vocabulary_forms vf
          cross join lateral public.search_field_score(q_ar, vf.search_arabic, 88, fuzzy_threshold) s
          where vf.vocabulary_id = v.id
          order by s.score desc
          limit 1
        ),
        (select s.match_label from public.search_field_score(q_ar, public.normalize_arabic(v.root), 80, fuzzy_threshold) s limit 1),
        (select s.match_label from public.search_field_score(q_la, v.search_latin, 75, fuzzy_threshold) s limit 1),
        'gloss'
      ),
      coalesce(
        (select s.match_layer from public.search_field_score(q_ar, v.search_arabic, 90, fuzzy_threshold) s limit 1),
        (
          select s.match_layer
          from public.vocabulary_forms vf
          cross join lateral public.search_field_score(q_ar, vf.search_arabic, 88, fuzzy_threshold) s
          where vf.vocabulary_id = v.id
          order by s.score desc
          limit 1
        ),
        (select s.match_layer from public.search_field_score(q_ar, public.normalize_arabic(v.root), 80, fuzzy_threshold) s limit 1),
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
      array_remove(array[v.part_of_speech, v.root], null)
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
