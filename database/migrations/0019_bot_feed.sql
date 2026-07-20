-- 0019_bot_feed.sql
-- Discord bot — live score/achievement feed source.
--
-- Returns recent high-score and achievement events (with the player's
-- username) newer than a cursor id, for the bot to post into #live-scores.
-- service_role-only, like the other bot_* RPCs.

create or replace function public.bot_recent_feed(p_after bigint)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(row order by (row ->> 'id')::bigint), '[]'::jsonb)
  from (
    select jsonb_build_object(
      'id', ae.id,
      'type', ae.type,
      'username', p.username::text,
      'display_name', p.display_name,
      'data', ae.data
    ) as row
    from public.activity_events ae
    join public.profiles p on p.id = ae.user_id
    where ae.id > coalesce(p_after, 0)
      and ae.type in ('high_score', 'achievement_unlocked')
    order by ae.id
    limit 20
  ) s;
$$;
revoke execute on function public.bot_recent_feed(bigint) from public, anon, authenticated;
grant execute on function public.bot_recent_feed(bigint) to service_role;
