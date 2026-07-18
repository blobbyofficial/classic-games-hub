-- ═══════════════════════════════════════════════════════════════════════════
-- Classic Games Hub — 0007 read helpers
-- Ranked leaderboards, the bidirectional friends graph, profile stat rollups
-- ═══════════════════════════════════════════════════════════════════════════

-- Ranked leaderboard for one game.
create or replace function public.game_leaderboard(p_slug text, p_limit int default 50)
returns table (
  rank bigint,
  user_id uuid,
  username text,
  display_name text,
  avatar_url text,
  level int,
  best_score bigint,
  plays int,
  achieved_at timestamptz
)
language sql stable security definer
set search_path = public
as $$
  select
    row_number() over (order by ls.best_score desc, ls.achieved_at asc) as rank,
    p.id, p.username::text, p.display_name, p.avatar_url, p.level,
    ls.best_score, ls.plays, ls.achieved_at
  from public.leaderboard_scores ls
  join public.games g on g.id = ls.game_id
  join public.profiles p on p.id = ls.user_id
  where g.slug = p_slug
  order by ls.best_score desc, ls.achieved_at asc
  limit greatest(1, least(p_limit, 200));
$$;

-- Global player ranking by level then XP.
create or replace function public.global_leaderboard(p_limit int default 50)
returns table (
  rank bigint,
  user_id uuid,
  username text,
  display_name text,
  avatar_url text,
  level int,
  xp bigint,
  equipped jsonb
)
language sql stable security definer
set search_path = public
as $$
  select
    row_number() over (order by p.level desc, p.xp desc) as rank,
    p.id, p.username::text, p.display_name, p.avatar_url, p.level, p.xp, p.equipped
  from public.profiles p
  where not p.is_banned
  order by p.level desc, p.xp desc
  limit greatest(1, least(p_limit, 200));
$$;

-- Accepted friends of the current user, with presence.
create or replace function public.list_friends()
returns table (
  user_id uuid,
  username text,
  display_name text,
  avatar_url text,
  level int,
  last_seen_at timestamptz,
  equipped jsonb,
  is_online boolean
)
language sql stable security definer
set search_path = public
as $$
  select
    p.id, p.username::text, p.display_name, p.avatar_url, p.level,
    case when s.show_online_status then p.last_seen_at else null end,
    p.equipped,
    coalesce(s.show_online_status, false) and p.last_seen_at > now() - interval '2 minutes'
  from public.friendships f
  join public.profiles p
    on p.id = case when f.requester_id = (select auth.uid()) then f.addressee_id else f.requester_id end
  left join public.user_settings s on s.user_id = p.id
  where f.status = 'accepted'
    and (select auth.uid()) in (f.requester_id, f.addressee_id)
  order by
    (coalesce(s.show_online_status, false) and p.last_seen_at > now() - interval '2 minutes') desc,
    p.last_seen_at desc;
$$;

-- Incoming pending friend requests.
create or replace function public.list_friend_requests()
returns table (
  request_id bigint,
  user_id uuid,
  username text,
  display_name text,
  avatar_url text,
  level int,
  created_at timestamptz
)
language sql stable security definer
set search_path = public
as $$
  select f.id, p.id, p.username::text, p.display_name, p.avatar_url, p.level, f.created_at
  from public.friendships f
  join public.profiles p on p.id = f.requester_id
  where f.addressee_id = (select auth.uid()) and f.status = 'pending'
  order by f.created_at desc;
$$;

-- Relationship of the current user to another profile.
create or replace function public.friendship_status(p_user uuid)
returns text
language sql stable security definer
set search_path = public
as $$
  select case
    when p_user = (select auth.uid()) then 'self'
    when exists (
      select 1 from public.user_blocks
      where blocker_id = (select auth.uid()) and blocked_id = p_user
    ) then 'blocked'
    when public.are_friends((select auth.uid()), p_user) then 'friends'
    when exists (
      select 1 from public.friendships
      where requester_id = (select auth.uid()) and addressee_id = p_user and status = 'pending'
    ) then 'outgoing'
    when exists (
      select 1 from public.friendships
      where requester_id = p_user and addressee_id = (select auth.uid()) and status = 'pending'
    ) then 'incoming'
    else 'none'
  end;
$$;

-- Conversation list for the DM inbox.
create or replace function public.list_conversations()
returns table (
  conversation_id uuid,
  last_message_at timestamptz,
  other_user_id uuid,
  other_username text,
  other_display_name text,
  other_avatar_url text,
  other_last_seen timestamptz,
  last_message text,
  last_message_sender uuid,
  unread int
)
language sql stable security definer
set search_path = public
as $$
  select
    c.id, c.last_message_at,
    op.id, op.username::text, op.display_name, op.avatar_url, op.last_seen_at,
    lm.content, lm.sender_id,
    (
      select count(*)::int from public.messages m
      where m.conversation_id = c.id
        and m.sender_id <> (select auth.uid())
        and m.created_at > me.last_read_at
    )
  from public.conversation_members me
  join public.conversations c on c.id = me.conversation_id
  join public.conversation_members om
    on om.conversation_id = c.id and om.user_id <> (select auth.uid())
  join public.profiles op on op.id = om.user_id
  left join lateral (
    select content, sender_id from public.messages m
    where m.conversation_id = c.id and m.deleted_at is null
    order by m.created_at desc limit 1
  ) lm on true
  where me.user_id = (select auth.uid())
  order by c.last_message_at desc;
$$;

-- Aggregate stats for a profile page.
create or replace function public.profile_stats(p_user uuid)
returns jsonb
language sql stable security definer
set search_path = public
as $$
  select jsonb_build_object(
    'total_plays', coalesce((select count(*) from public.play_sessions where user_id = p_user), 0),
    'games_played', coalesce((select count(distinct game_id) from public.play_sessions where user_id = p_user), 0),
    'achievements', coalesce((select count(*) from public.user_achievements where user_id = p_user), 0),
    'friends', coalesce((
      select count(*) from public.friendships
      where status = 'accepted' and (requester_id = p_user or addressee_id = p_user)
    ), 0),
    'best_game', (
      select jsonb_build_object('slug', g.slug, 'title', g.title, 'score', ls.best_score)
      from public.leaderboard_scores ls
      join public.games g on g.id = ls.game_id
      where ls.user_id = p_user
      order by ls.best_score desc limit 1
    )
  );
$$;

grant execute on function public.game_leaderboard(text, int) to anon, authenticated;
grant execute on function public.global_leaderboard(int) to anon, authenticated;
grant execute on function public.list_friends() to authenticated;
grant execute on function public.list_friend_requests() to authenticated;
grant execute on function public.friendship_status(uuid) to authenticated;
grant execute on function public.list_conversations() to authenticated;
grant execute on function public.profile_stats(uuid) to anon, authenticated;
