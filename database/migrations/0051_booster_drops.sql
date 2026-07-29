-- 0051_booster_drops.sql
-- The monthly booster cosmetic drop (roadmap v1.5.0).
--
-- One exclusive cosmetic per calendar month, given to everyone boosting the
-- Discord server that month. The point is that the collection tells a story
-- over time: holding March's item is proof you were boosting in March, and
-- there is no way to get it afterwards.
--
-- Two design decisions worth stating, because both could reasonably have gone
-- the other way:
--
-- 1. The grant runs DAILY, not monthly. Vercel's Hobby plan only schedules
--    daily crons, and more importantly a once-a-month job has exactly one
--    chance to fire - miss it and a whole month of boosters silently lose
--    their drop. A daily idempotent grant has thirty chances, and the
--    on-conflict-do-nothing makes the repeats free.
--
-- 2. Boosting at *any point* during the month earns that month's drop, because
--    the daily run grants to whoever is boosting when it fires. Someone who
--    boosts on the 28th still gets it. The alternative - requiring a full
--    month - would mean nobody could ever earn the drop for the month they
--    started boosting, which is precisely the month you most want to reward.
--
-- Drops are configured ahead of time by staff. A month with no row configured
-- simply grants nothing, so the job is safe to leave running forever without
-- anyone topping the table up.

create table if not exists public.booster_drops (
  -- Always the first of the month; the check keeps that honest so that
  -- date_trunc('month', now()) is a reliable key.
  month date primary key check (month = date_trunc('month', month)::date),
  item_id uuid not null references public.shop_items (id) on delete cascade,
  note text,
  created_at timestamptz not null default now()
);

alter table public.booster_drops enable row level security;

-- The schedule is public: knowing what this month's drop is, is the incentive.
drop policy if exists "booster_drops_read" on public.booster_drops;
create policy "booster_drops_read" on public.booster_drops for select using (true);

-- ── The grant ──────────────────────────────────────────────────────────────

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
    where p.booster_since is not null
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

-- ── What the UI shows ──────────────────────────────────────────────────────

create or replace function public.my_booster_drop()
returns jsonb
language sql stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'boosting', (select booster_since is not null from public.profiles where id = auth.uid()),
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

-- ── The opening drops ──────────────────────────────────────────────────────

-- Unbuyable: available = false and no purchase route, so the only way to hold
-- one is to have been boosting in its month.
insert into public.shop_items
  (slug, name, description, kind, price, rarity, preview, seasonal, available, sort_weight, staff_only, min_level)
values
  ('deco-booster-wings', 'Booster Wings', 'Exclusive to July 2026 boosters.', 'decoration', 0, 'legendary', '{"decoration":"wings","colors":["#f472b6","#a855f7"]}', true, false, 0, false, 0),
  ('nameplate-booster-bloom', 'Bloom', 'Exclusive to August 2026 boosters.', 'nameplate', 0, 'legendary', '{"colors":["#fb7185","#fbbf24"]}', true, false, 0, false, 0),
  ('effect-booster-comet', 'Comet', 'Exclusive to September 2026 boosters.', 'effect', 0, 'legendary', '{"effect":"comet","colors":["#38bdf8","#e0f2fe"]}', true, false, 0, false, 0)
on conflict (slug) do nothing;

insert into public.booster_drops (month, item_id, note)
select v.month::date, si.id, v.note
from (values
  ('2026-07-01', 'deco-booster-wings', 'July 2026'),
  ('2026-08-01', 'nameplate-booster-bloom', 'August 2026'),
  ('2026-09-01', 'effect-booster-comet', 'September 2026')
) as v(month, slug, note)
join public.shop_items si on si.slug = v.slug
on conflict (month) do nothing;
