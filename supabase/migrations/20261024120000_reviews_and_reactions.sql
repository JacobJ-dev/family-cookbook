-- ─── reviews ────────────────────────────────────────────────────────────────

create table public.reviews (
    id              uuid primary key default gen_random_uuid(),
    recipe_id       uuid not null references public.recipes (id) on delete cascade,
    user_id         uuid not null default auth.uid() references public.profiles (id) on delete cascade,
    rating          int not null check (rating between 1 and 5),
    comment         text,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now(),
    unique (recipe_id, user_id)
);

alter table public.reviews enable row level security;

create policy "Signed-in users can read reviews"
    on public.reviews for select
    to authenticated
    using (true);

create policy "Reviewer can add reviews"
    on public.reviews for insert
    to authenticated
    with check ((user_id = (select auth.uid())));

create policy "Reviewer can update reviews"
    on public.reviews for update
    to authenticated
    using (user_id = (select auth.uid()))
    with check (user_id = (select auth.uid()));

create policy "Reviewer can delete reviews"
    on public.reviews for delete
    to authenticated
    using ((user_id = (select auth.uid())));

create trigger reviews_set_updated_at
  before update on public.reviews
  for each row execute function public.set_updated_at();


-- ─── reactions ────────────────────────────────────────────────────────────────

create table public.reactions (
    recipe_id       uuid not null references public.recipes (id) on delete cascade,
    user_id         uuid not null default auth.uid() references public.profiles (id) on delete cascade,
    kind            text not null check (kind in ('favorite', 'want_to_try')),
    created_at      timestamptz not null default now(),
    primary key (user_id, recipe_id, kind)
);

alter table public.reactions enable row level security;

create policy "Signed-in users can read reactions"
    on public.reactions for select
    to authenticated
    using (true);

create policy "Users can add their reactions"
    on public.reactions for insert
    to authenticated
    with check ((user_id = (select auth.uid())));

-- No update policy: every column is part of the key, so reactions are only added or removed.

create policy "Users can delete reactions"
    on public.reactions for delete
    to authenticated
    using ((user_id = (select auth.uid())));