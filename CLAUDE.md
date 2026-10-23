# Family Cookbook

An online family cookbook. The site owner's mother-in-law is the **only editor**: she adds and edits recipes. Invited family members sign in to browse, rate (1–5 stars), comment, and mark recipes as favorite / want to try. The goal is to collect her recipes plus the family's feedback, so she can later pick the most popular ones for a printed cookbook.

## How we work (important)
- This is a **learning project**. The developer wants to fully understand every line, and we **take turns** writing code.
- When Claude writes code: keep changes small, and explain what each part does and why.
- When a step is marked as the developer's turn: **don't write it for them**. Give the goal, hints and relevant docs, then review their code and explain any issues.
- The developer is new to SQL migrations (learned RLS `using` vs `with check` in milestone 2). Explain new concepts with concrete examples before asking them to write them.
- Prefer plain, readable code over clever abstractions. Don't add libraries without discussing it first.
- Commit at the end of each milestone, with conventional-commit messages (`feat:`, `fix:`, `chore:`).

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
- `npx supabase db push`: apply new files in `supabase/migrations/` to the linked project (the developer has run `login` + `link`)
- `npm run gen:types`: regenerate `src/lib/database.types.ts` after any schema change

## Planned structure
```
supabase/migrations/*.sql   schema + RLS policies (source of truth for the database)
src/lib/supabase.ts         Supabase client from VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY
src/lib/database.types.ts   generated: npx supabase gen types
src/auth/AuthProvider.tsx   session + profile context, useAuth()
src/pages/                  LoginPage, RecipeListPage, RecipeDetailPage, RecipeEditPage, PopularityPage
src/components/             StarRating, RecipeCard, ReviewList, ReviewForm, ReactionButtons, RequireEditor
```

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
3. Auth (Claude): client, AuthProvider, LoginPage, route guard ← **next**. Then test RLS as a signed-in family user and as the editor.
4. Recipe list + detail (developer)
5. Editor form (Claude: form + photo upload; developer: ingredient/step list editing)
6. Reviews + reactions (developer: StarRating + ReviewForm; Claude: ReactionButtons)
7. Popularity dashboard (Claude) + sort/filter controls (developer)
8. Deploy to Netlify (Claude, guided)

Later: print/PDF cookbook export, in-app family invites (Edge Function), recipe versions.

Update the milestone checklist above as milestones are completed.
