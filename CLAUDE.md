# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Family Cookbook

An online family cookbook. The site owner's mother-in-law is the **only editor**: she adds and edits recipes. Invited family members sign in to browse, rate (1–5 stars), comment, and mark recipes as favorite / want to try. The goal is to collect her recipes plus the family's feedback, so she can later pick the most popular ones for a printed cookbook.

## How we work (important)
- This is a **learning project**. The developer wants to fully understand every line, and we **take turns** writing code.
- When Claude writes code: keep changes small, and explain what each part does and why.
- When a step is marked as the developer's turn: **don't write it for them**. Give the goal, hints and relevant docs, then review their code and explain any issues.
- The developer is new to SQL migrations (learned RLS `using` vs `with check` in milestone 2). Explain new concepts with concrete examples before asking them to write them.
- Prefer plain, readable code over clever abstractions. Don't add libraries without discussing it first.
- Commit at the end of each milestone, with conventional-commit messages (`feat:`, `fix:`, `chore:`).
- The developer is using this project to build a SWE portfolio. At the end of each milestone, update `LEARNING.md`: add the skills practiced (marking honestly what they wrote vs. what Claude wrote), any good interview story (bugs caught, design decisions), and a log row.

## Stack
- React 19 + TypeScript + Vite 8, oxlint for linting
- `react-router` (v7) for pages, set up in `src/main.tsx` (`BrowserRouter`) and `src/App.tsx` (`Routes`)
- Supabase via `@supabase/supabase-js`: Postgres with Row Level Security, magic-link auth (invite-only, public sign-ups off), Storage bucket `recipe-photos`
- No custom backend. Hosting is planned on Netlify.
- Data fetching uses small custom hooks over supabase-js, with no extra state library

## Commands
- `npm run dev`: dev server at http://localhost:5173 (also `.claude/launch.json` → "dev")
- `npm run build`: type-check (`tsc -b`) + production build. Must pass before committing.
- `npm run lint`: oxlint. Must be clean.
- `npm run preview`: serve the built `dist/` locally
- No test runner yet. RLS is verified by hand: sign in, then run queries with the dev-only `window.supabase` in the F12 console.
- `npx supabase db push`: apply new files in `supabase/migrations/` to the linked project (the developer has run `login` + `link`)
- `npm run gen:types`: regenerate `src/lib/database.types.ts` after any schema change

## Planned structure
```
supabase/migrations/*.sql   schema + RLS policies (source of truth for the database)
src/lib/supabase.ts         Supabase client from VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY
src/lib/database.types.ts   generated: npx supabase gen types
src/auth/authContext.ts     AuthContext + useAuth() hook + Profile type
src/auth/AuthProvider.tsx   session + profile state (kept apart from the hook so fast refresh works)
src/auth/RequireAuth.tsx    layout-route guard: <Route element={<RequireAuth />}> wraps signed-in pages
src/pages/                  LoginPage, RecipeListPage, RecipeDetailPage, RecipeEditPage, PopularityPage
src/components/             StarRating, RecipeCard, ReviewList, ReviewForm, ReactionButtons, RequireEditor
```

## How auth fits together
- `main.tsx` nests `BrowserRouter > AuthProvider > App`, so any component can call `useAuth()` → `{ session, profile, loading, signOut }`.
- `AuthProvider` has two effects: (1) `onAuthStateChange` sets the session. Keep this callback synchronous, because awaiting supabase calls inside it can deadlock. (2) When the user id changes, fetch their `profiles` row, with an `ignore` flag for stale responses.
- `loading` stays true until the session is known and, if signed in, the profile fetch is done. Guards must wait for it, or signed-in users get bounced to `/login` on reload.
- Signing out needs no redirect code: the session becomes null, so `RequireAuth` re-renders into `<Navigate to="/login">`.
- Route guards are only for user experience. **RLS is the real security boundary**, so every access rule must be enforced in a migration, not just in the UI.
- The magic link uses the **implicit** flow (auth-js 2.118): tokens come back in the URL hash and supabase-js picks them up on load.

