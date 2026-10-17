-- 0080: serialize credit purchases and avoid charging for a duplicate paid gift.
-- Both functions remain SECURITY DEFINER; existing auth, entitlement and price checks preserved.
-- Apply to isolated staging first; exercise parallel purchases and gifts before production.

create or replace function public.purchase_shop_item(p_slug text)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_item public.shop_items;
  v_credits bigint;
  v_boost boolean;
  v_level int;
  v_cap int;
  v_state public.user_boosts%rowtype;
  v_queued boolean := false;
begin
  if v_me is null then
    raise exception 'authentication required';
  end if;

  select * into v_item from public.shop_items where slug = p_slug and available;
  if v_item.id is null then
    return jsonb_build_object('ok', false, 'error', 'Item not available');
  end if;

  if v_item.staff_only and not public.is_staff() then
    return jsonb_build_object('ok', false, 'error', 'This item is staff-only');
  end if;

  select level into v_level from public.profiles where id = v_me;
  if coalesce(v_item.min_level, 0) > coalesce(v_level, 1) then
    return jsonb_build_object('ok', false, 'error',
      'Reach level ' || v_item.min_level || ' to unlock this');
  end if;

  v_boost := v_item.kind in ('xp_boost', 'credit_boost');

  if not v_boost and exists (
    select 1 from public.inventory_items where user_id = v_me and item_id = v_item.id
  ) then
    return jsonb_build_object('ok', false, 'error', 'You already own this item');
  end if;

  -- Serialize concurrent spending for this player before validating balance.
  select credits into v_credits from public.profiles where id = v_me for update;
  if not found then
    raise exception 'profile not found';
  end if;
  -- The earlier ownership check happened before taking the account lock.
  -- A competing purchase may have committed while this transaction waited.
  -- Recheck after locking, before debiting, so a duplicate is a clean no-op
  -- rather than a unique-constraint exception that leaks through the UI.
  if not v_boost and exists (
    select 1 from public.inventory_items where user_id = v_me and item_id = v_item.id
  ) then
    return jsonb_build_object('ok', false, 'error', 'You already own this item');
  end if;
  if v_credits < v_item.price then
    return jsonb_build_object('ok', false, 'error', 'Not enough credits');
  end if;

  perform public.award_credits(v_me, -v_item.price, 'shop_purchase', 'shop_item', v_item.slug);

  if v_boost then
    -- Stacking + queue: a fresh boost starts a ×2 window; more purchases stack
    -- the multiplier (to 5×, or 10× for Discord boosters); beyond the cap they
    -- queue and take over automatically when the window ends.
    perform public.settle_user_boosts(v_me);
    select case when booster_since is not null then 9 else 4 end into v_cap
    from public.profiles where id = v_me;

    insert into public.user_boosts (user_id, kind, stacks, expires_at, queued)
    values (v_me, v_item.kind, 0, null, 0)
    on conflict (user_id, kind) do nothing;

    select * into v_state from public.user_boosts
    where user_id = v_me and kind = v_item.kind for update;

    if v_state.expires_at is null or v_state.expires_at <= now() then
      update public.user_boosts set stacks = 1, expires_at = now() + interval '24 hours'
      where user_id = v_me and kind = v_item.kind;
    elsif v_state.stacks < v_cap then
      update public.user_boosts set stacks = stacks + 1
      where user_id = v_me and kind = v_item.kind;
    else
      update public.user_boosts set queued = queued + 1
      where user_id = v_me and kind = v_item.kind;
      v_queued := true;
    end if;

    -- Keep the historical inventory record too.
    insert into public.inventory_items (user_id, item_id, expires_at)
    values (v_me, v_item.id, now() + interval '24 hours')
    on conflict (user_id, item_id)
    do update set expires_at = greatest(public.inventory_items.expires_at, now()) + interval '24 hours';
  else
    insert into public.inventory_items (user_id, item_id) values (v_me, v_item.id);
  end if;

  insert into public.activity_events (user_id, type, data)
  values (v_me, 'item_purchased', jsonb_build_object('slug', v_item.slug, 'name', v_item.name, 'rarity', v_item.rarity));

  perform public.check_achievements(v_me);

  return jsonb_build_object('ok', true, 'item', v_item.slug, 'queued', v_queued);
end;
$$;

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
  -- Another sender might have gifted this item after our initial ownership check.
  -- An exception rolls back the entire transaction, including the debit.
  insert into public.inventory_items (user_id, item_id) values (p_to, v_item.id) on conflict do nothing;
  if not found then
    raise exception 'Gift not completed: recipient already owns this item';
  end if;
  -- remove from recipient's wishlist if present
  delete from public.wishlist_items where user_id = p_to and item_id = v_item.id;
  insert into public.notifications (user_id, type, title, body, data)
  values (p_to, 'gift', 'You received a gift!', format('Someone gifted you %s', v_item.name),
          jsonb_build_object('slug', v_item.slug, 'from', v_me));
  return jsonb_build_object('ok', true, 'price', v_price);
end; $$;

-- Restore explicit client exposure constraints when replacing security-definer functions.
revoke execute on function public.purchase_shop_item(text) from public, anon;
grant execute on function public.purchase_shop_item(text) to authenticated;
revoke execute on function public.gift_item(text, uuid) from public, anon;
grant execute on function public.gift_item(text, uuid) to authenticated;
