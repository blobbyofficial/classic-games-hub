-- 0115_developer_booster_rewards_and_level_theme_access.sql
-- Depends on 0114. Developer accounts are existing profiles.role='admin'.
-- The permanent Retro award still occurs at level 25 via the 0114 trigger.
-- Level 25 additionally qualifies for Premium by explicit product request.
-- Developer/admin accounts receive the same booster daily and monthly drops.
-- Never spoof booster_since: Discord controls that field and may resync it.
-- Review in staging before applying to production.

create or replace function public.my_theme_entitlements()
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare
  v_user uuid := auth.uid();
  v_premium boolean := false;
  v_retro boolean := false;
begin
  if v_user is null then
    return jsonb_build_object('premium',false,'retro',false);
  end if;
  select coalesce(p.booster_since is not null or p.level >= 25 or p.role in ('admin','moderator'),false),
         coalesce(p.level >= 25 or p.role in ('admin','moderator'),false) or exists(
           select 1 from public.theme_unlocks u where u.user_id = p.id
         )
    into v_premium,v_retro
    from public.profiles p where p.id = v_user;
  return jsonb_build_object('premium',coalesce(v_premium,false),
                            'retro',coalesce(v_retro,false));
end;
$$;
revoke all on function public.my_theme_entitlements() from public, anon;
grant execute on function public.my_theme_entitlements() to authenticated;


create or replace function public.check_site_theme()
returns trigger language plpgsql security definer set search_path=public as $$
declare
  v_allowed boolean;
begin
  if tg_op = 'UPDATE' and new.site_theme is not distinct from old.site_theme then
    return new;
  end if;
  if new.site_theme in ('default','halloween','red') then return new; end if;

  if new.site_theme = 'premium' then
    select coalesce(booster_since is not null or level >= 25 or role in ('admin','moderator'),false)
      into v_allowed from public.profiles where id = new.user_id;
    if coalesce(v_allowed,false) then return new; end if;
    raise exception 'Premium requires an active Discord server boost' using errcode = 'P0001';
  end if;

  if new.site_theme = 'retro' then
    select coalesce(level >= 25 or role in ('admin','moderator'),false) or exists(
      select 1 from public.theme_unlocks where user_id = new.user_id
    ) into v_allowed from public.profiles where id = new.user_id;
    if coalesce(v_allowed,false) then return new; end if;
    raise exception 'Retro unlocks at level 25' using errcode = 'P0001';
  end if;

  raise exception 'Unknown site theme' using errcode = 'P0001';
end;
$$;
revoke execute on function public.check_site_theme() from public, anon, authenticated;
drop trigger if exists user_settings_check_theme on public.user_settings;
create trigger user_settings_check_theme
before insert or update of site_theme on public.user_settings
for each row execute function public.check_site_theme();


create or replace function public.claim_daily_reward()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_today date := (now() at time zone 'utc')::date;
  v_streak int := 1;
  v_credits int;
  v_booster boolean;
begin
  if v_me is null then
    raise exception 'authentication required';
  end if;
  if exists (select 1 from public.daily_reward_claims where user_id = v_me and claim_date = v_today) then
    return jsonb_build_object('ok', false, 'error', 'Already claimed today');
  end if;

  select streak + 1 into v_streak
  from public.daily_reward_claims
  where user_id = v_me and claim_date = v_today - 1;
  v_streak := coalesce(v_streak, 1);

  v_credits := 50 + least(v_streak - 1, 6) * 10;

  select (booster_since is not null or role = 'admin') into v_booster from public.profiles where id = v_me;
  if coalesce(v_booster, false) then
    v_credits := floor(v_credits * 1.5)::int;
  end if;

  insert into public.daily_reward_claims (user_id, claim_date, streak, credits_awarded)
  values (v_me, v_today, v_streak, v_credits);

  perform public.award_credits(v_me, v_credits, 'daily_reward', 'daily', v_today::text,
    jsonb_build_object('streak', v_streak, 'booster_bonus', coalesce(v_booster, false)));
  perform public.add_xp(v_me, 20);
  perform public.ensure_daily_challenges();
  perform public.check_achievements(v_me);

  return jsonb_build_object('ok', true, 'credits', v_credits, 'streak', v_streak,
                            'booster_bonus', coalesce(v_booster, false));
end;
$$;
revoke execute on function public.claim_daily_reward() from public, anon;
grant execute on function public.claim_daily_reward() to authenticated;


create or replace function public.grant_booster_drops()
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_month date := date_trunc('month', now() at time zone 'utc')::date;
  v_item uuid;
  v_granted int := 0;
begin
  select item_id into v_item from public.booster_drops where month = v_month;
  if v_item is null then
    return jsonb_build_object('ok', true, 'month', v_month, 'granted', 0, 'reason', 'no drop configured');
  end if;

  with granted as (
    insert into public.inventory_items (user_id, item_id)
    select p.id, v_item
    from public.profiles p
    where p.booster_since is not null or p.role = 'admin'
    on conflict (user_id, item_id) do nothing
    returning user_id
  ),
  told as (
    insert into public.notifications (user_id, type, title, body, data)
    select g.user_id, 'badge', 'Booster drop!',
           format('This month''s exclusive booster cosmetic is yours: %s.',
                  (select name from public.shop_items where id = v_item)),
           jsonb_build_object('slug', (select slug from public.shop_items where id = v_item))
    from granted g
    returning 1
  )
  select count(*) into v_granted from told;

  return jsonb_build_object('ok', true, 'month', v_month, 'granted', v_granted);
end;
$$;

-- Called by the cron job with the service key, never by a browser.
revoke execute on function public.grant_booster_drops() from public, anon, authenticated;
grant execute on function public.grant_booster_drops() to service_role;


create or replace function public.my_booster_drop()
returns jsonb
language sql stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'boosting', (select (booster_since is not null or role = 'admin') from public.profiles where id = auth.uid()),
    'month', to_char(date_trunc('month', now() at time zone 'utc'), 'YYYY-MM'),
    'item', (
      select jsonb_build_object(
        'slug', si.slug, 'name', si.name, 'description', si.description,
        'kind', si.kind, 'rarity', si.rarity, 'preview', si.preview,
        'owned', exists (
          select 1 from public.inventory_items ii
          where ii.item_id = si.id and ii.user_id = auth.uid()
        )
      )
      from public.booster_drops bd
      join public.shop_items si on si.id = bd.item_id
      where bd.month = date_trunc('month', now() at time zone 'utc')::date
    )
  );
$$;

revoke execute on function public.my_booster_drop() from public, anon;
grant execute on function public.my_booster_drop() to authenticated;


-- Keep already-selected Premium on level 25 accounts when Discord boosts stop.
-- Replace 0114's narrower downgrade trigger with a level-aware version.
create or replace function public.sync_restricted_theme_on_profile_change()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if old.booster_since is not distinct from new.booster_since
     and old.role is not distinct from new.role
     and old.level is not distinct from new.level then return new; end if;

  if new.booster_since is null and new.level < 25 and new.role not in ('admin','moderator') then
    update public.user_settings set site_theme='default'
    where user_id=new.id and site_theme='premium';
  end if;
  return new;
end;
$$;
revoke execute on function public.sync_restricted_theme_on_profile_change() from public, anon, authenticated;
drop trigger if exists profiles_sync_restricted_theme on public.profiles;
create trigger profiles_sync_restricted_theme
after update of booster_since, role, level on public.profiles
for each row execute function public.sync_restricted_theme_on_profile_change();