## Data model
- `profiles`: id (= auth user id), display_name, role (`editor` | `family`)
- `recipes`: title, description, story, category, servings, prep/cook minutes, `ingredients text[]`, `steps text[]`, photo_path, created_by, timestamps
- `reviews`: recipe_id, user_id, rating 1–5, comment. Unique per (recipe_id, user_id), so updates use upsert.
- `reactions`: user_id, recipe_id, kind (`favorite` | `want_to_try`). PK is all three. No update policy: the app only inserts (click on) and deletes (click off).
- view `recipe_stats`: avg rating, review/favorite/want-to-try counts per recipe

## Security rules
- **Every table has RLS enabled.** Signed-in users can read. Only `role = 'editor'` can write recipes or upload photos. Users can write only their own reviews and reactions.
- Only the **publishable** key (`sb_publishable_…`, formerly "anon") goes in the frontend. The **secret** key (`sb_secret_…`, formerly `service_role`) never goes in the repo or the browser.
- Secrets live in `.env.local` (gitignored by `*.local`). `.env.example` documents the variables.
- Any schema change goes in a new migration file, never in the dashboard alone.

## Milestones
0. ✅ Clean slate + git
1. ✅ Supabase project setup (developer)
2. ✅ Schema: Claude wrote profiles + recipes + RLS; developer wrote reviews + reactions + RLS
3. ✅ Auth: Claude wrote the client, auth context and route guard; developer wrote LoginPage + the header and ran the RLS tests
4. Recipe list + detail (developer) ← **next**
5. Editor form (Claude: form + photo upload; developer: ingredient/step list editing)
6. Reviews + reactions (developer: StarRating + ReviewForm; Claude: ReactionButtons)
7. Popularity dashboard (Claude) + sort/filter controls (developer)
8. Deploy to Netlify (Claude, guided)

Later: print/PDF cookbook export, in-app family invites (Edge Function), recipe versions.

Update the milestone checklist above as milestones are completed.

## Where we left off (2026-10-27)
**Milestone 3 is done and committed.** All 13 RLS tests passed as the editor and a family member. All test recipes were deleted, so the database should have no recipes (confirm with a select).

**Next: milestone 4, recipe list + detail (developer's turn).** Before they write it, explain fetching in `useEffect` (loading / error / data states, plus the `ignore` flag already used in `AuthProvider`), and URL params with `useParams`. The database is empty, so they'll need a recipe or two inserted from the editor console first.

**What the developer knows well now:** the three ways RLS says no (`42501` on insert; no error + `[]` on update/delete; `42501` permission denied from a column grant), `23505` unique violations, and the rule "prove the row exists before testing that it's blocked."

**Console-testing tips:** don't sign out to switch accounts (the built-in email sender allows only a few per hour); keep the editor and family in separate browsers. The console shows only the last result of a multi-line paste, so save each result in a variable and `console.log` them, or run lines one at a time. Firefox won't let you redeclare a `const`, so use new names. Double-check which window you're in (the header shows the name).

### The magic-link debugging checklist (if sign-in bounces back to /login)
If clicking the link lands back on `/login`, check in order:
1. Hover or copy the email link: what's the `redirect_to=` value? It should be `http://localhost:5173`. If the dev server ran on another port (e.g. 5174), Supabase falls back to the Site URL. Add it under Auth → URL Configuration → Redirect URLs if needed.
2. After clicking, look at the address bar or F12 console for error params like `#error=access_denied&error_code=otp_expired`. Links are one-use and expire, and email scanners sometimes "click" them first.
3. (Only if we ever switch to the PKCE flow: did the link open in the **same browser** that requested it? The code verifier lives in that browser's storage. With today's implicit flow, this is not a cause.)
4. F12 → Application → Local Storage: is there an `sb-…-auth-token` key after clicking?
Teach this as a debugging exercise: the developer drives, and Claude guides. A one-off failure in 2026-10 was most likely an expired or already-used link (`otp_expired`).

**Accounts:** two in Supabase, one editor (`0a92e20e…`) and one family (`e73676e7…`).
