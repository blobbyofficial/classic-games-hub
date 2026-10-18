-- 0114_single_release_theme_entitlements.sql
-- Deploy AFTER 0111, 0112, 0113. Enables all five themes together.
-- Retro earns a permanent unlock at level 25; Premium checks CURRENT profile
-- booster_since (maintained by existing Discord sync) or staff role.
--
-- Locked entitlements are stored separately from profiles and user_settings:
-- the ordinary client cannot grant them with an UPDATE or direct insert.
create table if not exists public.theme_unlocks (
  user_id uuid primary key references auth.users(id) on delete cascade,
  retro_unlocked_at timestamptz not null default now()
);
alter table public.theme_unlocks enable row level security;
revoke all on public.theme_unlocks from public, anon, authenticated;
-- Only the account holder may read the unlock; writes happen under trusted
-- definer triggers. No RLS INSERT/UPDATE/DELETE policies are provided.
grant select on public.theme_unlocks to authenticated;
drop policy if exists theme_unlocks_owner_read on public.theme_unlocks;
create policy theme_unlocks_owner_read on public.theme_unlocks
  for select to authenticated using (user_id = (select auth.uid()));

create or replace function public.grant_retro_theme_on_level()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.level >= 25 then
    insert into public.theme_unlocks(user_id)
    values (new.id)
    on conflict (user_id) do nothing;
  end if;
  return new;
end;
$$;
revoke execute on function public.grant_retro_theme_on_level() from public, anon, authenticated;
drop trigger if exists profiles_award_retro_theme on public.profiles;
create trigger profiles_award_retro_theme
after insert or update of level on public.profiles
for each row execute function public.grant_retro_theme_on_level();

-- Retro grants for all already-qualified accounts. Re-running is safe.
insert into public.theme_unlocks(user_id)
select id from public.profiles where level >= 25
on conflict (user_id) do nothing;

-- Expose only the requesting user's entitlement information to the app.
-- No role/status fields or anyone else's account information are returned.
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
  select coalesce(p.booster_since is not null or p.role in ('admin','moderator'),false),
         coalesce(p.level >= 25,false) or exists(
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

-- This trigger is the final server-side authority even if a player edits the
-- browser, invokes PostgREST directly, or sends a forged Server Action.
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
    select coalesce(booster_since is not null or role in ('admin','moderator'),false)
      into v_allowed from public.profiles where id = new.user_id;
    if coalesce(v_allowed,false) then return new; end if;
    raise exception 'theme_locked' using message = 'Premium requires an active Discord server boost';
  end if;

  if new.site_theme = 'retro' then
    select coalesce(level >= 25,false) or exists(
      select 1 from public.theme_unlocks where user_id = new.user_id
    ) into v_allowed from public.profiles where id = new.user_id;
    if coalesce(v_allowed,false) then return new; end if;
    raise exception 'theme_locked' using message = 'Retro unlocks at level 25';
  end if;

  raise exception 'invalid_theme' using message = 'Unknown site theme';
end;
$$;
revoke execute on function public.check_site_theme() from public, anon, authenticated;
drop trigger if exists user_settings_check_theme on public.user_settings;
create trigger user_settings_check_theme
before insert or update of site_theme on public.user_settings
for each row execute function public.check_site_theme();

-- Revalidate saved restricted choices when booster status/role changes. A
-- returning booster can reselect Premium; nobody loses unrelated settings.
-- This is both cosmetic enforcement and avoids a stale Premium session.
create or replace function public.sync_restricted_theme_on_profile_change()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if old.booster_since is not distinct from new.booster_since
     and old.role is not distinct from new.role then return new; end if;

  if new.booster_since is null and new.role not in ('admin','moderator') then
    update public.user_settings set site_theme='default'
    where user_id=new.id and site_theme='premium';
  end if;
  return new;
end;
$$;
revoke execute on function public.sync_restricted_theme_on_profile_change() from public, anon, authenticated;
drop trigger if exists profiles_sync_restricted_theme on public.profiles;
create trigger profiles_sync_restricted_theme
after update of booster_since, role on public.profiles
for each row execute function public.sync_restricted_theme_on_profile_change();

-- Clean up old Premium selections left behind by a previous integration.
update public.user_settings s set site_theme='default'
where s.site_theme='premium' and not exists (
  select 1 from public.profiles p where p.id=s.user_id
    and (p.booster_since is not null or p.role in ('admin','moderator'))
);
