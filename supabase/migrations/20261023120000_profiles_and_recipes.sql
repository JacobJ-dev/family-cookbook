-- Milestone 2a: profiles + recipes, with Row Level Security (RLS).
--
-- RLS in one sentence: once enabled on a table, every row is hidden and locked
-- for the API roles (anon, authenticated) unless a policy explicitly allows it.
-- Policies are the app's security. The React code is just a client.


-- ─── profiles ────────────────────────────────────────────────────────────────
-- One row per signed-in person. Supabase keeps logins in its own auth.users
-- table; this table holds the app-specific bits (name shown on reviews, role).

create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 80),
  role         text not null default 'family' check (role in ('editor', 'family')),
  created_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Everyone signed in can see names (needed to show "Aunt Linda ★★★★★").
create policy "Signed-in users can read profiles"
  on public.profiles for select
  to authenticated
  using (true);

-- People can rename themselves, but only their own row...
create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ...and only the display_name column. Without this, a family member could
-- update their own row to role = 'editor'. RLS controls *rows*; column
-- privileges control *columns*.
revoke update on public.profiles from anon, authenticated;
grant update (display_name) on public.profiles to authenticated;

-- No insert/delete policies: rows are created by the trigger below, and roles
-- are changed by you in the dashboard SQL editor (which bypasses RLS).


-- Create a profile automatically the first time someone signs in.
-- "security definer" runs the function as its owner, so it can insert even
-- though users have no insert policy. "search_path = ''" forces fully
-- qualified names (public.profiles) so nothing can hijack the lookup.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    -- Use the name given at invite time if any, else the part of the email before @.
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- Helper used by policies: "is the current user the editor?"
-- security definer lets it read profiles regardless of the caller's RLS,
-- and "stable" tells Postgres the answer won't change within one query.
create function public.is_editor()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'editor'
  );
$$;


-- ─── recipes ─────────────────────────────────────────────────────────────────

create table public.recipes (
  id            uuid primary key default gen_random_uuid(),
  title         text not null check (char_length(title) between 1 and 200),
  description   text,                         -- one-line summary for the card
  story         text,                         -- family history: "Grandma made this every Easter"
  category      text,                         -- e.g. 'Mains', 'Desserts'
  servings      int  check (servings > 0),
  prep_minutes  int  check (prep_minutes >= 0),
  cook_minutes  int  check (cook_minutes >= 0),
  ingredients   text[] not null default '{}', -- one line each: '2 cups flour'
  steps         text[] not null default '{}', -- in order
  photo_path    text,                         -- path in the recipe-photos storage bucket (milestone 5)
  created_by    uuid not null default auth.uid() references public.profiles (id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.recipes enable row level security;

-- The whole family can read every recipe.
create policy "Signed-in users can read recipes"
  on public.recipes for select
  to authenticated
  using (true);

-- Only the editor can write. "with check" validates the new row being written;
-- "using" picks which existing rows an update/delete may touch.
create policy "Editor can add recipes"
  on public.recipes for insert
  to authenticated
  with check ((select public.is_editor()) and created_by = (select auth.uid()));

create policy "Editor can update recipes"
  on public.recipes for update
  to authenticated
  using ((select public.is_editor()))
  with check ((select public.is_editor()));

create policy "Editor can delete recipes"
  on public.recipes for delete
  to authenticated
  using ((select public.is_editor()));


-- Keep updated_at current on every edit, so the client can't forget or fake it.
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger recipes_set_updated_at
  before update on public.recipes
  for each row execute function public.set_updated_at();
