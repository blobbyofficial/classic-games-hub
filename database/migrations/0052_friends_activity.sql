-- 0052_friends_activity.sql
-- The friends activity feed (roadmap v1.5.0).
--
-- Nothing here records anything new. `activity_events` has been filling up
-- since 0002 - high scores, achievements, purchases, new friendships - and
-- every profile page already shows a player's own. What was missing was the
-- other direction: a single stream of what the people you know have been doing,
-- so the hub feels inhabited even when nobody is talking.
--
-- Worth being explicit about privacy, because "feed" sounds like it should
-- need a gate: it does not expose anything that was not already public.
-- `activity_events` carries an "activity is public" RLS policy from 0002, so
-- any of these rows could already be read by anyone. All this function does is
-- narrow that to your friends and sort it, which is strictly less than what is
-- already readable.
--
-- Blocks ARE enforced, in both directions. A block is a statement that two
-- people should stop appearing to each other, and a feed that kept surfacing
-- someone you blocked would be a conspicuous hole in that promise even if the
-- underlying row is public.
--
-- Keyset pagination on (created_at, id) rather than OFFSET: the feed is
-- append-heavy, and an offset page-2 silently repeats or skips rows whenever
-- something new lands between requests.

create index if not exists activity_events_feed_idx
  on public.activity_events (created_at desc, id desc);

create or replace function public.friends_activity(
  p_limit int default 30,
  p_before timestamptz default null,
  p_before_id bigint default null
)
returns jsonb
language sql stable
security definer
set search_path = public
as $$
  with me as (select auth.uid() as id),
  friends as (
    select case when f.requester_id = m.id then f.addressee_id else f.requester_id end as friend_id
    from public.friendships f, me m
    where f.status = 'accepted'
      and (f.requester_id = m.id or f.addressee_id = m.id)
  ),
  visible as (
    select fr.friend_id
    from friends fr, me m
    where not exists (
      select 1 from public.user_blocks b
      where (b.blocker_id = m.id and b.blocked_id = fr.friend_id)
         or (b.blocker_id = fr.friend_id and b.blocked_id = m.id)
    )
  )
  select coalesce(jsonb_agg(row order by row_created_at desc, row_id desc), '[]'::jsonb)
  from (
    select
      ae.created_at as row_created_at,
      ae.id as row_id,
      jsonb_build_object(
        'id', ae.id,
        'type', ae.type,
        'data', ae.data,
        'created_at', ae.created_at,
        'actor', jsonb_build_object(
          'username', p.username,
          'display_name', p.display_name,
          'avatar_url', p.avatar_url,
          'equipped', p.equipped
        )
      ) as row
    from public.activity_events ae
    join visible v on v.friend_id = ae.user_id
    join public.profiles p on p.id = ae.user_id
    where not p.is_banned
      and (
        p_before is null
        or ae.created_at < p_before
        or (ae.created_at = p_before and p_before_id is not null and ae.id < p_before_id)
      )
    order by ae.created_at desc, ae.id desc
    limit least(greatest(coalesce(p_limit, 30), 1), 100)
  ) t;
$$;

revoke execute on function public.friends_activity(int, timestamptz, bigint) from public, anon;
grant execute on function public.friends_activity(int, timestamptz, bigint) to authenticated;
