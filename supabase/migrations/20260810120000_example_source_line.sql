-- Optional line-level provenance for examples linked to a text.
-- Does not break free-standing examples (source_line stays null).

alter table public.examples
  add column if not exists source_line integer;

alter table public.examples
  drop constraint if exists examples_source_line_positive;

alter table public.examples
  add constraint examples_source_line_positive
  check (source_line is null or source_line > 0);

alter table public.examples
  drop constraint if exists examples_source_line_requires_text;

alter table public.examples
  add constraint examples_source_line_requires_text
  check (source_line is null or text_id is not null);

create index if not exists examples_text_id_source_line_idx
  on public.examples (text_id, source_line)
  where source_line is not null;
