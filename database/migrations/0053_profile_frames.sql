-- 0053_profile_frames.sql
-- Decorative frames around the whole profile card (roadmap v1.5.0).
--
-- The third and outermost cosmetic layer on a profile. To be clear about the
-- distinction, since the names are close:
--
--   avatar_frame   rings the profile picture          (live since 0004)
--   decoration     sits on top of the picture         (0049)
--   profile_frame  wraps the entire card              (here)
--
-- All three can be worn together, and that is exactly why each is its own
-- kind: profiles.equipped holds one slug per kind, so separate kinds are what
-- lets them stack rather than overwrite each other.
--
-- Same shape as 0049 and for the same reason - no new mechanism. Ownership,
-- the staff-only gate, level gating via min_level, and equipping all go
-- through the paths that already exist; 'profile_frame' only has to be
-- admitted to the kind constraint and to equip_item's allowlist.

alter table public.shop_items drop constraint if exists shop_items_kind_check;
alter table public.shop_items add constraint shop_items_kind_check check (
  kind in (
    'avatar_frame', 'profile_theme', 'badge', 'effect', 'banner', 'nameplate',
    'collectible', 'xp_boost', 'credit_boost', 'track', 'decoration', 'profile_frame'
  )
);

create or replace function public.equip_item(p_slug text)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_item public.shop_items;
begin
  select si.* into v_item
  from public.shop_items si
  join public.inventory_items ii on ii.item_id = si.id and ii.user_id = v_me
  where si.slug = p_slug
    and (ii.expires_at is null or ii.expires_at > now());

  if v_item.id is null then
    return jsonb_build_object('ok', false, 'error', 'You do not own this item');
  end if;
  if v_item.kind not in (
    'avatar_frame', 'profile_theme', 'badge', 'effect', 'banner', 'nameplate',
    'decoration', 'profile_frame'
  ) then
    return jsonb_build_object('ok', false, 'error', 'This item cannot be equipped');
  end if;
  if v_item.staff_only and not public.is_staff() then
    return jsonb_build_object('ok', false, 'error', 'This item is staff-only');
  end if;

  update public.profiles
  set equipped = equipped || jsonb_build_object(v_item.kind, v_item.slug)
  where id = v_me;

  return jsonb_build_object('ok', true);
end;
$$;

revoke execute on function public.equip_item(text) from public, anon;
grant execute on function public.equip_item(text) to authenticated;

-- The opening set. Drawn as CSS gradients rather than border images, so they
-- stay sharp at any card width and add no requests.
insert into public.shop_items
  (slug, name, description, kind, price, rarity, preview, seasonal, available, sort_weight, staff_only, min_level)
values
  ('pframe-gold', 'Gilded', 'A brushed gold border for your whole profile.', 'profile_frame', 2400, 'rare', '{"colors":["#fbbf24","#b45309"]}', false, true, 27, false, 0),
  ('pframe-obsidian', 'Obsidian', 'Understated, dark, and slightly reflective.', 'profile_frame', 2400, 'rare', '{"colors":["#4b5563","#0b0a12"]}', false, true, 26, false, 0),
  ('pframe-sakura', 'Sakura', 'Soft pinks, like petals round the edge.', 'profile_frame', 3000, 'epic', '{"colors":["#fbcfe8","#f472b6"]}', true, true, 25, false, 0),
  ('pframe-tide', 'Tide', 'Blues and greens, drifting slowly round the card.', 'profile_frame', 3600, 'epic', '{"colors":["#0ea5e9","#34d399"]}', false, true, 24, false, 0),
  ('pframe-ember', 'Ember', 'A slow burn around the whole profile.', 'profile_frame', 3600, 'epic', '{"colors":["#f97316","#ef4444"]}', false, true, 23, false, 0),
  -- Level 40 sits between the L30 vanity URL and the L50 mythic, filling the
  -- longest gap in the milestone ladder.
  ('pframe-prism', 'Prism', 'A full spectrum, turning. Unlocked at level 40.', 'profile_frame', 6000, 'legendary', '{"colors":["#a855f7","#f43f5e"]}', false, true, 22, false, 40)
on conflict (slug) do nothing;
