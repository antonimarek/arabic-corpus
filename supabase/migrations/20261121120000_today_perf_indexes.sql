-- /today hot paths. Non-destructive: indexes only, no data or policy changes.

-- countEnrolledToday: owner-scoped count of cards enrolled since UTC midnight.
create index if not exists review_items_owner_enrolled_at_idx
  on public.review_items (owner_id, enrolled_at);
