-- Hot-path indexes for reverse joins, root family, and owner-scoped lists.

create index if not exists example_vocabulary_vocabulary_id_idx
  on public.example_vocabulary (vocabulary_id);

create index if not exists example_structures_structure_id_idx
  on public.example_structures (structure_id);

create index if not exists vocabulary_root_idx
  on public.vocabulary (root)
  where root is not null;

create index if not exists vocabulary_owner_root_idx
  on public.vocabulary (owner_id, root)
  where root is not null;

create index if not exists examples_owner_created_at_idx
  on public.examples (owner_id, created_at desc);

create index if not exists vocabulary_owner_created_at_idx
  on public.vocabulary (owner_id, created_at desc);

create index if not exists texts_owner_created_at_idx
  on public.texts (owner_id, created_at desc);
