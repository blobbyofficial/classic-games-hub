-- 0020: Discord-linked detection + rich presence & visibility settings
--
-- `discord_linked` denormalises "has a linked Discord identity" onto profiles
-- so it's cheap to read in search results, banners and the age/booster gates.
-- It is kept in sync by an exception-safe trigger on auth.identities (a
-- denormalisation hiccup must never block a login / identity change).

alter table public.profiles
  add column if not exists discord_linked boolean not null default false;

-- Presence + friends-list visibility live on user_settings.
alter table public.user_settings
  add column if not exists presence_status text not null default 'auto'
    check (presence_status in ('auto','online','away','dnd','sleep','invisible')),
  add column if not exists presence_visibility text not null default 'everyone'
    check (presence_visibility in ('everyone','friends','nobody')),
  add column if not exists friends_visibility text not null default 'public'
    check (friends_visibility in ('private','friends','followers','public'));

create or replace function public.sync_discord_linked()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  begin
    if tg_op = 'DELETE' then
      update public.profiles p set discord_linked = exists (
        select 1 from auth.identities i where i.user_id = old.user_id and i.provider = 'discord'
      ) where p.id = old.user_id;
    elsif new.provider = 'discord' then
      update public.profiles set discord_linked = true where id = new.user_id;
    end if;
  exception when others then
    null; -- never block an identity change on a denormalisation hiccup
  end;
  return null;
end;
$$;

drop trigger if exists identities_sync_discord on auth.identities;
create trigger identities_sync_discord
after insert or delete on auth.identities
for each row execute function public.sync_discord_linked();

-- Backfill existing accounts.
update public.profiles p set discord_linked = true
where exists (select 1 from auth.identities i where i.user_id = p.id and i.provider = 'discord')
  and p.discord_linked is distinct from true;
