# Learning Log

What I've practiced building **Family Cookbook**: a real app for a real user (my mother-in-law), built alongside Claude Code. It's kept honest on purpose: each skill notes whether **I wrote it** or **Claude wrote it and I reviewed it**, so I can talk about it confidently in interviews.

---

## 1. Skills practiced so far

### Databases & SQL (Postgres via Supabase)
| Skill | Where in the repo | Who |
|---|---|---|
| Designing tables with types, defaults and `not null` | `supabase/migrations/*.sql` | Claude (profiles, recipes); **me** (reviews, reactions) |
| Foreign keys and choosing `on delete cascade` | `reviews.recipe_id`, `reactions.user_id` | **me** |
| `check` constraints to reject bad data at the database level | `rating between 1 and 5`, `kind in (...)` | **me** |
| Unique and **composite primary keys** | `unique (recipe_id, user_id)`, `primary key (user_id, recipe_id, kind)` | **me** |
| Triggers (auto-set `updated_at`, auto-create a profile on sign-up) | both migrations | Claude wrote it; **I reused the trigger function** |
| Migrations as version-controlled schema changes | `supabase/migrations/` | **me** (ran `db push`, fixed failures) |

### Security: Row Level Security (RLS) and authorization
| Skill | Notes |
|---|---|
| Enabling RLS and writing policies per command (select / insert / update / delete) | **I wrote** 7 policies for reviews and reactions |
| `using` (which existing rows you may touch) vs `with check` (is the new row valid) | Learned why update needs **both**: otherwise a user can reassign their row to someone else |
| Least privilege: no update policy on reactions, since they're only added or removed | **My design decision** |
| Column-level privileges: users can rename themselves but not change their own `role` | Claude wrote it; I can explain why RLS alone isn't enough |
| Keeping secrets out of the repo: `.env.local` gitignored, publishable vs secret keys | Set up together |
| Verifying security with tests, not assumptions: probing the API as an anonymous user | Claude ran the probes; I can explain each result |
| **Testing RLS as real users** (editor vs family, two browsers, F12 console) | **I ran** all 13 tests and predicted each result first; Claude wrote most of the queries |
| Reading *how* a request was blocked: insert → `42501`; update/delete → no error + `[]`; duplicate → `23505`; missing column grant → `42501` permission denied | **me** (learned by predicting, then comparing) |
| Auth guards are for the user experience; the database (RLS) is the real gate | Can explain why bypassing `RequireAuth` in the browser still returns nothing |

### Frontend tooling
- Scaffolding a **React 19 + TypeScript + Vite** app; what `index.html` → `main.tsx` → `App.tsx` does
- Client-side routing with **React Router**, including a **layout route** as a sign-in guard (`RequireAuth`, Claude wrote it)
- **React Context + a custom hook** (`AuthProvider`, `useAuth()`): Claude wrote it; **I used it** in the header and can explain why a context change re-renders every component that reads it
- **`useEffect` with subscriptions:** the effect runs once and registers a listener; the *listener* fires on every sign-in/out; cleanup runs only on unmount
- **Magic-link auth flow** (Supabase, invite-only): **I wrote** the login form (controlled input, `idle | sending | sent | error` status, disabled button while sending, error logging)
- **Conditional rendering:** **I wrote** the "Signed in as … / Sign out" header, and chose to render on `profile` instead of `session` to avoid a blank-name flash
- **Generating TypeScript types from the database schema** (`npm run gen:types`), so the frontend and database can't drift apart silently
- Linting (oxlint) and type-checking as a gate before every commit

### Professional workflow
- **Git:** conventional commits (`feat(db): …`, `chore: …`), one commit per milestone, pushed to GitHub
- **Reading error messages:** used `SQLSTATE 42883` and `At statement: 4` to find a typo
- **Transactions:** a failed migration rolls back completely, so a broken push leaves nothing half-applied
- Writing project docs: `README.md`, `.env.example`, `CLAUDE.md`

