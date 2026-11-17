-- Keep-alive for the Supabase free tier.
--
-- Free projects pause after about a week without "user database activity".
-- A scheduled Netlify function (netlify/functions/keep-alive.mts) calls
-- keep_alive() every day with the publishable key, which writes a timestamp.
-- The site itself never reads this table.


-- ─── heartbeat: one row, one timestamp ───────────────────────────────────────

create table public.heartbeat (
  -- A fixed label for "the" row. The check makes a second row impossible.
  id        int primary key check (id = 1),
  last_ping timestamptz not null default now()
);

-- RLS on with no policies: nobody can read or write the table directly.
-- The only way in is keep_alive() below.
alter table public.heartbeat enable row level security;

-- The row must exist before the first ping, because an update that matches
-- no rows changes nothing and raises no error.
insert into public.heartbeat (id) values (1);


-- ─── keep_alive(): the one button the robot may press ────────────────────────

-- security definer: runs as the function's owner, which RLS doesn't apply to,
-- so it can update the table even though the caller (anon) can't.
-- It takes no input, so a caller can't steer it at anything else.
-- search_path = '' and the fully-qualified table name follow the is_editor() pattern.
-- Returns the new timestamp, so the caller can see the write really happened.
create function public.keep_alive()
returns timestamptz
language sql
security definer
set search_path = ''
as $$
  update public.heartbeat
  set last_ping = now()
  where id = 1
  returning last_ping;
$$;

-- anon = anyone with the publishable key who isn't signed in (the robot).
-- Postgres lets everyone execute new functions by default; this line states the intent.
grant execute on function public.keep_alive() to anon;
