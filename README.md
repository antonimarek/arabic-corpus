# Levantine Arabic corpus

Web app for storing and searching Levantine Arabic texts, examples, vocabulary, structures, and morphological patterns. The database is the source of truth. An LLM layer is optional and not required.

**Patterns** are word-formation moves (double middle, denominal verb, and so on). They hang off vocabulary and roots. You create a pattern by connecting word pairs you already know, then naming the move — or by reviewing Suggestions from `npm run discover:patterns` (deterministic middle-doubling candidates; you confirm). **Structures** stay chunks and idioms (`عم + participle`, `بدي…`). Do not mix the two.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Supabase Auth (email + password) + Postgres + RLS
- Vercel for hosting

## Local setup

1. Copy `.env.example` to `.env.local` and set:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or legacy anon key)
   - `ALLOWED_EMAILS` (your email)
   - `NEXT_PUBLIC_SITE_URL` (`http://localhost:3000` for local use)
2. Create a Supabase project. Apply `supabase/migrations/20260809100000_init.sql` in the SQL editor, or use the Supabase CLI after `npx supabase link`.
3. In Supabase Auth:
   - [Users](https://supabase.com/dashboard/project/_/auth/users): create your account (email + password). There is no public `/sign-up` route.
   - [Providers](https://supabase.com/dashboard/project/_/auth/providers): keep Email enabled. Disable public signup after the account exists (Auth settings / `enable_signup = false` for local CLI).
   - [URL Configuration](https://supabase.com/dashboard/project/_/auth/url-configuration): set **Site URL** to the production origin (for example `https://YOUR_DOMAIN`). Keep `/auth/callback` in **Redirect URLs** for password recovery and other email links:
     - `http://localhost:3000/auth/callback`
     - `https://YOUR_DOMAIN/auth/callback`
     - optional previews: `https://*-YOUR_TEAM.vercel.app/auth/callback`
4. Install and run:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`, sign in with your allowlisted email and password, then create a text.

## Environment

Do not commit `.env.local` or any file with real keys, project URLs, or emails. Use `.env.example` as the template only.

## Phase 1 status

Done in this slice:

- Schema + RLS for texts, examples, vocabulary, senses, structures, tags, joins
- Email + password auth with email allowlist (public signup off after setup)
- App shell (Search / Texts / Vocabulary / Patterns / Structures + Add menu)
  - Manual (corner) covers how-to + Sources playbook; footer shows build time

- Texts CRUD with RTL Arabic paste/save
- `LLMProvider = none` stub

Still in Phase 1:

- Vocabulary / structures / examples CRUD + pickers
- L1 search (mixed result list)
