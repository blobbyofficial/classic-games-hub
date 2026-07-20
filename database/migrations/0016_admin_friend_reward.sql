-- 0016_admin_friend_reward.sql
-- Living economy & events — friend-of-admin rewards.
--
-- Players who become friends with an admin earn an exclusive, non-purchasable
-- "Admin's Circle" badge. Implemented as a trigger on friendships so every
-- acceptance path (direct accept, reciprocal auto-accept) is covered, plus a
-- one-time backfill for existing admin friendships.

insert into public.shop_items (slug, name, description, kind, price, rarity, preview, seasonal, available, sort_weight, staff_only)
values (
  'badge-admin-friend', 'Admin''s Circle', 'Earned by befriending a Hub admin.',
  'badge', 0, 'epic', '{"icon":"heart-handshake","colors":["#8b5cf6","#ec4899"]}', false, false, 0, false
)
on conflict (slug) do nothing;

create or replace function public.grant_admin_friend_badge()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req_admin boolean;
  v_addr_admin boolean;
  v_target uuid;
  v_item uuid;
  v_inserted int;
begin
  if new.status <> 'accepted' then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.status = 'accepted' then
    return new;
  end if;

  select role = 'admin' into v_req_admin from public.profiles where id = new.requester_id;
  select role = 'admin' into v_addr_admin from public.profiles where id = new.addressee_id;
  v_req_admin := coalesce(v_req_admin, false);
  v_addr_admin := coalesce(v_addr_admin, false);

  if v_addr_admin and not v_req_admin then
    v_target := new.requester_id;
  elsif v_req_admin and not v_addr_admin then
    v_target := new.addressee_id;
  else
    return new; -- neither admin, or both admin
  end if;

  select id into v_item from public.shop_items where slug = 'badge-admin-friend';
  if v_item is null then
    return new;
  end if;

  insert into public.inventory_items (user_id, item_id)
  values (v_target, v_item)
  on conflict (user_id, item_id) do nothing;
  get diagnostics v_inserted = row_count;

  if v_inserted > 0 then
    insert into public.notifications (user_id, type, title, body, data)
    values (v_target, 'badge', 'New badge unlocked!',
      'You befriended an admin and earned the Admin''s Circle badge.',
      jsonb_build_object('slug', 'badge-admin-friend', 'icon', 'heart-handshake'));
  end if;

  return new;
end;
$$;

create trigger friendships_admin_friend_badge
after insert or update of status on public.friendships
for each row execute function public.grant_admin_friend_badge();

-- Backfill existing accepted admin friendships (no notification spam).
insert into public.inventory_items (user_id, item_id)
select g.nonadmin_id, (select id from public.shop_items where slug = 'badge-admin-friend')
from (
  select f.requester_id, f.addressee_id, pr.role as req_role, pa.role as addr_role
  from public.friendships f
  join public.profiles pr on pr.id = f.requester_id
  join public.profiles pa on pa.id = f.addressee_id
  where f.status = 'accepted'
) x
cross join lateral (
  select case
    when x.addr_role = 'admin' and x.req_role <> 'admin' then x.requester_id
    when x.req_role = 'admin' and x.addr_role <> 'admin' then x.addressee_id
    else null
  end as nonadmin_id
) g
where g.nonadmin_id is not null
on conflict (user_id, item_id) do nothing;
