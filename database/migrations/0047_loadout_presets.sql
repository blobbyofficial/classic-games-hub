-- 0047_loadout_presets.sql
-- The last two level milestones, finishing what v1.3.0 started.
--
-- L20 unlocks extra loadout preset slots. A preset is a saved snapshot of
-- profiles.equipped, so a player can switch their whole look in one tap
-- instead of equipping five items one at a time.
--
-- The slot limit lives in preset_slot_limit() and nowhere else. Every RPC
-- below calls it, and the UI reads it rather than hard-coding a number, so
-- there is exactly one place to change if the milestone moves.
--
-- The security-relevant part is apply_loadout_preset(). A preset is a stored
-- map of slugs, and a stored slug is not proof of ownership: items expire
-- (boosts), can be refunded, and staff-only items must stay staff-only. So
-- applying a preset re-derives the equipped map from what the caller actually
-- owns right now rather than trusting what was saved. Anything no longer
-- owned is silently dropped instead of failing the whole apply - a preset
-- saved six months ago should still work for the parts that are still valid.
--
-- L50 grants the mythic 'effect-singularity', which 0036 already wired into
-- add_xp on the way past level 50. Two gaps are closed here: players who were
-- already past 50 when 0036 landed never crossed the boundary and so never
-- received it, and the item is seeded with available=false, which is correct
-- (it is unbuyable) but meant nothing ever surfaced it.

create table if not exists public.loadout_presets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 32),
  equipped jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists loadout_presets_user_name_idx
  on public.loadout_presets (user_id, lower(btrim(name)));
create index if not exists loadout_presets_user_idx
  on public.loadout_presets (user_id, created_at);

alter table public.loadout_presets enable row level security;

-- Readable only by their owner. There is deliberately no insert/update/delete
-- policy: every write goes through the RPCs below, which is what enforces the
-- slot limit. A direct insert would bypass it.
drop policy if exists "loadout_presets_select_own" on public.loadout_presets;
create policy "loadout_presets_select_own" on public.loadout_presets
  for select using (user_id = auth.uid());

-- ── The milestone itself ───────────────────────────────────────────────────

create or replace function public.preset_slot_limit(p_user uuid)
returns int
language sql stable
security definer
set search_path = public
as $$
  select case
    when p.role in ('admin', 'moderator') then 99
    when coalesce(p.level, 1) >= 20 then 5
    else 1
  end
  from public.profiles p
  where p.id = p_user;
$$;

revoke execute on function public.preset_slot_limit(uuid) from public, anon;
grant execute on function public.preset_slot_limit(uuid) to authenticated;

-- ── Writes ─────────────────────────────────────────────────────────────────

create or replace function public.save_loadout_preset(p_name text, p_id uuid default null)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_name text := btrim(coalesce(p_name, ''));
  v_equipped jsonb;
  v_count int;
  v_limit int;
  v_id uuid;
begin
  if v_me is null then
    return jsonb_build_object('ok', false, 'error', 'You must be signed in');
  end if;
  if length(v_name) = 0 or length(v_name) > 32 then
    return jsonb_build_object('ok', false, 'error', 'Give the preset a name of 1 to 32 characters');
  end if;

  select equipped into v_equipped from public.profiles where id = v_me;
  v_limit := public.preset_slot_limit(v_me);

  if p_id is not null then
    update public.loadout_presets
    set name = v_name, equipped = coalesce(v_equipped, '{}'::jsonb), updated_at = now()
    where id = p_id and user_id = v_me
    returning id into v_id;

    if v_id is null then
      return jsonb_build_object('ok', false, 'error', 'That preset no longer exists');
    end if;
    return jsonb_build_object('ok', true, 'id', v_id);
  end if;

  select count(*) into v_count from public.loadout_presets where user_id = v_me;
  if v_count >= v_limit then
    return jsonb_build_object(
      'ok', false,
      'error', case
        when v_limit = 1 then 'Reach level 20 to save more than one preset'
        else format('You have used all %s preset slots - delete one first', v_limit)
      end
    );
  end if;

  insert into public.loadout_presets (user_id, name, equipped)
  values (v_me, v_name, coalesce(v_equipped, '{}'::jsonb))
  returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id);
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'error', 'You already have a preset with that name');
end;
$$;

