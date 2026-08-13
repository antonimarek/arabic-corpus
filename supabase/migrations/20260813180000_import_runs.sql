-- Online ImportBundle runs. Preview persists so a refresh does not lose the batch.

create table public.import_runs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  source_label text,
  bundle jsonb not null,
  decisions jsonb not null default '{}'::jsonb,
  status text not null default 'uploaded'
    check (status in ('uploaded', 'committed', 'failed')),
  counts jsonb,
  created_at timestamptz not null default now(),
  committed_at timestamptz
);

create index import_runs_owner_id_idx on public.import_runs (owner_id);
create index import_runs_created_at_idx on public.import_runs (created_at desc);

alter table public.import_runs enable row level security;

create policy "import_runs_owner_all"
  on public.import_runs for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
