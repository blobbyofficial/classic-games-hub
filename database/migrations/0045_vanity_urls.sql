-- 0045_vanity_urls.sql
-- Vanity profile URLs — /u/<something-you-picked> instead of /u/<username>.
--
-- A vanity slug is a second, optional handle that resolves to the same
-- profile. Usernames stay immutable and canonical; the slug is cosmetic and
-- can be changed or cleared at any time. It is a perk: level 30, a server
-- boost, or staff.
--
-- Uniqueness is enforced by a partial unique index on lower(vanity_slug) so
-- nulls are free and matching is case-insensitive, and set_vanity_slug also
-- refuses anything that collides with somebody else's username or with a
-- route name (see vanity_slug_reserved) — otherwise /u/admin could be claimed
-- and would shadow a real page once we ever mount one.
--
-- resolve_profile_slug() is what the /u/[slug] route calls: it takes either
-- form and returns the canonical username, preferring a username match so an
-- existing profile can never be hijacked by someone claiming its name as
-- their slug.

alter table public.profiles add column if not exists vanity_slug text;

create unique index if not exists profiles_vanity_slug_key
  on public.profiles (lower(vanity_slug)) where vanity_slug is not null;

-- Route names and anything that would shadow a real page. A vanity slug also
-- may not collide with somebody else's username.
create or replace function public.vanity_slug_reserved(p_slug text)
returns boolean
language sql
immutable
as $$
  select lower(p_slug) = any (array[
    'admin','api','auth','login','logout','signup','register','settings','shop','store',
    'games','game','leaderboards','leaderboard','friends','messages','message','party',
    'roadmap','status','changelog','legal','privacy','terms','u','user','users','profile',
    'notifications','challenges','inventory','search','about','help','support','staff',
    'moderator','mod','system','null','undefined','me','new','edit','delete'
  ]);
$$;

create or replace function public.set_vanity_slug(p_slug text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_slug text := nullif(lower(trim(coalesce(p_slug, ''))), '');
  v_eligible boolean;
begin
  if v_me is null then
    raise exception 'authentication required';
  end if;

  -- Earned at level 30, or granted by boosting. Staff always qualify.
  select (level >= 30) or (booster_since is not null) or role in ('admin','moderator')
  into v_eligible from public.profiles where id = v_me;

  if not coalesce(v_eligible, false) then
    return jsonb_build_object('ok', false, 'error', 'not_eligible');
  end if;

  -- Clearing it is always allowed.
  if v_slug is null then
    update public.profiles set vanity_slug = null, updated_at = now() where id = v_me;
    return jsonb_build_object('ok', true, 'slug', null);
  end if;

  if v_slug !~ '^[a-z0-9][a-z0-9_-]{2,23}$' then
    return jsonb_build_object('ok', false, 'error', 'bad_format');
  end if;
  if public.vanity_slug_reserved(v_slug) then
    return jsonb_build_object('ok', false, 'error', 'reserved');
  end if;
  if exists (select 1 from public.profiles where lower(username::text) = v_slug and id <> v_me) then
    return jsonb_build_object('ok', false, 'error', 'taken');
  end if;
  if exists (select 1 from public.profiles where lower(vanity_slug) = v_slug and id <> v_me) then
    return jsonb_build_object('ok', false, 'error', 'taken');
  end if;

  update public.profiles set vanity_slug = v_slug, updated_at = now() where id = v_me;
  return jsonb_build_object('ok', true, 'slug', v_slug);
end;
$$;
revoke execute on function public.set_vanity_slug(text) from public, anon;
grant execute on function public.set_vanity_slug(text) to authenticated;

-- Username OR vanity slug -> the canonical username, for route resolution.
create or replace function public.resolve_profile_slug(p_slug text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select username::text from public.profiles
  where lower(username::text) = lower(trim(coalesce(p_slug, '')))
     or lower(vanity_slug) = lower(trim(coalesce(p_slug, '')))
  order by (lower(username::text) = lower(trim(coalesce(p_slug, '')))) desc
  limit 1;
$$;
revoke execute on function public.resolve_profile_slug(text) from public;
grant execute on function public.resolve_profile_slug(text) to anon, authenticated, service_role;
