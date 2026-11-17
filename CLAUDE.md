# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Family Cookbook

An online family cookbook. The site owner's mother-in-law is the **only editor**: she adds and edits recipes. Invited family members sign in to browse, rate (1–5 stars), comment, and mark recipes as favorite / want to try. The goal is to collect her recipes plus the family's feedback, so she can later pick the most popular ones for a printed cookbook.

## How we work (important)
- This is a **learning project**. The developer wants to fully understand every line, and we **take turns** writing code.
- When Claude writes code: keep changes small, and explain what each part does and why.
- When a step is marked as the developer's turn: **don't write it for them**. Give the goal, hints and relevant docs, then review their code and explain any issues.
- The developer is new to SQL migrations (learned RLS `using` vs `with check` in milestone 2). Explain new concepts with concrete examples before asking them to write them.
- Code style (developer's preference): **4-space indentation and semicolons** in TS/TSX/CSS (see `.editorconfig`). There's no formatter yet, so match it by hand. `src/lib/database.types.ts` is generated, so leave its formatting alone. Applied migrations keep their original 2-space style. JSON/MD/TOML/YAML use 2 spaces. Line endings are LF (`.gitattributes` normalizes them; the developer is on Windows, so git's "CRLF will be replaced" warnings are expected).
- **Whitespace nits: just fix them** (developer's permission, 2026-11-13): trailing spaces, whitespace-only lines, stray or doubled blank lines, a missing final newline, and the spacing inside comments, even in the developer's own files. Mention briefly what was tidied, but don't make it a review item or ask first. Anything beyond whitespace (quotes, `){`, naming, wording) still goes to the developer as a review note. `.editorconfig` trims trailing whitespace on save if their editor has EditorConfig support.
- oxlint enforces `react/rules-of-hooks` and `react/only-export-components`. The second one is why hooks/contexts live in separate files from components (e.g. `authContext.ts` vs `AuthProvider.tsx`).
- **User-facing text uses British spelling** (developer's request, 2026-11-14): "Favourite", "colour", etc. Code, identifiers and database values stay American (`favorite` in the `reactions.kind` check constraint), so only change what users see.
- Prefer plain, readable code over clever abstractions. Don't add libraries without discussing it first.
- Commit at the end of each milestone, with conventional-commit messages (`feat:`, `fix:`, `chore:`).
- The developer is using this project to build a SWE portfolio. At the end of each milestone, update `LEARNING.md`: add the skills practiced (marking honestly what they wrote vs. what Claude wrote), any good interview story (bugs caught, design decisions), and a log row.

## Stack
- React 19 + TypeScript + Vite 8, oxlint for linting
- `react-router` (v7) for pages, set up in `src/main.tsx` (`BrowserRouter`) and `src/App.tsx` (`Routes`)
- Supabase via `@supabase/supabase-js`: Postgres with Row Level Security, magic-link auth (invite-only, public sign-ups off), Storage bucket `recipe-photos`
- No custom backend. Hosting is planned on Netlify.
- Data fetching calls supabase-js directly inside `useEffect`, with no extra state library

## Commands
- First run: `npm install`, then `cp .env.example .env.local` and fill in the Supabase URL + publishable key
- `npm run dev`: dev server at http://localhost:5173 (also `.claude/launch.json` → "dev")
- `npm run build`: type-check (`tsc -b`) + production build. Must pass before committing.
- `npm run lint`: oxlint. Must be clean.
- `npm run preview`: serve the built `dist/` locally
- No test runner yet. RLS is verified by hand: sign in, then run queries with the dev-only `window.supabase` in the F12 console.
- `npx supabase db push`: apply new files in `supabase/migrations/` to the linked project (the developer has run `login` + `link`). The Supabase CLI is a devDependency, so `npx supabase` and `gen:types` use the project's pinned copy; no global install needed.
- `npm run gen:types`: regenerate `src/lib/database.types.ts` after any schema change

## Structure (built + planned)
Routes are all in `src/App.tsx`. Pages and components fetch inside their own `useEffect` (no custom hooks extracted yet).
```
supabase/migrations/*.sql   schema + RLS policies (source of truth for the database)
src/lib/supabase.ts         Supabase client from VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY
src/lib/database.types.ts   generated: npm run gen:types
src/lib/photos.ts           resizeToJpeg, uploadRecipePhoto, deleteRecipePhoto, getPhotoUrl (signed URLs)
src/auth/authContext.ts     AuthContext + useAuth() hook + Profile type
src/auth/AuthProvider.tsx   session + profile state (kept apart from the hook so fast refresh works)
src/auth/RequireAuth.tsx    layout-route guard: <Route element={<RequireAuth />}> wraps signed-in pages
src/auth/RequireEditor.tsx  layout-route guard nested inside RequireAuth: non-editors → /
src/pages/                  LoginPage, RecipeListPage (/), RecipeDetailPage (/recipes/:id),
                            RecipeEditPage (/recipes/new, /recipes/:id/edit), StatsPage (/stats, editor-only)
src/components/             StarRating, ReviewForm, ReviewList, ReactionButtons (all on RecipeDetailPage); RecipeCard (planned)
```

### How the recipe detail page fits together (milestone 6)
- `StarRating`: controlled, `value` + optional `onChange`; no `onChange` = display-only spans. Its buttons are `type="button"`, which matters because it sits inside ReviewForm's `<form>`.
- `ReviewForm`: loads the user's review with `maybeSingle`, tracks one `status` union (`loading | idle | saving | saved | error`), and saves with `upsert(…, { onConflict: 'recipe_id,user_id' })` sending `user_id` explicitly. Calls the optional `onSaved` prop after a save.
- `ReviewList`: joins `profiles(display_name)` through the `reviews.user_id` foreign key, newest first. The page holds a `reviewsVersion` counter: ReviewForm's `onSaved` bumps it, and ReviewList has it as `refreshKey` in its effect deps.
- `ReactionButtons`: insert = on, delete = off; the screen changes only after the database agrees. Labels live in one `LABELS` map.

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
- Storage bucket `recipe-photos` (migration `20261030120000`): **private** (decided 2026-10-30, because photos are family-only), so the app shows photos through short-lived signed URLs. It accepts only `image/jpeg` up to 5 MB, because the app resizes every photo to a ~1600px JPEG in the browser (canvas) before uploading. That also strips GPS/EXIF data, and HEIC that the browser can't decode gets a friendly error. Paths look like `<recipeId>/<random>.jpg`. Policies: signed-in users read; the editor inserts and deletes; there's no update policy (a replaced photo is a new file, and the old one is deleted).
- View `recipe_stats` (migration `20261115120000`): avg rating plus review/favorite/want-to-try counts per recipe. `security_invoker = true`, so the caller's RLS applies; readable by all signed-in users.

### Database-side mechanics (in the migrations, easy to miss from the frontend)
- Trigger `on_auth_user_created` → `handle_new_user()` inserts the `profiles` row on first sign-in (display_name from invite metadata, else the email prefix). There is no insert policy on `profiles`.
- New users default to `role = 'family'`. The editor role is set by hand in the dashboard SQL editor, never from the app.
- `profiles` has a column grant: `authenticated` may update only `display_name`, so users can't promote themselves. RLS limits rows; grants limit columns.
- Policies call `public.is_editor()` (`security definer`, `search_path = ''`) and use `(select auth.uid())` rather than bare `auth.uid()`. Follow both patterns in new migrations.
- `set_updated_at()` trigger keeps `updated_at` current on `recipes` and `reviews`.
- A new `VITE_*` env var must also be declared in `src/env.d.ts` and `.env.example`.

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
4. ✅ Recipe list + detail (developer wrote both pages; Claude reviewed)
5. ✅ Editor form (Claude: form + photo upload; developer: ingredient/step list editing)
6. ✅ Reviews + reactions (developer: StarRating + ReviewForm; Claude: ReviewList + ReactionButtons)
7. ✅ Statistics page (Claude: `recipe_stats` view + `StatsPage`; developer: column-header sorting with nulls last in both directions, and header arrows). Decisions (developer, 2026-11-15): the page is called **"Statistics"** (`/stats`, `StatsPage`), because "Popularity" felt tacky. It's **editor-only**: a route inside `RequireEditor`, and a header link only she sees. She sorts it by **clicking column headers** (she likes looking at different stats); that sorting is the developer's part. The `recipe_stats` view itself stays readable by all signed-in users, so "top rated" sorting works on the family's recipe list too; that leaks nothing, because they can already read every review and reaction.
8. Deploy to Netlify (Claude, guided). **Must handle the Supabase free-tier pause:** the project was paused after ~2 weeks without use (seen 2026-11-11), so a quiet family site would break until someone restores it in the dashboard. Decide on a keep-alive (e.g. a scheduled ping) or the paid plan before launch.
9. Design pass (developer, decided 2026-11-13): the developer restyles the whole site the way they want, before family members are invited. Until then, keep styling minimal and functional: give new components a class name and a few plain rules in `index.css` so they're easy to restyle, but don't spend time polishing looks.

**Deferred until after launch** (from milestone 5):
- The "unsaved changes" warning on the edit page. react-router's `useBlocker` needs a *data router* (`createBrowserRouter`), and we use `<BrowserRouter>`.
- A `<ListEditor>` component. Today the ingredient and step lists share functions in `RecipeEditPage` (`setItem/addItem/removeItem/moveUp/moveDown(list, ...)` with `list: 'ingredients' | 'steps'`).

Later: print/PDF cookbook export, in-app family invites (Edge Function), recipe versions, small inline fixes on the recipe page.

Update the milestone checklist above as milestones are completed.

## Where we left off (2026-11-17)
**Milestone 7 is done** and merged into `main`. **Next: milestone 8 (deploy)**, starting with the free-tier pause decision. The developer chose deploy before the design pass (2026-11-17): find the deploy surprises early and style against the live site. Nobody is invited until after the design pass.
- `recipe_stats` aggregates reviews and reactions in separate subqueries before joining (avoids join fan-out) and uses `security_invoker = true`. Generated view types mark every column nullable, so `StatsPage` handles `null` everywhere; in real data only `avg_rating` can be null (the counts are `coalesce`d to 0).
- `StatsPage` sorting: `sortedRows` and the header arrow (`displayColumnInfo`) are derived on each render, not state. In the compare function, the null checks return early **before** the direction flip, so unrated recipes stay at the bottom both ways. Don't reorder those lines.

Open items:
- `StatsPage` style notes for the developer (not whitespace): `): string{` and `){` need a space; `""` → `''`.
- The database has test recipes (Pot Roast, Lemon Bars, a deliberately bare Pancakes, plus others from testing the form) and their test photos. Delete them all before real use.
- The developer's call: "Review Saved!" stays on screen after the stars or comment change again. If `profile` were ever null, ReviewForm would sit on "Loading…" (unreachable today, because the guards wait for the profile).
- `RecipeDetailPage` doesn't reset `error`/`recipe`/`loadingDone` when `id` changes. Unreachable today, because navigation always goes through the list, which unmounts the page; it matters once recipes link to each other.
- The developer's files have minor style drift (double-quote imports, a few spaces inside `<h1>`/`<h3>`). That's a review note for them, not a whitespace fix.

## Product decisions (don't re-open)
- **Edit UX (2026-10-30):** a separate edit page, not inline editing. The form mirrors the detail page's layout and order, with labelled real inputs, a big obvious Edit button, and Save returning to the recipe page. The same form serves new and edit. Inline editing was rejected because she'd have to discover it, a stray tap could change a recipe, there's no single Cancel, and a new recipe still needs a form.
- **No `aria-label`s on the list-row inputs (2026-10-30).** Screen-reader support isn't a need for these stakeholders, so don't push it again. The main form fields keep their visible `<label>`s.

## How to teach
History behind these rules (what failed, what worked, and when) is in `TEACHING-NOTES.md`.

**The developer's main gap is recognition vs. building.** They read and explain code fine; the gap is *decomposing a problem into steps* by themselves. They struggle with coding assessments in job interviews today, so practising this is what gets them hired.

**How to run planning** (the developer's own request, 2026-11-14: "Like most juniors I just want to get in and start coding"):
1. **Make sure they plan, and think it through themselves.** Every developer turn starts with a plan in plain-English comments, not code, even when they push to skip ahead. Don't plan for them.
2. **Discuss first.** Before giving any template, ask open questions and let them talk it through: "What does this component need to know?", "What could go wrong when it loads?", "What happens the first time vs. the second time?" They should spot the issues and solutions themselves.
3. **The comment-plan structure** (PROPS / STATE / LOAD / SAVE / EVENTS / PREDICTION) comes *after* that discussion: as a way to write down what they worked out, or as a fallback when they're stuck. If they're stuck on structure, a skeleton with headings and blanks works. Don't hand over the whole format up front.
4. Keep each review round to the few things that block coding, so planning doesn't drag into many rounds (milestone 6 took four and got frustrating).

**Other habits that work:**
- The checklist for any state change: (1) what is the state now? (2) what should it be after? (3) which tool makes the new value without mutating (`map` = change one, `filter` = remove, `[...a, x]` = add, copy + swap = reorder)? (4) wrap it in `setForm((prev) => ...)`.
- Rebuild from memory: e.g. the steps list was built without looking at the ingredient code, plan first. Keep doing this, and point out real evidence of building when it happens (e.g. moveDown), so they can see progress.
- Walkthroughs of existing code: temporary `console.log`s, a prediction before each run, one piece at a time. Long written tables don't land.
- Demos need **exact steps with the expected screen at each step**, and name what "wrong" looks like up front. Everyday analogies help (a `Blob` is a sealed parcel with a label; index keys are coats on numbered chairs).
- **One question at a time when they're lost** (milestone 7 sorting): three questions in one message left them lost for an hour. What got them moving: a concrete number example of the rule, one small question, and, when they were stuck on turning a plan into code, a code skeleton with blanks that map line by line to their plan.
- They learn well from hints plus "how would you test that" (hovering links, Slow 3G throttling).

**What they know well now** (build on it, don't re-teach): the three ways RLS says no (`42501` on insert; no error + `[]` on update/delete; `42501` permission denied from a column grant), `23505` unique violations, "prove the row exists before testing that it's blocked", the `useEffect` fetch pattern with `ignore` and full deps arrays, `null` vs `[]` state, code after `.then` running before the response, one-variable checks for TypeScript narrowing, `.maybeSingle()`, upsert with `onConflict`, `( )` vs `{ }` arrow bodies, template literals in JSX, the `0 &&` trap, and `File`/`Blob` basics from the photo walkthrough.

## Testing by hand
**Accounts:** two in Supabase, one editor (`0a92e20e…`) and one family (`e73676e7…`).

**Console-testing tips:** don't sign out to switch accounts (the built-in email sender allows only a few per hour); keep the editor and family in separate browsers. The console shows only the last result of a multi-line paste, so save each result in a variable and `console.log` them, or run lines one at a time. Firefox won't let you redeclare a `const`, so use new names. Double-check which window you're in (the header shows the name). Harmless noise: Firefox rejects Cloudflare's `__cf_bm` cookie on the signed photo URLs.

### The magic-link debugging checklist (if sign-in bounces back to /login)
If clicking the link lands back on `/login`, check in order:
1. Hover or copy the email link: what's the `redirect_to=` value? It should be `http://localhost:5173`. If the dev server ran on another port (e.g. 5174), Supabase falls back to the Site URL. Add it under Auth → URL Configuration → Redirect URLs if needed.
2. After clicking, look at the address bar or F12 console for error params like `#error=access_denied&error_code=otp_expired`. Links are one-use and expire, and email scanners sometimes "click" them first.
3. (Only if we ever switch to the PKCE flow: did the link open in the **same browser** that requested it? The code verifier lives in that browser's storage. With today's implicit flow, this is not a cause.)
4. F12 → Application → Local Storage: is there an `sb-…-auth-token` key after clicking?

Teach this as a debugging exercise: the developer drives, and Claude guides.