revoke execute on function public.save_loadout_preset(text, uuid) from public, anon;
grant execute on function public.save_loadout_preset(text, uuid) to authenticated;

create or replace function public.apply_loadout_preset(p_id uuid)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_saved jsonb;
  v_next jsonb := '{}'::jsonb;
  v_staff boolean := public.is_staff();
  v_kind text;
  v_slug text;
  v_ok boolean;
  v_dropped int := 0;
begin
  if v_me is null then
    return jsonb_build_object('ok', false, 'error', 'You must be signed in');
  end if;

  select equipped into v_saved
  from public.loadout_presets
  where id = p_id and user_id = v_me;

  if v_saved is null then
    return jsonb_build_object('ok', false, 'error', 'That preset no longer exists');
  end if;

  -- Re-derive from current ownership rather than trusting the saved slugs.
  for v_kind, v_slug in select key, value from jsonb_each_text(v_saved)
  loop
    -- name_style and a custom hex banner are stored in `equipped` but are not
    -- shop items, so they carry through as-is; there is nothing to own.
    if v_kind = 'name_style' or (v_kind = 'banner' and v_slug ~ '^#[0-9a-fA-F]{6}$') then
      v_next := v_next || jsonb_build_object(v_kind, v_slug);
      continue;
    end if;

    select true into v_ok
    from public.shop_items si
    join public.inventory_items ii on ii.item_id = si.id and ii.user_id = v_me
    where si.slug = v_slug
      and si.kind = v_kind
      and (ii.expires_at is null or ii.expires_at > now())
      and (not si.staff_only or v_staff)
    limit 1;

    if coalesce(v_ok, false) then
      v_next := v_next || jsonb_build_object(v_kind, v_slug);
    else
      v_dropped := v_dropped + 1;
    end if;
    v_ok := null;
  end loop;

  update public.profiles set equipped = v_next where id = v_me;

  return jsonb_build_object('ok', true, 'equipped', v_next, 'dropped', v_dropped);
end;
$$;

revoke execute on function public.apply_loadout_preset(uuid) from public, anon;
grant execute on function public.apply_loadout_preset(uuid) to authenticated;

create or replace function public.delete_loadout_preset(p_id uuid)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_id uuid;
begin
  delete from public.loadout_presets
  where id = p_id and user_id = v_me
  returning id into v_id;

  if v_id is null then
    return jsonb_build_object('ok', false, 'error', 'That preset no longer exists');
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

revoke execute on function public.delete_loadout_preset(uuid) from public, anon;
grant execute on function public.delete_loadout_preset(uuid) to authenticated;

-- Presets plus the caller's current slot limit, in one round trip.
create or replace function public.my_loadout_presets()
returns jsonb
language plpgsql stable
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
begin
  if v_me is null then
    return jsonb_build_object('presets', '[]'::jsonb, 'limit', 0);
  end if;

  return jsonb_build_object(
    'presets', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', lp.id,
        'name', lp.name,
        'equipped', lp.equipped,
        'updated_at', lp.updated_at
      ) order by lp.created_at)
      from public.loadout_presets lp
      where lp.user_id = v_me
    ), '[]'::jsonb),
    'limit', public.preset_slot_limit(v_me)
  );
end;
$$;

revoke execute on function public.my_loadout_presets() from public, anon;
grant execute on function public.my_loadout_presets() to authenticated;

-- ── L50: backfill the players add_xp never saw cross the line ──────────────

insert into public.inventory_items (user_id, item_id)
select p.id, si.id
from public.profiles p
cross join public.shop_items si
where si.slug = 'effect-singularity'
  and p.level >= 50
on conflict (user_id, item_id) do nothing;
