-- 0049_avatar_decorations.sql
-- Layered avatar decorations (roadmap v1.5.0).
--
-- Frames ring the avatar; a decoration sits *on top of* it and is allowed to
-- overhang - ears above the head, a halo floating over it, flames licking up
-- the sides. That difference is why this is a new kind rather than more
-- avatar_frame slugs: the two layer together, and a player can wear one of
-- each at once. `profiles.equipped` is one slug per kind, so a new kind is
-- exactly what buys that.
--
-- Nothing here is a new mechanism. Ownership, equipping and the staff-only
-- gate all go through the existing equip_item()/purchase_shop_item() path;
-- 'decoration' just has to be admitted to two allowlists that were written
-- before the kind existed.

alter table public.shop_items drop constraint if exists shop_items_kind_check;
alter table public.shop_items add constraint shop_items_kind_check check (
  kind in (
    'avatar_frame', 'profile_theme', 'badge', 'effect', 'banner', 'nameplate',
    'collectible', 'xp_boost', 'credit_boost', 'track', 'decoration'
  )
);

-- equip_item's allowlist decides what may be worn. Re-declared from 0011 with
-- 'decoration' added and nothing else changed.
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
  if v_item.kind not in ('avatar_frame', 'profile_theme', 'badge', 'effect', 'banner', 'nameplate', 'decoration') then
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

-- The opening set. Drawn in the client (inline SVG + CSS) rather than hosted as
-- images, so they stay crisp at every avatar size and cost no extra requests -
-- the same approach the frames and profile effects already take.
insert into public.shop_items
  (slug, name, description, kind, price, rarity, preview, seasonal, available, sort_weight, staff_only, min_level)
values
  ('deco-cat-ears', 'Cat Ears', 'A pair of ears perched on top of your avatar. Non-negotiable.', 'decoration', 900, 'common', '{"decoration":"cat-ears","colors":["#f472b6","#1f2937"]}', false, true, 34, false, 0),
  ('deco-halo', 'Halo', 'A soft golden ring floating above you. Innocence not included.', 'decoration', 1400, 'rare', '{"decoration":"halo","colors":["#fde68a","#f59e0b"]}', false, true, 33, false, 0),
  ('deco-crown', 'Crown', 'Solid gold, worn at a slight angle.', 'decoration', 2200, 'epic', '{"decoration":"crown","colors":["#fbbf24","#b45309"]}', false, true, 32, false, 0),
  ('deco-sparkles', 'Sparkles', 'Three little stars that orbit your avatar.', 'decoration', 1600, 'rare', '{"decoration":"sparkles","colors":["#a78bfa","#f0abfc"]}', false, true, 31, false, 0),
  ('deco-flames', 'Flames', 'You are, quite literally, on fire.', 'decoration', 2600, 'epic', '{"decoration":"flames","colors":["#f97316","#fbbf24"]}', false, true, 30, false, 0),
  ('deco-headphones', 'Headphones', 'For the players who never stop.', 'decoration', 1200, 'common', '{"decoration":"headphones","colors":["#38bdf8","#1e293b"]}', false, true, 29, false, 0),
  ('deco-storm', 'Thundercloud', 'A small personal storm. It follows you everywhere.', 'decoration', 3200, 'legendary', '{"decoration":"storm","colors":["#94a3b8","#fbbf24"]}', false, true, 28, false, 0)
on conflict (slug) do nothing;
