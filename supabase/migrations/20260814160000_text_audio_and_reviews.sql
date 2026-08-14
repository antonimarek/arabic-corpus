-- Text audio (private storage) + example review queue (FSRS).

-- ---------------------------------------------------------------------------
-- texts: audio metadata
-- ---------------------------------------------------------------------------
alter table public.texts
  add column if not exists audio_path text,
  add column if not exists audio_duration_ms integer,
  add column if not exists audio_line_starts_ms integer[];

alter table public.texts
  drop constraint if exists texts_audio_duration_ms_check;

alter table public.texts
  add constraint texts_audio_duration_ms_check
  check (audio_duration_ms is null or audio_duration_ms > 0);

-- ---------------------------------------------------------------------------
-- review_items: one FSRS card per mined example
-- ---------------------------------------------------------------------------
create table if not exists public.review_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  example_id uuid not null references public.examples (id) on delete cascade,
  due timestamptz not null default now(),
  stability double precision not null default 0,
  difficulty double precision not null default 0,
  elapsed_days double precision not null default 0,
  scheduled_days double precision not null default 0,
  learning_steps integer not null default 0,
  reps integer not null default 0,
  lapses integer not null default 0,
  state integer not null default 0,
  last_review_at timestamptz,
  enrolled_at timestamptz not null default now(),
  unique (owner_id, example_id)
);

create index if not exists review_items_owner_due_idx
  on public.review_items (owner_id, due);

create index if not exists review_items_example_id_idx
  on public.review_items (example_id);

alter table public.review_items enable row level security;

drop policy if exists "review_items_owner_all" on public.review_items;
create policy "review_items_owner_all"
  on public.review_items for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- ---------------------------------------------------------------------------
-- storage: private text-audio bucket
-- Path: {auth.uid()}/{text_id}/audio.{ext}
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'text-audio',
  'text-audio',
  false,
  20971520,
  array[
    'audio/ogg',
    'audio/opus',
    'audio/mp4',
    'audio/mpeg',
    'audio/webm',
    'audio/wav',
    'audio/x-wav',
    'audio/wave',
    'audio/x-m4a',
    'audio/aac'
  ]::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "text_audio_select" on storage.objects;
drop policy if exists "text_audio_insert" on storage.objects;
drop policy if exists "text_audio_update" on storage.objects;
drop policy if exists "text_audio_delete" on storage.objects;

create policy "text_audio_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'text-audio'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "text_audio_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'text-audio'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "text_audio_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'text-audio'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  )
  with check (
    bucket_id = 'text-audio'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "text_audio_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'text-audio'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );
