-- 0059_expressive_extras.sql
-- Roadmap v1.5.0 "More expressive extras" - the last of the stretch-cosmetic
-- backlog: profile entrance animations, cursor trails, and looping profile
-- music.
--
-- The music half needs no new shop rows. The v1.3 track library already exists
-- as the 'track' kind; it was only ever playable from the shell player, so all
-- that is missing is making a track equippable, which turns it into "the tune
-- that plays on my profile". One item, two places it can be used.
--
-- Entrances and trails are new kinds rather than new 'effect' rows, because
-- profiles.equipped holds one slug per kind and these are meant to be worn
-- alongside an effect, not instead of one.

alter table public.shop_items drop constraint if exists shop_items_kind_check;
alter table public.shop_items add constraint shop_items_kind_check check (
  kind in (
    'avatar_frame', 'profile_theme', 'badge', 'effect', 'banner', 'nameplate',
    'collectible', 'xp_boost', 'credit_boost', 'track', 'decoration',
    'profile_frame', 'entrance', 'cursor_trail'
  )
);

-- equip_item: same shape as 0053, with the two new kinds and 'track' added to
-- the equippable list. Boosts and collectibles stay unequippable - they are
-- consumed or simply owned, and there is no slot for them to sit in.
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
    'decoration', 'profile_frame', 'entrance', 'cursor_trail', 'track'
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

-- Entrances: how the profile card arrives when someone opens it. Pure CSS
-- keyframes, so they cost nothing at runtime and vanish under reduced motion.
insert into public.shop_items
  (slug, name, description, kind, price, rarity, preview, seasonal, available, sort_weight, staff_only, min_level)
values
  ('entrance-rise', 'Rise', 'Your profile lifts gently into place.', 'entrance', 1600, 'common', '{"colors":["#a78bfa","#7a3dff"]}', false, true, 21, false, 0),
  ('entrance-unfold', 'Unfold', 'The card tilts open like a book.', 'entrance', 2200, 'rare', '{"colors":["#22d3ee","#0ea5e9"]}', false, true, 20, false, 0),
  ('entrance-sweep', 'Sweep', 'A band of light passes across as you land.', 'entrance', 2600, 'rare', '{"colors":["#fbbf24","#f59e0b"]}', false, true, 19, false, 0),
  ('entrance-glitch', 'Glitch', 'Signal trouble, then it resolves.', 'entrance', 3200, 'epic', '{"colors":["#f472b6","#22d3ee"]}', false, true, 18, false, 0),
  -- Level 25 sits in the gap between the L20 loadout presets and the L30
  -- vanity URL, which had no cosmetic of its own.
  ('entrance-warp', 'Warp', 'You arrive from somewhere else entirely. Unlocked at level 25.', 'entrance', 4200, 'legendary', '{"colors":["#a855f7","#f43f5e"]}', false, true, 17, false, 25)
on conflict (slug) do nothing;

-- Cursor trails: follow the pointer while someone is looking at your profile.
-- Drawn on one canvas, pointer-events-none, and skipped under reduced motion.
insert into public.shop_items
  (slug, name, description, kind, price, rarity, preview, seasonal, available, sort_weight, staff_only, min_level)
values
  ('trail-sparkle', 'Sparkle', 'Small gold twinkles that fade behind the cursor.', 'cursor_trail', 1500, 'common', '{"colors":["#fbbf24","#fde68a"]}', false, true, 16, false, 0),
  ('trail-comet', 'Comet', 'A bright head pulling a soft tail.', 'cursor_trail', 2000, 'rare', '{"colors":["#22d3ee","#7a3dff"]}', false, true, 15, false, 0),
  ('trail-bubbles', 'Bubbles', 'Little bubbles that drift upward and pop.', 'cursor_trail', 2000, 'rare', '{"colors":["#38bdf8","#a5f3fc"]}', false, true, 14, false, 0),
  ('trail-ribbon', 'Ribbon', 'A smooth neon line that follows you around.', 'cursor_trail', 2800, 'epic', '{"colors":["#f472b6","#a855f7"]}', false, true, 13, false, 0)
on conflict (slug) do nothing;
