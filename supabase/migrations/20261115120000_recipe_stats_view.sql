-- ─── recipe_stats ───────────────────────────────────────────────────────────
-- One row per recipe with its popularity numbers, for the popularity page
-- and "top rated" sorting.
--
-- Reviews and reactions are counted in separate subqueries *before* joining.
-- Joining both raw tables at once would pair every review with every
-- reaction (join fan-out) and inflate the counts.

create view public.recipe_stats
with (security_invoker = true)  -- run as the signed-in user, so RLS still applies
as
select
    r.id                                  as recipe_id,
    r.title,
    coalesce(rv.review_count, 0)          as review_count,
    rv.avg_rating,                        -- null when there are no reviews yet
    coalesce(rx.favorite_count, 0)        as favorite_count,
    coalesce(rx.want_to_try_count, 0)     as want_to_try_count
from public.recipes r
left join (
    select
        recipe_id,
        count(*)                as review_count,
        round(avg(rating), 1)   as avg_rating
    from public.reviews
    group by recipe_id
) rv on rv.recipe_id = r.id
left join (
    select
        recipe_id,
        count(*) filter (where kind = 'favorite')      as favorite_count,
        count(*) filter (where kind = 'want_to_try')   as want_to_try_count
    from public.reactions
    group by recipe_id
) rx on rx.recipe_id = r.id;
