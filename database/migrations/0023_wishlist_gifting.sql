-- 0023: Wishlist + gifting. Gifting a store item costs 75% of its price so
-- gifting is cheaper than buying for yourself.

create table if not exists public.wishlist_items (
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_id uuid not null references public.shop_items(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, item_id)
);
alter table public.wishlist_items enable row level security;
create policy "read wishlists" on public.wishlist_items for select using (true);
create policy "manage own wishlist" on public.wishlist_items
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create or replace function public.gift_item(p_slug text, p_to uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := auth.uid();
  v_item public.shop_items;
  v_price int;
  v_bal bigint;
begin
  if v_me is null then raise exception 'authentication required'; end if;
  if v_me = p_to then return jsonb_build_object('ok', false, 'error', 'You cannot gift yourself'); end if;
  select * into v_item from public.shop_items where slug = p_slug and available;
  if v_item.id is null then return jsonb_build_object('ok', false, 'error', 'Item not found'); end if;
  if v_item.kind in ('xp_boost','credit_boost') then return jsonb_build_object('ok', false, 'error', 'Boosts cannot be gifted'); end if;
  if v_item.staff_only then return jsonb_build_object('ok', false, 'error', 'That item cannot be gifted'); end if;
  if public.is_blocked_either_way(v_me, p_to) then return jsonb_build_object('ok', false, 'error', 'Unable to gift this player'); end if;
  if exists (select 1 from public.inventory_items where user_id = p_to and item_id = v_item.id)
    then return jsonb_build_object('ok', false, 'error', 'They already own this'); end if;

  v_price := ceil(v_item.price * 0.75);
  select credits into v_bal from public.profiles where id = v_me for update;
  if v_bal < v_price then return jsonb_build_object('ok', false, 'error', 'Not enough credits'); end if;

  perform public.award_credits(v_me, -v_price, 'gift_sent', 'shop_item', v_item.slug, jsonb_build_object('to', p_to));
  insert into public.inventory_items (user_id, item_id) values (p_to, v_item.id) on conflict do nothing;
  -- remove from recipient's wishlist if present
  delete from public.wishlist_items where user_id = p_to and item_id = v_item.id;
  insert into public.notifications (user_id, type, title, body, data)
  values (p_to, 'gift', 'You received a gift!', format('Someone gifted you %s', v_item.name),
          jsonb_build_object('slug', v_item.slug, 'from', v_me));
  return jsonb_build_object('ok', true, 'price', v_price);
end; $$;
revoke execute on function public.gift_item(text, uuid) from public, anon;
grant execute on function public.gift_item(text, uuid) to authenticated;
