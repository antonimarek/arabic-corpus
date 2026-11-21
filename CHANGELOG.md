# Changelog

## 2026-11-21 — /today redesign

- **Daily card session.** /today opens straight into one Start button and a
  capped session: up to 15 due cards (learning first, then most overdue) and
  up to 5 new ones. Only "today: X left" is shown, never the backlog.
- **Backlog protection.** After a break, overdue cards are spread over the
  next days (15/day) at read time. Nothing in the database is rescheduled.
- **Cards.** Large RTL Arabic first; reveal shows translation, neighbouring
  dialogue lines and the source text; optional line audio. Grades on 1–4,
  reveal on Space/Enter, big tap targets pinned above the mobile nav.
  "Again" brings a card back at the end of the session.
- **End screen.** Summary, streak (one card counts as a day), "+5 more", and
  listen/read and fluency replay as optional extras.
- **Speed.** No client-side redirect, parallel queries, streamed cards,
  optimistic grading. Query chain 633 → 354 ms; warm first paint ~0.1 s.
- **Fix.** First open after a session refresh no longer shows "This page
  couldn't load" (retry on "JWT issued at future").
- **Database.** New `review_log` table (RLS, owner-only), index on
  `review_items (owner_id, enrolled_at)`; October perf indexes applied.
