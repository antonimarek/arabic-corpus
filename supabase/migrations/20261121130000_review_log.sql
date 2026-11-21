-- review_log: one row per grade. Powers the streak, "today: X left" and the
-- daily due cap. Append-only from the app; nothing existing is modified.

create table if not exists public.review_log (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  review_item_id uuid not null references public.review_items (id) on delete cascade,
  grade text not null check (grade in ('again', 'hard', 'good', 'easy')),
  was_new boolean not null default false,
  reviewed_at timestamptz not null default now(),
  reviewed_on date not null default ((now() at time zone 'utc')::date)
);

create index if not exists review_log_owner_day_idx
  on public.review_log (owner_id, reviewed_on desc);

create index if not exists review_log_review_item_idx
  on public.review_log (review_item_id);

alter table public.review_log enable row level security;

drop policy if exists "review_log_owner_select" on public.review_log;
create policy "review_log_owner_select"
  on public.review_log for select
  using (owner_id = auth.uid());

drop policy if exists "review_log_owner_insert" on public.review_log;
create policy "review_log_owner_insert"
  on public.review_log for insert
  with check (owner_id = auth.uid());
