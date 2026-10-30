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
- oxlint enforces `react/rules-of-hooks` and `react/only-export-components`. The second one is why hooks/contexts live in separate files from components (e.g. `authContext.ts` vs `AuthProvider.tsx`).
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
Built so far: `src/lib/*`, `src/auth/*` (incl. RequireEditor), `src/pages/` LoginPage + RecipeListPage (`/`) + RecipeDetailPage (`/recipes/:id`) + RecipeEditPage (`/recipes/new`, `/recipes/:id/edit`; in progress), the temporary KeyDemo (`/key-demo`), and three migrations. The rest is planned. The pages fetch inside their own `useEffect` (no custom hooks extracted yet).
```
supabase/migrations/*.sql   schema + RLS policies (source of truth for the database)
src/lib/supabase.ts         Supabase client from VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY
src/lib/database.types.ts   generated: npx supabase gen types
src/auth/authContext.ts     AuthContext + useAuth() hook + Profile type
src/auth/AuthProvider.tsx   session + profile state (kept apart from the hook so fast refresh works)
src/auth/RequireAuth.tsx    layout-route guard: <Route element={<RequireAuth />}> wraps signed-in pages
src/auth/RequireEditor.tsx  layout-route guard nested inside RequireAuth: non-editors → /
src/pages/                  LoginPage, RecipeListPage, RecipeDetailPage, RecipeEditPage, PopularityPage
src/components/             StarRating, RecipeCard, ReviewList, ReviewForm, ReactionButtons
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
- Storage bucket `recipe-photos` (migration `20261030120000`): **private** (decided 2026-10-30, because photos are family-only), so the app shows photos through short-lived signed URLs. It accepts only `image/jpeg` up to 5 MB, because the app resizes every photo to a ~1600px JPEG in the browser (canvas) before uploading. That also strips GPS/EXIF data, and HEIC that the browser can't decode gets a friendly error. Paths look like `<recipeId>/<random>.jpg`. Policies: signed-in users read; the editor inserts and deletes; there's no update policy (a replaced photo is a new file, and the old one is deleted).
- **Not created yet:** view `recipe_stats` (avg rating, review/favorite/want-to-try counts per recipe, milestone 7).

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
5. Editor form (Claude: form + photo upload; developer: ingredient/step list editing) ← **in progress**
6. Reviews + reactions (developer: StarRating + ReviewForm; Claude: ReactionButtons)
7. Popularity dashboard (Claude) + sort/filter controls (developer)
8. Deploy to Netlify (Claude, guided)

Later: print/PDF cookbook export, in-app family invites (Edge Function), recipe versions.

Update the milestone checklist above as milestones are completed.

## Where we left off (2026-10-30)
**Milestone 5 is in progress on branch `feat/milestone-5-editor-form`** (WIP commit pushed 2026-10-30; merge to `main` when the milestone is done). The database has test recipes (Pot Roast, Lemon Bars, a deliberately bare Pancakes, plus whatever was created testing the form). Delete them all before real use.

**Milestone 5 steps:**
1. ✅ Storage migration `20261030120000` (Claude), pushed; developer ran all Storage RLS tests.
2. ✅ `src/auth/RequireEditor.tsx` nested in `RequireAuth`; routes `/recipes/new` + `/recipes/:id/edit`; editor-only New / "Edit recipe" links styled as `.button` (Claude). Developer tested all cases.
3. ✅ `RecipeEditPage` form (Claude): one page for new + edit, `toForm`/`toRow`, `setField`, `.select('id').single()` on save. Developer added the blank-title check and moved the "Could not save" prefix into the DB-error branch.
4. **List editor (developer), split into sub-steps, ingredients first:**
   - ✅ (1) `Ingredient = { id, text }`, `createIngredient(text)` helper, `toForm` maps strings → rows, `ingredientsToList` maps back, `key={ingredient.id}`
   - ✅ (2) editable inputs via `setIngredient(id, value)`. **Claude wrote this function as a worked example** after the developer got stuck; the developer wired it up and found their own `e.target.value` bug.
   - ✅ (3) `addIngredient()` + "Add new ingredient" button with `type="button"` (developer, after untangling two overlapping functions)
   - ✅ (4) `removeIngredient(id)` with `.filter()`: **written entirely by the developer**
   - ⏭ **(5) Move up/down: next.** Guiding questions were already given (index as 2nd `.map()` arg is fine for *which rows to swap*, not for the key; copy then swap like `KeyDemo.moveUp`; one function with a direction?; `disabled` at the edges; keyboard Tab+Enter-twice test).
   - (6) Steps list: same features; decide then whether to extract a shared component (rename `Ingredient` → something generic).
   - Open review notes for the developer: Remove button label `-` → "Remove" (usability for her, not a11y); style nits (missing `;` after `}))` in `removeIngredient`, trailing spaces, `''` not `""` in TS, `"button"` not `'button'` in JSX, `ingredientText : string` spacing). Not yet confirmed: the "cursor stays in the same ingredient after removing a row above it" test.
   - Blank rows: they currently save as `''`. Decide with the developer (likely drop blank rows in `ingredientsToList`).
5. Photo upload (Claude). Start with the hands-on `Blob` lesson (see weak spot below), then canvas resize → JPEG → upload → `photo_path` → signed URL on the detail page.
6. Tests, delete `KeyDemo.tsx` + its route, "unsaved changes" warning, LEARNING.md, milestone checklist, merge.

**Scope decision (developer, 2026-10-30):** no `aria-label`s on the list-row inputs. Screen-reader support isn't a need for these stakeholders, so don't push it again. (The main form fields keep their visible `<label>`s.)

**Edit UX decision (2026-10-30, developer agreed):** a separate edit page, not inline editing. The form mirrors the detail page's layout and order, with labeled real inputs. There's a big obvious Edit button, and Save returns to the recipe page. Warn on leaving with unsaved changes. The same form serves new and edit. Inline editing was rejected because she'd have to discover it, a stray tap could change a recipe, there's no single Cancel, and a new recipe still needs a form. Small inline fixes could come after launch.

**Mental model that clicked (2026-10-30):** the form is a *draft* in browser memory; only Save sends it to the database (the developer first thought "Add ingredient" saved something).

**Known loose ends in the milestone 4 pages (not bugs today):** `RecipeDetailPage` doesn't reset `error`/`recipe`/`loadingDone` when `id` changes. That's unreachable for now, because navigation always goes through the list, which unmounts the page. It matters once recipes link to each other. The developer's files still have minor style drift (double-quote imports, a few spaces inside `<h1>`/`<h3>`). The `servings &&` trap is already fixed (`!== null`).

**What the developer knows well now:** the three ways RLS says no (`42501` on insert; no error + `[]` on update/delete; `42501` permission denied from a column grant), `23505` unique violations, and the rule "prove the row exists before testing that it's blocked." From milestone 4: the `useEffect` fetch pattern with `ignore`, `null` vs `[]` state, code after `.then` running before the response, one-variable checks for TypeScript narrowing, `.maybeSingle()`, `( )` vs `{ }` arrow bodies, template literals in JSX, and the `0 &&` trap. They learn well from hints plus "how would you test that" (hovering links, Slow 3G throttling). Demos need **exact steps with the expected screen at each step**: in the key demo they saw the bug but didn't recognize it as one until given a step-by-step table and an everyday analogy (coats on numbered chairs = index keys). Name what "wrong" looks like up front.

**Weak spot the developer flagged (2026-10-30): Storage and `Blob`.** They ran the milestone 5 step 1 Storage RLS tests (all passed) but say they don't fully understand that material yet, *especially Blobs*. Make sure they understand it before building on it:
- What a `Blob` / `File` is (bytes + a MIME `type`), and why `new Blob(['hi'])` uploaded as `application/octet-stream` while the `contentType` option was ignored.
- MIME types, and the bucket's `allowed_mime_types` (415) vs. RLS (`new row violates…`), both sent as HTTP 400. Read `error.message`, not the status.
- Storage as rows in `storage.objects`, so file actions map to insert/select/delete policies. Also why the family can *see* a file but can't *delete* it (each command has its own `using`).
- Plan: re-teach `Blob` hands-on at the start of step 5 (photo upload), where it becomes concrete: `<input type="file">` gives a `File`, and `canvas.toBlob(cb, 'image/jpeg')` makes the upload. Small console experiments first (`new Blob`, `.type`, `.size`, `await blob.text()`), then the real code. Don't treat step 1 as understood just because the tests passed.

**Console-testing tips:** don't sign out to switch accounts (the built-in email sender allows only a few per hour); keep the editor and family in separate browsers. The console shows only the last result of a multi-line paste, so save each result in a variable and `console.log` them, or run lines one at a time. Firefox won't let you redeclare a `const`, so use new names. Double-check which window you're in (the header shows the name).

### The magic-link debugging checklist (if sign-in bounces back to /login)
If clicking the link lands back on `/login`, check in order:
1. Hover or copy the email link: what's the `redirect_to=` value? It should be `http://localhost:5173`. If the dev server ran on another port (e.g. 5174), Supabase falls back to the Site URL. Add it under Auth → URL Configuration → Redirect URLs if needed.
2. After clicking, look at the address bar or F12 console for error params like `#error=access_denied&error_code=otp_expired`. Links are one-use and expire, and email scanners sometimes "click" them first.
3. (Only if we ever switch to the PKCE flow: did the link open in the **same browser** that requested it? The code verifier lives in that browser's storage. With today's implicit flow, this is not a cause.)
4. F12 → Application → Local Storage: is there an `sb-…-auth-token` key after clicking?
Teach this as a debugging exercise: the developer drives, and Claude guides. A one-off failure in 2026-10 was most likely an expired or already-used link (`otp_expired`).

**Accounts:** two in Supabase, one editor (`0a92e20e…`) and one family (`e73676e7…`).
