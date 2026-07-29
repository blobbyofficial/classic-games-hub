-- 0057_profile_views_now_playing.sql
-- Two of the "expressive extras" from the v1.5.0 roadmap: an optional
-- profile-view counter, and a "now playing" widget on a profile.
--
-- ── Now playing ────────────────────────────────────────────────────────────
--
-- Entirely derived. What someone is playing is the most recent row in
-- play_sessions, and whether that counts as "now" is just how old it is - so
-- there is nothing to record, nothing to keep in sync, and no way for it to
-- claim someone is playing a game they stopped playing last week.
--
-- It respects the same privacy switch as presence. Someone who has turned off
-- "show online status" has said they do not want their activity visible, and
-- "playing Snake right now" is exactly that, arriving through a different
-- door. Honouring the setting they already set beats adding a second one.
--
-- ── Profile views ──────────────────────────────────────────────────────────
--
-- Opt-in, off by default: a view counter is the kind of thing that is fun for
-- some people and quietly stressful for others, and the roadmap calls it
-- optional.
--
-- Counts DISTINCT VIEWERS PER DAY, not raw hits. A raw counter measures how
-- many times someone refreshed, which is not interesting and is trivially
-- inflated; unique-viewers-per-day is a number that means something. Views are
-- recorded even while the setting is off - turning the counter on should show
-- a real history rather than starting from zero and implying nobody ever
-- visited. Only the display is optional, not the recording.
--
-- Self-views never count, which is the first thing anyone tests.

alter table public.user_settings
  add column if not exists show_profile_views boolean not null default false;

create table if not exists public.profile_views (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  viewer_id uuid not null references public.profiles (id) on delete cascade,
  -- Truncated to the day: the primary key is what dedupes refreshes, rather
  -- than a rate limit that would need its own state.
  day date not null default (now() at time zone 'utc')::date,
  primary key (profile_id, viewer_id, day)
);

create index if not exists profile_views_profile_idx on public.profile_views (profile_id);

alter table public.profile_views enable row level security;
-- Nobody reads the rows directly; the count comes back through the RPC below,
-- so a visitor can never enumerate who looked at whom.
drop policy if exists "profile_views_none" on public.profile_views;

create or replace function public.record_profile_view(p_profile uuid)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_show boolean;
  v_count bigint;
begin
  -- Signed-out visits and self-views are not counted. Both would make the
  -- number mean less: one is unattributable, the other is you.
  if v_me is not null and v_me <> p_profile then
    insert into public.profile_views (profile_id, viewer_id)
    values (p_profile, v_me)
    on conflict do nothing;
  end if;

  select coalesce(us.show_profile_views, false) into v_show
  from public.user_settings us where us.user_id = p_profile;

  if not coalesce(v_show, false) then
    return jsonb_build_object('shown', false);
  end if;

  select count(distinct viewer_id) into v_count
  from public.profile_views where profile_id = p_profile;

  return jsonb_build_object('shown', true, 'views', v_count);
end;
$$;

revoke execute on function public.record_profile_view(uuid) from public;
grant execute on function public.record_profile_view(uuid) to anon, authenticated;

/**
 * What a player is playing, or last played. `live` is true when the session is
 * recent enough to call it current.
 *
 * Returns null when the player has hidden their online status, so this cannot
 * be used as a side channel around that setting.
 */
create or replace function public.now_playing(p_user uuid)
returns jsonb
language sql stable
security definer
set search_path = public
as $$
  select case
    when not coalesce((select show_online_status from public.user_settings where user_id = p_user), true)
      then null
    else (
      select jsonb_build_object(
        'slug', g.slug,
        'title', g.title,
        'thumbnail_url', g.thumbnail_url,
        'at', ps.created_at,
        'live', ps.created_at > now() - interval '15 minutes'
      )
      from public.play_sessions ps
      join public.games g on g.id = ps.game_id
      where ps.user_id = p_user
        and ps.created_at > now() - interval '7 days'
        and g.status = 'published'
      order by ps.created_at desc
      limit 1
    )
  end;
$$;

revoke execute on function public.now_playing(uuid) from public;
grant execute on function public.now_playing(uuid) to anon, authenticated;
