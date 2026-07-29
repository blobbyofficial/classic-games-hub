-- 0047_function_search_path.sql
-- Pin the search_path on the two functions that were still resolving names
-- against the caller's path.
--
-- Every other function in the schema already sets one. These two were added as
-- plain helpers and missed it: a caller who puts a schema of their own ahead of
-- `public` could shadow a name either body resolves, and the planner cannot
-- cache a plan for a function whose resolution depends on who is calling.
--
-- `= ''` rather than `= public`, because neither body touches a public object.
-- `jsonb_object_keys`, `count`, `lower` and the array operators all live in
-- `pg_catalog`, which is searched ahead of the path regardless of its contents,
-- so an empty path is the strictest setting that still resolves everything.
--
-- Both are IMMUTABLE and stay that way; a pinned path is what makes that claim
-- honest, since a body whose meaning shifts with the caller's path was never
-- really immutable.

create or replace function public.jsonb_object_keys_count(p jsonb)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case when p is null or jsonb_typeof(p) <> 'object' then 0
              else (select count(*)::int from jsonb_object_keys(p)) end;
$$;

create or replace function public.vanity_slug_reserved(p_slug text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select lower(p_slug) = any (array[
    'admin','api','auth','login','logout','signup','register','settings','shop','store',
    'games','game','leaderboards','leaderboard','friends','messages','message','party',
    'roadmap','status','changelog','legal','privacy','terms','u','user','users','profile',
    'notifications','challenges','inventory','search','about','help','support','staff',
    'moderator','mod','system','null','undefined','me','new','edit','delete'
  ]);
$$;
