# Levantine Arabic corpus

Personal web app for storing and searching Levantine Arabic texts, examples, vocabulary, and structures. The database is the source of truth. An LLM layer is optional and not required.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Supabase Auth (magic link) + Postgres + RLS
- Vercel for hosting (target domain: `YOUR_DOMAIN`)

## Local setup

1. Copy `.env.example` to `.env.local` and set:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or legacy anon key)
   - `ALLOWED_EMAILS` (your email)
   - `NEXT_PUBLIC_SITE_URL` (`http://localhost:3000` for local use)
2. Create a Supabase project. Apply `supabase/migrations/20260809100000_init.sql` in the SQL editor, or use the Supabase CLI after `npx supabase link`.
3. In Supabase Auth URL settings, add redirect URL:
   - `http://localhost:3000/auth/callback`
   - later: `https://YOUR_DOMAIN/auth/callback`
4. Install and run:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`, request a magic link with an allowlisted email, then create a text.

## Phase 1 status

Done in this slice:

- Schema + RLS for texts, examples, vocabulary, senses, structures, tags, joins
- Magic-link auth with email allowlist
- App shell (Search / Texts / Vocabulary / Structures + Add menu)
- Texts CRUD with RTL Arabic paste/save
- `LLMProvider = none` stub

Still in Phase 1:

- Vocabulary / structures / examples CRUD + pickers
- L1 search (mixed result list)
