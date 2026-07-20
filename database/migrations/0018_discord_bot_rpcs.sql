-- 0018_discord_bot_rpcs.sql
-- Discord bot integration — service_role-only RPCs keyed by Discord user id.
--
-- The bot authenticates with the Supabase secret (service_role) key. Because
-- new functions default to PUBLIC execute, every bot_* function below is
-- revoked from public/anon/authenticated and granted ONLY to service_role.
-- All are SECURITY DEFINER and resolve the caller's Hub profile from their
-- linked Discord identity (auth.identities.provider_id).

-- Internal: Discord user id -> Hub profile id. Not granted to any client role;
-- reachable only from the other definer functions below.
create or replace function public.bot_uid(p_discord text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select i.user_id
  from auth.identities i
  where i.provider = 'discord' and i.provider_id = p_discord
  limit 1;
$$;
revoke execute on function public.bot_uid(text) from public, anon, authenticated;

-- Profile summary.
create or replace function public.bot_profile(p_discord text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_id uuid := public.bot_uid(p_discord);
  v jsonb;
begin
  if v_id is null then
    return jsonb_build_object('ok', false, 'error', 'not_linked');
  end if;
  select jsonb_build_object(
    'ok', true, 'id', p.id, 'username', p.username::text, 'display_name', p.display_name,
    'level', p.level, 'xp', p.xp, 'credits', p.credits, 'role', p.role, 'is_banned', p.is_banned,
    'nameplate', p.equipped ->> 'nameplate'
  ) into v
  from public.profiles p where p.id = v_id;
  return v;
end;
$$;
revoke execute on function public.bot_profile(text) from public, anon, authenticated;
grant execute on function public.bot_profile(text) to service_role;

-- Daily reward (mirrors claim_daily_reward, keyed by Discord id).
create or replace function public.bot_claim_daily(p_discord text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid := public.bot_uid(p_discord);
  v_today date := (now() at time zone 'utc')::date;
  v_streak int := 1;
  v_credits int;
begin
  if v_id is null then
    return jsonb_build_object('ok', false, 'error', 'not_linked');
  end if;
  if exists (select 1 from public.daily_reward_claims where user_id = v_id and claim_date = v_today) then
    return jsonb_build_object('ok', false, 'error', 'already_claimed');
  end if;

  select streak + 1 into v_streak
  from public.daily_reward_claims
  where user_id = v_id and claim_date = v_today - 1;
  v_streak := coalesce(v_streak, 1);
  v_credits := 50 + least(v_streak - 1, 6) * 10;

  insert into public.daily_reward_claims (user_id, claim_date, streak, credits_awarded)
  values (v_id, v_today, v_streak, v_credits);

  perform public.award_credits(v_id, v_credits, 'daily_reward', 'daily', v_today::text,
    jsonb_build_object('streak', v_streak, 'via', 'discord'));
  perform public.add_xp(v_id, 20);
  perform public.check_achievements(v_id);

  return jsonb_build_object('ok', true, 'credits', v_credits, 'streak', v_streak);
end;
$$;
revoke execute on function public.bot_claim_daily(text) from public, anon, authenticated;
grant execute on function public.bot_claim_daily(text) to service_role;

-- Transfer credits between two linked players.
create or replace function public.bot_pay(p_from text, p_to text, p_amount bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from uuid := public.bot_uid(p_from);
  v_to uuid := public.bot_uid(p_to);
  v_bal bigint;
begin
  if p_amount is null or p_amount <= 0 then
    return jsonb_build_object('ok', false, 'error', 'bad_amount');
  end if;
  if v_from is null then
    return jsonb_build_object('ok', false, 'error', 'sender_not_linked');
  end if;
  if v_to is null then
    return jsonb_build_object('ok', false, 'error', 'recipient_not_linked');
  end if;
  if v_from = v_to then
    return jsonb_build_object('ok', false, 'error', 'self');
  end if;
  if exists (select 1 from public.profiles where id = v_from and is_banned) then
    return jsonb_build_object('ok', false, 'error', 'suspended');
  end if;

  select credits into v_bal from public.profiles where id = v_from;
  if v_bal < p_amount then
    return jsonb_build_object('ok', false, 'error', 'insufficient');
  end if;

  perform public.award_credits(v_from, -p_amount, 'transfer_out', 'user', v_to::text);
  perform public.award_credits(v_to, p_amount, 'transfer_in', 'user', v_from::text);
  return jsonb_build_object('ok', true, 'amount', p_amount);
end;
$$;
revoke execute on function public.bot_pay(text, text, bigint) from public, anon, authenticated;
grant execute on function public.bot_pay(text, text, bigint) to service_role;

-- Chat-activity XP (rate-limited by the bot process).
create or replace function public.bot_add_chat_xp(p_discord text, p_amount int)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid := public.bot_uid(p_discord);
  v_old int;
  v_new int;
  v_xp bigint;
begin
  if v_id is null then
    return jsonb_build_object('ok', false, 'error', 'not_linked');
  end if;
  select level into v_old from public.profiles where id = v_id;
  perform public.add_xp(v_id, greatest(0, least(coalesce(p_amount, 0), 100)));
  select level, xp into v_new, v_xp from public.profiles where id = v_id;
  return jsonb_build_object('ok', true, 'level', v_new, 'xp', v_xp, 'leveled_up', v_new > v_old);
end;
$$;
revoke execute on function public.bot_add_chat_xp(text, int) from public, anon, authenticated;
grant execute on function public.bot_add_chat_xp(text, int) to service_role;

-- Global top players (for /leaderboard).
create or replace function public.bot_top_players(p_limit int default 10)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'rank', rank, 'username', username, 'display_name', display_name,
    'level', level, 'xp', xp) order by rank), '[]'::jsonb)
  from public.global_leaderboard(greatest(1, least(p_limit, 25)));
$$;
revoke execute on function public.bot_top_players(int) from public, anon, authenticated;
grant execute on function public.bot_top_players(int) to service_role;

-- A player's awards + equipped nameplate + staff flag (for role sync).
create or replace function public.bot_user_awards(p_discord text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_id uuid := public.bot_uid(p_discord);
begin
  if v_id is null then
    return jsonb_build_object('ok', false, 'error', 'not_linked');
  end if;
  return jsonb_build_object(
    'ok', true,
    'badges', (
      select coalesce(jsonb_agg(si.slug), '[]'::jsonb)
      from public.inventory_items ii
      join public.shop_items si on si.id = ii.item_id
      where ii.user_id = v_id and si.kind = 'badge'
        and (ii.expires_at is null or ii.expires_at > now())
    ),
    'achievements', (
      select coalesce(jsonb_agg(a.slug), '[]'::jsonb)
      from public.user_achievements ua
      join public.achievements a on a.id = ua.achievement_id
      where ua.user_id = v_id
    ),
    'nameplate', (select equipped ->> 'nameplate' from public.profiles where id = v_id),
    'is_staff', (select role in ('admin', 'moderator') from public.profiles where id = v_id)
  );
end;
$$;
revoke execute on function public.bot_user_awards(text) from public, anon, authenticated;
grant execute on function public.bot_user_awards(text) to service_role;

-- Log a Discord moderation action into the shared audit trail.
create or replace function public.bot_log_mod(
  p_actor_discord text, p_target_discord text, p_action text, p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.bot_uid(p_actor_discord);
begin
  insert into public.audit_logs (actor_id, action, target_type, target_id, details)
  values (v_actor, 'discord_' || p_action, 'discord_user', p_target_discord,
    jsonb_build_object('reason', p_reason, 'via', 'discord_bot', 'target_discord', p_target_discord));
  return jsonb_build_object('ok', true);
end;
$$;
revoke execute on function public.bot_log_mod(text, text, text, text) from public, anon, authenticated;
grant execute on function public.bot_log_mod(text, text, text, text) to service_role;

-- Live server stats for voice-channel counters.
create or replace function public.bot_server_stats()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'members', (select count(*) from public.profiles where not is_banned),
    'online', (select count(*) from public.profiles where last_seen_at > now() - interval '5 minutes'),
    'plays_today', (select count(*) from public.play_sessions where created_at >= date_trunc('day', now() at time zone 'utc'))
  );
$$;
revoke execute on function public.bot_server_stats() from public, anon, authenticated;
grant execute on function public.bot_server_stats() to service_role;