### AI-assisted development with Claude Code
This is a skill in itself, and increasingly expected in SWE roles.
- **Planning before coding:** used plan mode to agree on the architecture, data model and milestones first, then changed the plan when the real goal (a shared family cookbook) became clear
- **`CLAUDE.md`:** writing persistent project instructions (stack, security rules, how we work) so every session starts with the right context
- **Owning the code, not just accepting it:** take-turns workflow where I write parts myself and Claude reviews them, like a code review with a senior engineer
- **Verifying AI output:** every milestone ends with a build, lint and real checks against the live system, not "it looks right"
- **Giving precise context:** pasting exact errors and code instead of describing them

---

## 2. Interview stories (STAR-ready)

**"Tell me about a bug you caught."**
My first update policy compared `user_id = (select user_id)`, the column to itself. It didn't error, so it *looked* fine, but it was always true: any user could take over anyone's review. I learned that a silent security bug is worse than a crash, and that policies must compare against the *caller* (`auth.uid()`). Now I verify security by testing what an unauthorized user can do.

**"Tell me about a time a test passed for the wrong reason."**
Testing that the editor can't edit a family member's review, I got `data: []`, which is what a blocked update returns. But I had swapped two user ids, so the review I was "protecting" didn't exist: the query matched nothing, and that also returns `[]`. A second test (impersonating the editor) failed with a duplicate-key error instead of the RLS error I expected, which looked like a pass at a glance. I re-ran everything with a new rule: **before testing that something is blocked, prove it exists** (select it first), and check the exact error code, not just that it failed.

**"Tell me about a bug you couldn't reproduce."**
A magic-link sign-in kept bouncing back to the login page, then worked the next day. Instead of guessing, I wrote a checklist (redirect URL, error params in the address bar, local storage token) and checked which explanations fit. The likely cause was an expired or already-used one-time link. I also ruled out a theory (opening the link in another browser) by checking which auth flow our library version uses.

**"Tell me about a design decision."**
Reactions (favorite / want to try) have no update policy. Every column is part of the primary key, so "changing" a reaction is really delete + insert. Removing the update path removed an entire class of bugs and attack surface. I also removed a default value on `kind`: a missing value should fail loudly, not silently become a favorite.

**"How do you use AI tools?"**
I treat Claude Code like a pair programmer. We plan first, I keep a `CLAUDE.md` with the project's rules, I write the parts I need to learn, and I review and verify everything it writes against the real system. I can explain every line in this repo.

**"Why this project?"**
It has a real user with a real need: a family recipe collection with ratings, so my mother-in-law can choose recipes for a printed cookbook. That shaped decisions like invite-only magic-link sign-in (non-technical relatives) and a single-editor role model.

---

## 3. Draft resume bullets
*Use these once the app is deployed. Keep them true, and update the numbers.*
- Built a full-stack family recipe platform (React, TypeScript, Supabase/Postgres) used by **N** family members to share and rate **N** recipes
- Designed a relational schema with database-enforced authorization (Postgres Row Level Security), so users can only modify their own reviews and only the editor can publish recipes
- Developed with an AI-assisted workflow (Claude Code): planning, project instructions and verified code review, shipping in milestone-based commits

---

## 4. Coming up (skills each milestone will add)
| Milestone | New skills |
|---|---|
| 4. Recipe list + detail | Fetching data in React, loading and error states, URL params |
| 5. Editor form | Controlled forms, editing arrays in state, file uploads to cloud storage |
| 6. Reviews + reactions | Upserts, **optimistic UI updates** |
| 7. Popularity dashboard | SQL views and aggregation (`avg`, `count`, `group by`) |
| 8. Deploy | Hosting, environment variables in production, redirect URLs, sharing a live link |
| Later | Automated tests (Vitest), print CSS / PDF export, serverless functions |

---

## 5. Log
| Date | Milestone | What I did myself | Key lesson |
|---|---|---|---|
| 2026-10-23 | 0–1: setup | Created the Supabase project, configured auth, created the GitHub repo | Publishable vs secret keys; the API URL vs the base URL |
| 2026-10-23 | 2: schema | Wrote the reviews + reactions tables and 7 RLS policies, debugged a failed migration | `using` vs `with check`; transactions roll back failed migrations |
| 2026-10-27 | 3: auth | Wrote the login page and the signed-in header; ran all 13 RLS tests as the editor and a family member, and re-ran two after Claude spotted false passes in my console logs | An empty result can mean "blocked" *or* "nothing there": prove the row exists first |
