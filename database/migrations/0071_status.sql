-- 0071_status.sql
--
-- A real status page: what is up, what broke, for how long, and what players
-- are telling us about it.
--
-- 0043 added `platform_status()`, which is a *counter*: players online, plays
-- today, credits awarded. That answers "how busy is the arcade", which is a
-- genuinely different question from "is the arcade working", and the page built
-- on it could not answer the second one at all. A number that says 41 players
-- are online does not tell you the shop has been throwing errors for an hour.
-- `platform_status()` is left exactly as it is and keeps its own panel; this
-- migration adds the health model beside it.
--
-- ── The vocabulary is deliberately Statuspage's ──────────────────────────────
--
-- Component statuses are `operational`, `degraded_performance`,
-- `partial_outage`, `major_outage`, `under_maintenance`; the overall indicator
-- is `none`/`minor`/`major`/`critical`/`maintenance`; incidents move through
-- `investigating` → `identified` → `monitoring` → `resolved`. Those are the
-- exact strings status.claude.com and every other Statuspage instance emits.
--
-- Inventing our own words would have cost nothing here and everything at the
-- edges: the API this feeds is meant to be consumed by the Discord bot and by
-- other sites, and borrowing the vocabulary means anything already written
-- against a status page understands ours with no translation layer. It also
-- settles a hundred small naming arguments by deferring to prior art.
--
-- ── Three sources of truth, deliberately separate ────────────────────────────
--
--   1. PROBES write `status_components.status`. A scheduled job records a
--      `status_checks` row per component per run; two consecutive failures flip
--      the component and open an incident by itself, two consecutive successes
--      close it. Automatic, fast, and occasionally wrong.
--   2. INCIDENTS carry a per-component status of their own. A human saying
--      "leaderboards are degraded" must be able to say so even while the probe
--      is happily getting a 200 back, because "responds to a query" and "works"
--      are not the same claim.
--   3. A PIN (`pinned_status`) overrides both. It is the operator's override
--      for a flapping probe, and it is the only one of the three that can make
--      a component *less* severe than the evidence, which is why it is the only
--      one that records who set it and why.
--
-- The effective status is the worst of (1) and (2) unless (3) is set, in which
-- case the pin wins outright. `status_rank()` defines "worst".
--
-- ── User reports are Downdetector's model, not a support inbox ───────────────
--
-- `status_reports` rows are single anonymous taps of "this is broken for me",
-- and they are only ever read in aggregate: 15-minute buckets over 24 hours,
-- compared against the site's own recent baseline. One person reporting an
-- outage is noise; forty people in a quarter of an hour while every probe is
-- green is the most valuable signal on the page, and it is the one thing
-- automated checks structurally cannot see - a game that renders a blank canvas
-- returns HTTP 200 all day long.
--
-- Because the whole mechanism is "count the taps", it is also the easiest thing
-- here to poison, so: `status_report_submit` is service_role-only rather than
-- reachable with the public anon key, the caller supplies a fingerprint derived
-- from the request rather than choosing one, and both a per-component cooldown
-- and an hourly cap are enforced in the database rather than in the route. See
-- the function's own comment for why each of those is there.
--
-- Nothing here stores an IP address. The fingerprint is a hash computed by the
-- caller and is not reversible to a person; reports are otherwise anonymous
-- unless a signed-in player made them.

-- ─────────────────────────── the vocabulary ─────────────────────────────────

-- Severity ordering, so "the worst of these" is one expression rather than a
-- CASE repeated in six places. Higher is worse. `under_maintenance` sits above
-- operational but below every fault: planned work is not an outage, but it is
-- worth saying out loud when someone is looking at the page to find out why
-- something is not working.
create or replace function public.status_rank(p_status text)
returns int
language sql
immutable
set search_path = public
as $$
  select case p_status
    when 'operational'         then 0
    when 'under_maintenance'   then 1
    when 'degraded_performance' then 2
    when 'partial_outage'      then 3
    when 'major_outage'        then 4
    else 0
  end;
$$;

-- The inverse: the overall page indicator for a set of component statuses.
create or replace function public.status_indicator(p_rank int)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when p_rank >= 4 then 'critical'
    when p_rank = 3 then 'major'
    when p_rank = 2 then 'minor'
    when p_rank = 1 then 'maintenance'
    else 'none'
  end;
$$;

-- ─────────────────────────────── tables ─────────────────────────────────────

create table if not exists public.status_components (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  -- Free text rather than an enum: groups are presentation, and a new one
  -- should not need a migration.
  group_name text not null default 'Platform',
  position int not null default 0,
  status text not null default 'operational'
    check (status in ('operational', 'degraded_performance', 'partial_outage',
                      'major_outage', 'under_maintenance')),
  -- The operator override. Null means "let the evidence decide".
  pinned_status text
    check (pinned_status in ('operational', 'degraded_performance', 'partial_outage',
                             'major_outage', 'under_maintenance')),
  pinned_reason text,
  pinned_by uuid references public.profiles (id) on delete set null,
  pinned_at timestamptz,
  -- Which kind of check the probe runs for this component. `db` means the
  -- component is covered by status_selfcheck() under `probe_target`.
  probe text not null default 'none'
    check (probe in ('none', 'http', 'auth', 'db', 'discord_worker', 'discord_api')),
  probe_target text,
  -- Above this, a *successful* check still counts as degraded. Set per
  -- component because 400ms is alarming for a database read and unremarkable
  -- for a cold page render.
  degraded_ms int not null default 1500,
  visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists status_components_order_idx
  on public.status_components (position, name);

-- Raw probe samples. Pruned to 14 days by status_prune(); anything older is
-- already folded into status_days, which is what the 90-day bars read.
create table if not exists public.status_checks (
  id bigint generated always as identity primary key,
  component_id uuid not null references public.status_components (id) on delete cascade,
  checked_at timestamptz not null default now(),
  ok boolean not null,
  latency_ms int,
  detail text
);

create index if not exists status_checks_recent_idx
  on public.status_checks (component_id, checked_at desc);

-- The daily rollup behind the uptime bars.
--
-- WHY A ROLLUP AND NOT A QUERY OVER status_checks: at one probe run every five
-- minutes, ninety days of history is ~26k rows per component, and the page
-- draws a bar per component per day on every load. Aggregating on write costs
-- one upsert per check and turns the page's heaviest query into a 90-row index
-- scan. It is also what lets the raw samples be pruned without losing history.
create table if not exists public.status_days (
  component_id uuid not null references public.status_components (id) on delete cascade,
  day date not null,
  checks int not null default 0,
  failures int not null default 0,
  -- Successful but slow. Kept apart from failures so a day of sluggishness
  -- reads as amber rather than being rounded up into an outage.
  degraded int not null default 0,
  downtime_seconds int not null default 0,
  latency_sum bigint not null default 0,
  latency_count int not null default 0,
  primary key (component_id, day)
);

create table if not exists public.status_incidents (
  id uuid primary key default gen_random_uuid(),
  -- A short human reference. `INC-14` fits in a Discord embed title and a
  -- conversation in a way a uuid does not.
  ref bigint generated always as identity,
  kind text not null default 'incident' check (kind in ('incident', 'maintenance')),
  title text not null,
  impact text not null default 'minor'
    check (impact in ('none', 'minor', 'major', 'critical', 'maintenance')),
  -- Both vocabularies live in one column because an incident and a maintenance
  -- window are the same object with a different lifecycle, and splitting them
  -- into two tables would double every reader for no gain.
  status text not null default 'investigating'
    check (status in ('investigating', 'identified', 'monitoring', 'resolved',
                      'scheduled', 'in_progress', 'verifying', 'completed')),
  started_at timestamptz not null default now(),
  resolved_at timestamptz,
  scheduled_for timestamptz,
  scheduled_until timestamptz,
  -- Opened by the probe rather than by a person.
  auto boolean not null default false,
  -- The component slug an automatic incident belongs to, which the partial
  -- unique index below turns into "at most one open auto incident per
  -- component". Without it a flapping probe opens an incident every five
  -- minutes and the page becomes unreadable exactly when it matters.
  auto_key text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists status_incidents_one_open_auto_idx
  on public.status_incidents (auto_key)
  where auto and resolved_at is null;

create index if not exists status_incidents_recent_idx
  on public.status_incidents (started_at desc);

create index if not exists status_incidents_open_idx
  on public.status_incidents (started_at desc)
  where resolved_at is null;

create table if not exists public.status_incident_updates (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.status_incidents (id) on delete cascade,
  status text not null
    check (status in ('investigating', 'identified', 'monitoring', 'resolved',
                      'scheduled', 'in_progress', 'verifying', 'completed')),
  body text not null,
  author_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists status_incident_updates_idx
  on public.status_incident_updates (incident_id, created_at desc);

create table if not exists public.status_incident_components (
  incident_id uuid not null references public.status_incidents (id) on delete cascade,
  component_id uuid not null references public.status_components (id) on delete cascade,
  -- Per-component, not per-incident: one incident can take the shop down
  -- outright while only slowing the leaderboards, and saying so is the whole
  -- point of listing components on an incident.
  component_status text not null default 'degraded_performance'
    check (component_status in ('operational', 'degraded_performance', 'partial_outage',
                                'major_outage', 'under_maintenance')),
  primary key (incident_id, component_id)
);

create index if not exists status_incident_components_component_idx
  on public.status_incident_components (component_id);

create table if not exists public.status_reports (
  id uuid primary key default gen_random_uuid(),
  -- Null means "the whole site", which is what most people mean when they
  -- report a problem without picking anything.
  component_id uuid references public.status_components (id) on delete set null,
  problem text not null
    check (problem in ('cannot_load', 'slow', 'login', 'gameplay', 'scores',
                       'purchases', 'social', 'discord', 'other')),
  -- Optional and short. Staff-only on read: it is free text from anonymous
  -- visitors, so it is evidence for whoever is on call, not page content.
  note text check (note is null or char_length(note) <= 200),
  user_id uuid references public.profiles (id) on delete set null,
  -- A hash the caller computes from the request (address + user agent + a
  -- rotating salt). Never an address itself, and not reversible to a person.
  fingerprint text not null,
  created_at timestamptz not null default now()
);

create index if not exists status_reports_recent_idx
  on public.status_reports (created_at desc);

create index if not exists status_reports_component_idx
  on public.status_reports (component_id, created_at desc);

create index if not exists status_reports_fingerprint_idx
  on public.status_reports (fingerprint, created_at desc);

-- Small key/value table for things the status page needs to know about itself.
create table if not exists public.status_meta (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- The schema version the database is actually running.
--
-- Migrations are applied to Supabase separately from deploys, so the app and
-- the schema drift apart routinely and silently - a file in the repo may be
-- live, and a live function may have no file yet. Recording the number here
-- lets /status show what the database thinks it is next to what the deployed
-- build expects, which turns "did that migration get applied?" from a question
-- into a glance. Every migration after this one should bump it.
insert into public.status_meta (key, value)
values ('schema', jsonb_build_object('version', '0071'))
on conflict (key) do update set value = excluded.value, updated_at = now();

-- Tunables for the report spike detector. `do nothing` on conflict, because
-- re-running the migration must not stamp on numbers someone has since tuned.
insert into public.status_meta (key, value)
values ('reports', jsonb_build_object(
  'window_minutes', 15,   -- bucket width, and the "right now" window
  'min_reports', 5,       -- floor: fewer than this is never a signal, however quiet the baseline
  'multiplier', 3,        -- how far above baseline counts as elevated
  'baseline_hours', 12,   -- how far back the baseline is averaged over
  'cooldown_minutes', 10, -- one report per person per component per this long
  'hourly_cap', 6         -- and no more than this many per person per hour, in total
))
on conflict (key) do nothing;

-- ──────────────────────────────── RLS ───────────────────────────────────────

alter table public.status_components enable row level security;
alter table public.status_checks enable row level security;
alter table public.status_days enable row level security;
alter table public.status_incidents enable row level security;
alter table public.status_incident_updates enable row level security;
alter table public.status_incident_components enable row level security;
alter table public.status_reports enable row level security;
alter table public.status_meta enable row level security;

-- Everything a visitor sees on /status is world-readable: it is a public page,
-- and a status page that requires a session is not a status page. Writes are
-- staff-only, and the counters are written by SECURITY DEFINER functions.
drop policy if exists "status components are public" on public.status_components;
create policy "status components are public" on public.status_components
  for select using (visible or public.is_staff());

drop policy if exists "staff manage status components" on public.status_components;
create policy "staff manage status components" on public.status_components
  for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists "status incidents are public" on public.status_incidents;
create policy "status incidents are public" on public.status_incidents
  for select using (true);

drop policy if exists "staff manage status incidents" on public.status_incidents;
create policy "staff manage status incidents" on public.status_incidents
  for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists "status updates are public" on public.status_incident_updates;
create policy "status updates are public" on public.status_incident_updates
  for select using (true);

drop policy if exists "staff manage status updates" on public.status_incident_updates;
create policy "staff manage status updates" on public.status_incident_updates
  for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists "status incident components are public" on public.status_incident_components;
create policy "status incident components are public" on public.status_incident_components
  for select using (true);

drop policy if exists "staff manage status incident components" on public.status_incident_components;
create policy "staff manage status incident components" on public.status_incident_components
  for all using (public.is_staff()) with check (public.is_staff());

-- Daily uptime is public - it is what the bars draw. Raw samples are not: they
-- are operational detail with no audience, and keeping them staff-only means
-- the shape of our probing is not a public document.
drop policy if exists "status uptime is public" on public.status_days;
create policy "status uptime is public" on public.status_days
  for select using (true);

drop policy if exists "staff read status checks" on public.status_checks;
create policy "staff read status checks" on public.status_checks
  for select using (public.is_staff());

-- Reports are only ever public in aggregate, through status_reports_timeline().
-- The rows themselves carry a free-text note and a fingerprint.
drop policy if exists "staff read status reports" on public.status_reports;
create policy "staff read status reports" on public.status_reports
  for select using (public.is_staff());

drop policy if exists "status meta is public" on public.status_meta;
create policy "status meta is public" on public.status_meta
  for select using (true);

drop policy if exists "staff manage status meta" on public.status_meta;
create policy "staff manage status meta" on public.status_meta
  for all using (public.is_admin()) with check (public.is_admin());

-- ───────────────────────────── the readers ──────────────────────────────────

-- The worst of: the probe's verdict, and every open incident's claim about this
-- component - unless an operator has pinned it, in which case the pin is the
-- answer. See the header for why the pin outranks the evidence.
--
-- `started_at <= now()` is doing real work, not defending against nonsense. A
-- maintenance window is created with its `started_at` set to when it is
-- scheduled *for*, and it is unresolved from the moment it is announced - so
-- without this guard, scheduling next Tuesday's database upgrade would put the
-- shop into "Under maintenance" the instant it was announced, and leave it
-- there all week. The window has to arrive before it means anything.
create or replace function public.status_effective(p_component uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select c.pinned_status from public.status_components c where c.id = p_component),
    (
      select s
      from (
        select c.status as s from public.status_components c where c.id = p_component
        union all
        select ic.component_status
        from public.status_incident_components ic
        join public.status_incidents i on i.id = ic.incident_id
        where ic.component_id = p_component
          and i.resolved_at is null
          and i.started_at <= now()
      ) candidates
      order by public.status_rank(s) desc
      limit 1
    ),
    'operational'
  );
$$;

-- Uptime over a window, as a percentage of checks that neither failed nor ran
-- slow enough to count as degraded.
--
-- Days with no checks at all are *excluded* rather than counted as 100% or as
-- 0%. Both alternatives lie: a day before this table existed did not have
-- perfect uptime, and it did not have an outage either. Excluding them makes
-- the number "uptime across the days we were watching", which is the only claim
-- the data supports, and the bar for such a day renders as "no data".
create or replace function public.status_uptime_pct(p_component uuid, p_days int)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select case
    when coalesce(sum(d.checks), 0) = 0 then null
    else round(
      100.0 * (sum(d.checks) - sum(d.failures) - sum(d.degraded))::numeric
        / nullif(sum(d.checks), 0),
      4)
  end
  from public.status_days d
  where d.component_id = p_component
    and d.day > (current_date - greatest(1, p_days));
$$;

-- The 90-day (or fewer) bar series for one component, oldest first, with gaps
-- filled so the page can draw a fixed number of bars without doing date maths.
create or replace function public.status_uptime_series(p_component uuid, p_days int default 90)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(row order by row.day), '[]'::jsonb)
  from (
    select
      g.day::date as day,
      coalesce(d.checks, 0) as checks,
      coalesce(d.failures, 0) as failures,
      coalesce(d.degraded, 0) as degraded,
      coalesce(d.downtime_seconds, 0) as downtime_seconds,
      case
        when coalesce(d.checks, 0) = 0 then null
        else round(100.0 * (d.checks - d.failures - d.degraded)::numeric / d.checks, 2)
      end as uptime,
      case
        when coalesce(d.checks, 0) = 0 then 'unknown'
        when d.failures > 0 then 'down'
        when d.degraded > 0 then 'degraded'
        else 'up'
      end as state
    from generate_series(
      current_date - (greatest(1, least(p_days, 365)) - 1),
      current_date,
      interval '1 day'
    ) as g(day)
    left join public.status_days d
      on d.component_id = p_component and d.day = g.day::date
  ) row;
$$;

-- Every component's uptime bars in one call, encoded small.
--
-- The page draws ninety bars per component for ten components, and the obvious
-- shapes for that are both wrong: ninety separate calls to
-- status_uptime_series() is nine hundred round trips of index scan, and folding
-- the full series into status_summary() would push a ~100KB document through an
-- endpoint that is meant to be cheap enough to poll.
--
-- So the states are a string of digits - 0 unknown, 1 up, 2 degraded, 3 down,
-- one character per day, oldest first - and only the days that were *not*
-- perfect carry a detail entry, keyed by their index in that string. A healthy
-- component is about a hundred bytes.
create or replace function public.status_uptime_matrix(p_days int default 90)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with span as (
    select greatest(1, least(coalesce(p_days, 90), 365)) as days
  ),
  grid as (
    select
      c.id, c.slug,
      g.day::date as day,
      (g.day::date - (current_date - (select days from span) + 1)) as idx,
      d.checks, d.failures, d.degraded, d.downtime_seconds
    from public.status_components c
    cross join span
    cross join lateral generate_series(
      current_date - (span.days - 1), current_date, interval '1 day'
    ) as g(day)
    left join public.status_days d on d.component_id = c.id and d.day = g.day::date
    where c.visible
  )
  select jsonb_build_object(
    'days', (select days from span),
    'from', current_date - ((select days from span) - 1),
    'to', current_date,
    'components', coalesce((
      select jsonb_object_agg(slug, jsonb_build_object(
        'uptime', public.status_uptime_pct(id, (select days from span)),
        'states', states,
        'notes', notes
      ))
      from (
        select
          id, slug,
          string_agg(
            case
              when coalesce(checks, 0) = 0 then '0'
              when failures > 0 then '3'
              when degraded > 0 then '2'
              else '1'
            end, '' order by day
          ) as states,
          coalesce(jsonb_object_agg(
            idx::text,
            jsonb_build_object(
              'uptime', round(100.0 * (checks - failures - degraded)::numeric / nullif(checks, 0), 2),
              'checks', checks,
              'down_seconds', downtime_seconds
            )
          ) filter (where coalesce(checks, 0) > 0 and (failures > 0 or degraded > 0)), '{}'::jsonb) as notes
        from grid
        group by id, slug
      ) rows
    ), '{}'::jsonb)
  );
$$;

-- Incident + its update timeline as one jsonb object.
create or replace function public.status_incident_json(p_incident public.status_incidents)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', p_incident.id,
    'ref', p_incident.ref,
    'kind', p_incident.kind,
    'title', p_incident.title,
    'impact', p_incident.impact,
    'status', p_incident.status,
    'auto', p_incident.auto,
    'started_at', p_incident.started_at,
    'resolved_at', p_incident.resolved_at,
    'scheduled_for', p_incident.scheduled_for,
    'scheduled_until', p_incident.scheduled_until,
    'components', coalesce((
      select jsonb_agg(jsonb_build_object(
        'slug', c.slug, 'name', c.name, 'status', ic.component_status
      ) order by c.position, c.name)
      from public.status_incident_components ic
      join public.status_components c on c.id = ic.component_id
      where ic.incident_id = p_incident.id
    ), '[]'::jsonb),
    'updates', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', u.id,
        'status', u.status,
        'body', u.body,
        'created_at', u.created_at,
        'author', (select p.username from public.profiles p where p.id = u.author_id)
      ) order by u.created_at desc)
      from public.status_incident_updates u
      where u.incident_id = p_incident.id
    ), '[]'::jsonb)
  );
$$;

-- ── report aggregation (the Downdetector half) ──────────────────────────────
--
-- Buckets of `window_minutes` over the last `p_hours`, a baseline averaged over
-- the preceding `baseline_hours`, and a verdict.
--
-- The verdict is deliberately a floor *and* a multiple. A multiple alone makes
-- a quiet site hysterical - two reports against a baseline of 0.3 is a 6x
-- spike and means nothing - and a floor alone makes a busy site deaf, because
-- five reports an hour is Tuesday. Requiring both is what makes the signal
-- worth putting on the page at all.
create or replace function public.status_reports_timeline(
  p_slug text default null,
  p_hours int default 24
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_cfg jsonb;
  v_window int;
  v_min int;
  v_mult numeric;
  v_baseline_hours int;
  v_component uuid;
  v_hours int := greatest(1, least(coalesce(p_hours, 24), 168));
  v_step interval;
  v_now timestamptz := now();
  v_buckets jsonb;
  v_current int;
  v_baseline numeric;
  v_threshold numeric;
  v_signal text;
  v_total int;
begin
  select value into v_cfg from public.status_meta where key = 'reports';
  v_window := coalesce((v_cfg ->> 'window_minutes')::int, 15);
  v_min := coalesce((v_cfg ->> 'min_reports')::int, 5);
  v_mult := coalesce((v_cfg ->> 'multiplier')::numeric, 3);
  v_baseline_hours := coalesce((v_cfg ->> 'baseline_hours')::int, 12);
  v_step := make_interval(mins => v_window);

  if p_slug is not null and p_slug <> '' then
    select id into v_component from public.status_components where slug = p_slug;
    if v_component is null then
      return jsonb_build_object('ok', false, 'error', 'unknown_component');
    end if;
  end if;

  -- Bucket by flooring the epoch, which keeps buckets aligned to the clock
  -- rather than to whenever the page happened to be loaded.
  with bounds as (
    select to_timestamp(floor(extract(epoch from v_now) / (v_window * 60)) * (v_window * 60)) as latest
  ),
  series as (
    select generate_series(b.latest - make_interval(hours => v_hours) + v_step, b.latest, v_step) as bucket
    from bounds b
  ),
  counted as (
    select
      to_timestamp(floor(extract(epoch from r.created_at) / (v_window * 60)) * (v_window * 60)) as bucket,
      count(*)::int as reports
    from public.status_reports r
    where r.created_at > v_now - make_interval(hours => v_hours) - v_step
      and (v_component is null or r.component_id = v_component)
    group by 1
  )
  select
    coalesce(jsonb_agg(jsonb_build_object('at', s.bucket, 'reports', coalesce(c.reports, 0))
             order by s.bucket), '[]'::jsonb)
  into v_buckets
  from series s
  left join counted c on c.bucket = s.bucket;

  -- "Right now" is the trailing window, not the current bucket: a bucket that
  -- started forty seconds ago is always near-empty and would hide a spike for
  -- up to fifteen minutes.
  select count(*)::int into v_current
  from public.status_reports r
  where r.created_at > v_now - v_step
    and (v_component is null or r.component_id = v_component);

  -- The baseline excludes the last hour, so an outage in progress cannot raise
  -- the bar it is being measured against.
  select coalesce(count(*)::numeric / greatest(1, (v_baseline_hours * 60.0 / v_window)), 0)
  into v_baseline
  from public.status_reports r
  where r.created_at > v_now - make_interval(hours => v_baseline_hours + 1)
    and r.created_at <= v_now - interval '1 hour'
    and (v_component is null or r.component_id = v_component);

  select count(*)::int into v_total
  from public.status_reports r
  where r.created_at > v_now - make_interval(hours => v_hours)
    and (v_component is null or r.component_id = v_component);

  v_threshold := greatest(v_min, ceil(v_baseline * v_mult));
  v_signal := case
    when v_current >= v_threshold * 2 then 'spike'
    when v_current >= v_threshold then 'elevated'
    else 'none'
  end;

  return jsonb_build_object(
    'ok', true,
    'component', p_slug,
    'generated_at', v_now,
    'window_minutes', v_window,
    'hours', v_hours,
    'buckets', v_buckets,
    'current', v_current,
    'baseline', round(v_baseline, 2),
    'threshold', v_threshold,
    'signal', v_signal,
    'total', v_total,
    'last_hour', (
      select count(*) from public.status_reports r
      where r.created_at > v_now - interval '1 hour'
        and (v_component is null or r.component_id = v_component)
    ),
    -- What people are actually reporting, as shares of the last day. Ordered
    -- by count so the page can render the top few without sorting again.
    'problems', coalesce((
      select jsonb_agg(jsonb_build_object(
        'problem', t.problem,
        'reports', t.n,
        'share', round(100.0 * t.n / nullif(v_total, 0))
      ) order by t.n desc)
      from (
        select r.problem, count(*)::int as n
        from public.status_reports r
        where r.created_at > v_now - make_interval(hours => v_hours)
          and (v_component is null or r.component_id = v_component)
        group by r.problem
      ) t
    ), '[]'::jsonb)
  );
end;
$$;

-- The whole status document in one round trip: the page, the API and the
-- Discord bot all read exactly this.
create or replace function public.status_summary()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with components as (
    select
      c.id, c.slug, c.name, c.description, c.group_name, c.position,
      c.pinned_status, c.pinned_reason,
      public.status_effective(c.id) as effective,
      public.status_uptime_pct(c.id, 90) as uptime_90d,
      public.status_uptime_pct(c.id, 30) as uptime_30d,
      public.status_uptime_pct(c.id, 1) as uptime_24h,
      (select ch.checked_at from public.status_checks ch
        where ch.component_id = c.id order by ch.checked_at desc limit 1) as last_checked_at,
      (select ch.latency_ms from public.status_checks ch
        where ch.component_id = c.id and ch.ok order by ch.checked_at desc limit 1) as latency_ms
    from public.status_components c
    where c.visible
  )
  select jsonb_build_object(
    'generated_at', now(),
    'schema_version', (select value ->> 'version' from public.status_meta where key = 'schema'),
    'status', (
      select jsonb_build_object(
        'indicator', public.status_indicator(coalesce(max(public.status_rank(effective)), 0)),
        'worst', coalesce(max(public.status_rank(effective)), 0)
      )
      from components
    ),
    'components', coalesce((
      select jsonb_agg(jsonb_build_object(
        'slug', slug,
        'name', name,
        'description', description,
        'group', group_name,
        'position', position,
        'status', effective,
        'pinned', pinned_status is not null,
        'pinned_reason', pinned_reason,
        'uptime_90d', uptime_90d,
        'uptime_30d', uptime_30d,
        'uptime_24h', uptime_24h,
        'last_checked_at', last_checked_at,
        'latency_ms', latency_ms
      ) order by position, name)
      from components
    ), '[]'::jsonb),
    -- Open incidents, newest first. Maintenance is split out because a planned
    -- window and a fault want different words and different placement.
    'incidents', coalesce((
      select jsonb_agg(public.status_incident_json(i.*) order by i.started_at desc)
      from public.status_incidents i
      where i.resolved_at is null and i.kind = 'incident'
    ), '[]'::jsonb),
    'maintenance', coalesce((
      select jsonb_agg(public.status_incident_json(i.*) order by coalesce(i.scheduled_for, i.started_at))
      from public.status_incidents i
      where i.kind = 'maintenance'
        and i.resolved_at is null
        and coalesce(i.scheduled_until, i.scheduled_for, i.started_at) > now() - interval '1 day'
    ), '[]'::jsonb),
    -- Enough of the report signal to render the banner; the full timeline is a
    -- separate call so the summary stays cheap.
    'reports', (
      select jsonb_build_object(
        'signal', t ->> 'signal',
        'current', (t ->> 'current')::int,
        'baseline', (t ->> 'baseline')::numeric,
        'threshold', (t ->> 'threshold')::numeric,
        'last_hour', (t ->> 'last_hour')::int,
        'total_24h', (t ->> 'total')::int
      )
      from public.status_reports_timeline(null, 24) t
    ),
    'bot', (
      select jsonb_build_object(
        'online', coalesce((value ->> 'last_seen')::timestamptz > now() - interval '3 minutes', false),
        'last_seen', value ->> 'last_seen',
        'version', value ->> 'version'
      )
      from public.discord_bot_config where key = 'worker'
    )
  );
$$;

-- One component in detail, for /status/<slug>, the API and `/status <thing>`
-- in Discord.
create or replace function public.status_component(p_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  c public.status_components;
begin
  select * into c from public.status_components where slug = p_slug and visible;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'unknown_component');
  end if;

  return jsonb_build_object(
    'ok', true,
    'generated_at', now(),
    'slug', c.slug,
    'name', c.name,
    'description', c.description,
    'group', c.group_name,
    'status', public.status_effective(c.id),
    'pinned', c.pinned_status is not null,
    'pinned_reason', c.pinned_reason,
    'uptime_24h', public.status_uptime_pct(c.id, 1),
    'uptime_7d', public.status_uptime_pct(c.id, 7),
    'uptime_30d', public.status_uptime_pct(c.id, 30),
    'uptime_90d', public.status_uptime_pct(c.id, 90),
    'days', public.status_uptime_series(c.id, 90),
    'last_checked_at', (select checked_at from public.status_checks
                        where component_id = c.id order by checked_at desc limit 1),
    'latency_ms', (select latency_ms from public.status_checks
                   where component_id = c.id and ok order by checked_at desc limit 1),
    'latency_avg_24h', (select round(avg(latency_ms)) from public.status_checks
                        where component_id = c.id and ok and checked_at > now() - interval '24 hours'),
    'incidents', coalesce((
      select jsonb_agg(public.status_incident_json(i.*) order by i.started_at desc)
      from public.status_incidents i
      join public.status_incident_components ic on ic.incident_id = i.id
      where ic.component_id = c.id
        and i.started_at > now() - interval '90 days'
    ), '[]'::jsonb),
    'reports', public.status_reports_timeline(c.slug, 24)
  );
end;
$$;

-- Incident history, newest first. `p_before` pages backwards through it.
create or replace function public.status_incident_history(
  p_limit int default 20,
  p_before timestamptz default null,
  p_kind text default null
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(public.status_incident_json(i.*) order by i.started_at desc), '[]'::jsonb)
  from (
    select *
    from public.status_incidents
    where (p_before is null or started_at < p_before)
      and (p_kind is null or kind = p_kind)
    order by started_at desc
    limit greatest(1, least(coalesce(p_limit, 20), 100))
  ) i;
$$;

-- Uptime bars for one component, standalone so a third-party dashboard can ask
-- for just this.
create or replace function public.status_uptime(p_slug text, p_days int default 90)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  c public.status_components;
begin
  select * into c from public.status_components where slug = p_slug and visible;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'unknown_component');
  end if;
  return jsonb_build_object(
    'ok', true,
    'slug', c.slug,
    'name', c.name,
    'days', public.status_uptime_series(c.id, p_days),
    'uptime', public.status_uptime_pct(c.id, p_days)
  );
end;
$$;

-- ───────────────────────────── the writers ──────────────────────────────────

-- What the probe cannot see from outside: whether each area of the database
-- still answers a query shaped like the one the site actually runs.
--
-- One round trip covers every DB-backed component, which matters because the
-- probe runs on a serverless function with a time budget. `clock_timestamp()`
-- rather than `now()` because now() is fixed for the whole transaction and
-- would report every check as taking zero milliseconds.
create or replace function public.status_selfcheck()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_out jsonb := '{}'::jsonb;
  v_start timestamptz;
  v_n bigint;
  v_worker boolean;
begin
  v_start := clock_timestamp();
  select count(*) into v_n from public.games where status in ('published', 'in_development');
  v_out := v_out || jsonb_build_object('games', jsonb_build_object(
    'ok', v_n >= 0, 'latency_ms', extract(milliseconds from clock_timestamp() - v_start)::int));

  v_start := clock_timestamp();
  perform 1 from public.leaderboard_scores limit 1;
  v_out := v_out || jsonb_build_object('leaderboards', jsonb_build_object(
    'ok', true, 'latency_ms', extract(milliseconds from clock_timestamp() - v_start)::int));

  v_start := clock_timestamp();
  perform 1 from public.profiles limit 1;
  v_out := v_out || jsonb_build_object('accounts', jsonb_build_object(
    'ok', true, 'latency_ms', extract(milliseconds from clock_timestamp() - v_start)::int));

  v_start := clock_timestamp();
  perform 1 from public.messages limit 1;
  v_out := v_out || jsonb_build_object('social', jsonb_build_object(
    'ok', true, 'latency_ms', extract(milliseconds from clock_timestamp() - v_start)::int));

  v_start := clock_timestamp();
  perform 1 from public.shop_items limit 1;
  v_out := v_out || jsonb_build_object('economy', jsonb_build_object(
    'ok', true, 'latency_ms', extract(milliseconds from clock_timestamp() - v_start)::int));

  v_start := clock_timestamp();
  perform 1 from public.parties limit 1;
  v_out := v_out || jsonb_build_object('parties', jsonb_build_object(
    'ok', true, 'latency_ms', extract(milliseconds from clock_timestamp() - v_start)::int));

  v_start := clock_timestamp();
  perform 1;
  v_out := v_out || jsonb_build_object('database', jsonb_build_object(
    'ok', true, 'latency_ms', extract(milliseconds from clock_timestamp() - v_start)::int));

  -- The gateway worker reports itself through bot_heartbeat(); this only reads
  -- how long ago. Folded in here rather than fetched separately by the probe so
  -- the whole database side of a probe run stays one round trip. Three minutes
  -- is the same window platform_status() has always called online.
  select coalesce((value ->> 'last_seen')::timestamptz > now() - interval '3 minutes', false)
    into v_worker
  from public.discord_bot_config where key = 'worker';
  v_out := v_out || jsonb_build_object('discord_worker', jsonb_build_object(
    'ok', coalesce(v_worker, false), 'latency_ms', null));

  return jsonb_build_object('ok', true, 'checked_at', now(), 'results', v_out);
exception when others then
  -- A failure here is itself the answer, and it must not take the probe down
  -- with it: whichever area raised is reported as down rather than the whole
  -- run erroring out.
  return jsonb_build_object('ok', false, 'error', sqlerrm, 'results', v_out);
end;
$$;

-- Record a batch of probe results, roll them up, and let them move the board.
--
-- Input is `[{"slug":"games","ok":true,"latency_ms":12,"detail":null}, ...]`.
--
-- TWO CONSECUTIVE, NOT ONE: a single failed check is a network blip more often
-- than it is an outage, and an incident opened for every blip trains everyone
-- to ignore the page. Two in a row at a five-minute cadence means the fault has
-- survived five minutes, which is worth telling people about. The same
-- threshold closes it again.
create or replace function public.status_record_checks(p_results jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r jsonb;
  c public.status_components;
  v_ok boolean;
  v_latency int;
  v_detail text;
  v_slow boolean;
  v_recent_bad int;
  v_recent_good int;
  v_target text;
  v_changed jsonb := '[]'::jsonb;
  v_incident uuid;
  v_interval_seconds int := 300;
begin
  for r in select * from jsonb_array_elements(coalesce(p_results, '[]'::jsonb))
  loop
    select * into c from public.status_components where slug = r ->> 'slug';
    continue when not found;

    v_ok := coalesce((r ->> 'ok')::boolean, false);
    v_latency := nullif(r ->> 'latency_ms', '')::int;
    v_detail := nullif(r ->> 'detail', '');
    v_slow := v_ok and v_latency is not null and v_latency > c.degraded_ms;

    insert into public.status_checks (component_id, ok, latency_ms, detail)
    values (c.id, v_ok, v_latency, v_detail);

    insert into public.status_days as d (
      component_id, day, checks, failures, degraded, downtime_seconds, latency_sum, latency_count
    )
    values (
      c.id, current_date, 1,
      case when v_ok then 0 else 1 end,
      case when v_slow then 1 else 0 end,
      case when v_ok then 0 else v_interval_seconds end,
      coalesce(v_latency, 0), case when v_latency is null then 0 else 1 end
    )
    on conflict (component_id, day) do update set
      checks = d.checks + 1,
      failures = d.failures + case when v_ok then 0 else 1 end,
      degraded = d.degraded + case when v_slow then 1 else 0 end,
      downtime_seconds = d.downtime_seconds + case when v_ok then 0 else v_interval_seconds end,
      latency_sum = d.latency_sum + coalesce(v_latency, 0),
      latency_count = d.latency_count + case when v_latency is null then 0 else 1 end;

    -- The last two samples decide, this one included.
    select
      count(*) filter (where not ok),
      count(*) filter (where ok)
    into v_recent_bad, v_recent_good
    from (
      select ok from public.status_checks
      where component_id = c.id
      order by checked_at desc, id desc
      limit 2
    ) recent;

    if v_recent_bad >= 2 then
      v_target := 'major_outage';
    elsif v_recent_good >= 2 and v_slow then
      v_target := 'degraded_performance';
    elsif v_recent_good >= 2 then
      v_target := 'operational';
    else
      -- Exactly one sample, or a mixed pair: hold the current verdict rather
      -- than flapping on a single reading.
      v_target := c.status;
    end if;

    if v_target is distinct from c.status then
      update public.status_components
        set status = v_target, updated_at = now()
        where id = c.id;
      v_changed := v_changed || jsonb_build_object('slug', c.slug, 'from', c.status, 'to', v_target);
    end if;

    -- Open an automatic incident when a component goes down and there is not
    -- already one open for it (the partial unique index guarantees at most one).
    if v_target = 'major_outage' then
      select id into v_incident from public.status_incidents
      where auto and auto_key = c.slug and resolved_at is null;

      if v_incident is null then
        insert into public.status_incidents (kind, title, impact, status, auto, auto_key)
        values ('incident', c.name || ' is not responding', 'major', 'investigating', true, c.slug)
        returning id into v_incident;

        insert into public.status_incident_components (incident_id, component_id, component_status)
        values (v_incident, c.id, 'major_outage');

        insert into public.status_incident_updates (incident_id, status, body)
        values (v_incident, 'investigating',
          'Automated checks for ' || c.name || ' have failed twice in a row. '
          || 'This incident was opened automatically and is being looked into.');
      end if;

    elsif v_target = 'operational' then
      select id into v_incident from public.status_incidents
      where auto and auto_key = c.slug and resolved_at is null;

      if v_incident is not null then
        insert into public.status_incident_updates (incident_id, status, body)
        values (v_incident, 'resolved',
          'Automated checks for ' || c.name || ' are passing again. '
          || 'This incident was opened and closed automatically.');

        update public.status_incidents
          set status = 'resolved', resolved_at = now(), updated_at = now()
          where id = v_incident;
      end if;
    end if;
  end loop;

  return jsonb_build_object('ok', true, 'changed', v_changed, 'recorded_at', now());
end;
$$;

-- Raw samples past 14 days are already in status_days. Called by the probe on
-- the hour rather than on a schedule of its own.
create or replace function public.status_prune()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_checks int;
  v_reports int;
begin
  delete from public.status_checks where checked_at < now() - interval '14 days';
  get diagnostics v_checks = row_count;

  -- Reports are aggregated over 24 hours and never read individually beyond a
  -- few days of triage, so keeping them for 90 is already generous.
  delete from public.status_reports where created_at < now() - interval '90 days';
  get diagnostics v_reports = row_count;

  delete from public.status_days where day < current_date - 400;

  return jsonb_build_object('ok', true, 'checks_deleted', v_checks, 'reports_deleted', v_reports);
end;
$$;

-- ── user reports ────────────────────────────────────────────────────────────
--
-- service_role only, and deliberately so. Granting this to `anon` would put a
-- one-call "add a report" endpoint behind a key that ships in the browser
-- bundle, and the whole value of the aggregate is that it is expensive to fake.
-- Routing it through the server means the fingerprint is computed from the real
-- request rather than chosen by the sender, and the caller identity is ours.
--
-- The two limits do different jobs and both are needed: the cooldown stops one
-- frustrated person reporting the same thing eleven times in a minute (which is
-- honest behaviour, and would still skew the count), and the hourly cap stops
-- one sender manufacturing a spike across every component in turn.
create or replace function public.status_report_submit(
  p_slug text,
  p_problem text,
  p_fingerprint text,
  p_note text default null,
  p_user uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cfg jsonb;
  v_cooldown int;
  v_cap int;
  v_component uuid;
  v_id uuid;
  v_recent int;
begin
  if p_fingerprint is null or length(p_fingerprint) < 8 then
    return jsonb_build_object('ok', false, 'error', 'bad_fingerprint');
  end if;

  if p_problem is null or p_problem not in
     ('cannot_load', 'slow', 'login', 'gameplay', 'scores', 'purchases', 'social', 'discord', 'other') then
    return jsonb_build_object('ok', false, 'error', 'bad_problem');
  end if;

  if p_slug is not null and p_slug <> '' then
    select id into v_component from public.status_components where slug = p_slug and visible;
    if v_component is null then
      return jsonb_build_object('ok', false, 'error', 'unknown_component');
    end if;
  end if;

  select value into v_cfg from public.status_meta where key = 'reports';
  v_cooldown := coalesce((v_cfg ->> 'cooldown_minutes')::int, 10);
  v_cap := coalesce((v_cfg ->> 'hourly_cap')::int, 6);

  select count(*) into v_recent
  from public.status_reports r
  where r.created_at > now() - make_interval(mins => v_cooldown)
    and r.component_id is not distinct from v_component
    and (r.fingerprint = p_fingerprint or (p_user is not null and r.user_id = p_user));
  if v_recent > 0 then
    return jsonb_build_object('ok', false, 'error', 'already_reported');
  end if;

  select count(*) into v_recent
  from public.status_reports r
  where r.created_at > now() - interval '1 hour'
    and (r.fingerprint = p_fingerprint or (p_user is not null and r.user_id = p_user));
  if v_recent >= v_cap then
    return jsonb_build_object('ok', false, 'error', 'rate_limited');
  end if;

  insert into public.status_reports (component_id, problem, note, user_id, fingerprint)
  values (v_component, p_problem, nullif(btrim(coalesce(p_note, '')), ''), p_user, p_fingerprint)
  returning id into v_id;

  return jsonb_build_object(
    'ok', true,
    'id', v_id,
    'signal', (public.status_reports_timeline(p_slug, 24)) ->> 'signal'
  );
end;
$$;

-- ── staff incident management ───────────────────────────────────────────────

create or replace function public.status_incident_open(
  p_title text,
  p_body text,
  p_impact text default 'minor',
  p_kind text default 'incident',
  p_status text default null,
  p_components jsonb default '[]'::jsonb,
  p_scheduled_for timestamptz default null,
  p_scheduled_until timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_status text;
  v_ref bigint;
  entry jsonb;
  v_component uuid;
begin
  if not public.is_staff() then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  if p_title is null or btrim(p_title) = '' then
    return jsonb_build_object('ok', false, 'error', 'title_required');
  end if;
  if p_body is null or btrim(p_body) = '' then
    return jsonb_build_object('ok', false, 'error', 'body_required');
  end if;
  if p_kind not in ('incident', 'maintenance') then
    return jsonb_build_object('ok', false, 'error', 'bad_kind');
  end if;

  v_status := coalesce(nullif(p_status, ''),
                       case when p_kind = 'maintenance' then 'scheduled' else 'investigating' end);

  insert into public.status_incidents (
    kind, title, impact, status, created_by, scheduled_for, scheduled_until,
    started_at
  )
  values (
    p_kind, btrim(p_title),
    case when p_kind = 'maintenance' then 'maintenance' else p_impact end,
    v_status, auth.uid(), p_scheduled_for, p_scheduled_until,
    coalesce(case when p_kind = 'maintenance' then p_scheduled_for end, now())
  )
  returning id, ref into v_id, v_ref;

  -- `[{"slug":"shop","status":"partial_outage"}, ...]`
  for entry in select * from jsonb_array_elements(coalesce(p_components, '[]'::jsonb))
  loop
    select id into v_component from public.status_components where slug = entry ->> 'slug';
    continue when v_component is null;
    insert into public.status_incident_components (incident_id, component_id, component_status)
    values (v_id, v_component, coalesce(nullif(entry ->> 'status', ''), 'degraded_performance'))
    on conflict (incident_id, component_id) do update
      set component_status = excluded.component_status;
  end loop;

  insert into public.status_incident_updates (incident_id, status, body, author_id)
  values (v_id, v_status, btrim(p_body), auth.uid());

  insert into public.audit_logs (actor_id, action, target_type, target_id, details)
  values (auth.uid(), 'status.incident_open', 'status_incident', v_id::text,
          jsonb_build_object('title', p_title, 'impact', p_impact, 'kind', p_kind));

  return jsonb_build_object('ok', true, 'id', v_id, 'ref', v_ref);
end;
$$;

-- Post an update to an incident, which is also how it is resolved: the last
-- update carries the terminal status rather than there being a separate
-- "close" action that could leave the timeline without a final word.
create or replace function public.status_incident_post(
  p_id uuid,
  p_status text,
  p_body text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  i public.status_incidents;
  v_terminal boolean;
begin
  if not public.is_staff() then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  if p_body is null or btrim(p_body) = '' then
    return jsonb_build_object('ok', false, 'error', 'body_required');
  end if;

  select * into i from public.status_incidents where id = p_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'unknown_incident');
  end if;

  v_terminal := p_status in ('resolved', 'completed');

  insert into public.status_incident_updates (incident_id, status, body, author_id)
  values (p_id, p_status, btrim(p_body), auth.uid());

  update public.status_incidents
    set status = p_status,
        resolved_at = case when v_terminal then coalesce(resolved_at, now()) else null end,
        updated_at = now()
    where id = p_id;

  -- NOTE: resolving deliberately does *not* rewrite component_status on the
  -- incident's rows. It is tempting - it looks like tidying up - but the claim
  -- is already released by status_effective(), which only counts incidents with
  -- no resolved_at. Rewriting them to 'operational' would additionally erase
  -- what the incident actually did, so the history card would show a green
  -- "Leaderboards" chip under the heading "Leaderboards are not loading".
  -- The rows are the record; resolution is a timestamp, not an edit.

  insert into public.audit_logs (actor_id, action, target_type, target_id, details)
  values (auth.uid(), 'status.incident_post', 'status_incident', p_id::text,
          jsonb_build_object('status', p_status));

  return jsonb_build_object('ok', true, 'id', p_id, 'resolved', v_terminal);
end;
$$;

-- Pin or unpin a component. `p_status` null clears the pin.
create or replace function public.status_component_pin(
  p_slug text,
  p_status text default null,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.status_components;
begin
  if not public.is_staff() then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  select * into c from public.status_components where slug = p_slug;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'unknown_component');
  end if;

  update public.status_components
    set pinned_status = nullif(p_status, ''),
        pinned_reason = case when nullif(p_status, '') is null then null else nullif(btrim(coalesce(p_reason, '')), '') end,
        pinned_by = case when nullif(p_status, '') is null then null else auth.uid() end,
        pinned_at = case when nullif(p_status, '') is null then null else now() end,
        updated_at = now()
    where id = c.id;

  insert into public.audit_logs (actor_id, action, target_type, target_id, details)
  values (auth.uid(), 'status.component_pin', 'status_component', c.slug,
          jsonb_build_object('status', p_status, 'reason', p_reason));

  return jsonb_build_object('ok', true, 'slug', c.slug, 'pinned', nullif(p_status, ''));
end;
$$;

-- Recent reports for the admin console, with the note attached. Staff only -
-- this is the one reader that returns rows rather than counts.
create or replace function public.status_recent_reports(p_limit int default 50)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case when not public.is_staff() then jsonb_build_object('ok', false, 'error', 'forbidden')
  else jsonb_build_object('ok', true, 'reports', coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', r.id,
      'problem', r.problem,
      'note', r.note,
      'component', c.slug,
      'component_name', c.name,
      'username', p.username,
      'created_at', r.created_at
    ) order by r.created_at desc)
    from (
      select * from public.status_reports order by created_at desc
      limit greatest(1, least(coalesce(p_limit, 50), 200))
    ) r
    left join public.status_components c on c.id = r.component_id
    left join public.profiles p on p.id = r.user_id
  ), '[]'::jsonb)) end;
$$;

-- ────────────────────────────── grants ──────────────────────────────────────

-- Public readers. /status must work signed out, so these are open to anon.
revoke execute on function public.status_rank(text) from public;
revoke execute on function public.status_indicator(int) from public;
revoke execute on function public.status_effective(uuid) from public;
revoke execute on function public.status_uptime_pct(uuid, int) from public;
revoke execute on function public.status_uptime_series(uuid, int) from public;
revoke execute on function public.status_uptime_matrix(int) from public;
revoke execute on function public.status_incident_json(public.status_incidents) from public;
revoke execute on function public.status_summary() from public;
revoke execute on function public.status_component(text) from public;
revoke execute on function public.status_incident_history(int, timestamptz, text) from public;
revoke execute on function public.status_uptime(text, int) from public;
revoke execute on function public.status_reports_timeline(text, int) from public;

grant execute on function public.status_rank(text) to anon, authenticated, service_role;
grant execute on function public.status_indicator(int) to anon, authenticated, service_role;
grant execute on function public.status_effective(uuid) to anon, authenticated, service_role;
grant execute on function public.status_uptime_pct(uuid, int) to anon, authenticated, service_role;
grant execute on function public.status_uptime_series(uuid, int) to anon, authenticated, service_role;
grant execute on function public.status_uptime_matrix(int) to anon, authenticated, service_role;
grant execute on function public.status_incident_json(public.status_incidents) to anon, authenticated, service_role;
grant execute on function public.status_summary() to anon, authenticated, service_role;
grant execute on function public.status_component(text) to anon, authenticated, service_role;
grant execute on function public.status_incident_history(int, timestamptz, text) to anon, authenticated, service_role;
grant execute on function public.status_uptime(text, int) to anon, authenticated, service_role;
grant execute on function public.status_reports_timeline(text, int) to anon, authenticated, service_role;

-- Writers the site drives on the visitor's behalf, but never the visitor
-- directly - see status_report_submit's comment.
revoke execute on function public.status_selfcheck() from public, anon, authenticated;
revoke execute on function public.status_record_checks(jsonb) from public, anon, authenticated;
revoke execute on function public.status_prune() from public, anon, authenticated;
revoke execute on function public.status_report_submit(text, text, text, text, uuid) from public, anon, authenticated;

grant execute on function public.status_selfcheck() to service_role;
grant execute on function public.status_record_checks(jsonb) to service_role;
grant execute on function public.status_prune() to service_role;
grant execute on function public.status_report_submit(text, text, text, text, uuid) to service_role;

-- Staff writers. Granted to `authenticated` because they check is_staff()
-- themselves and are called from server actions in the user's own session.
revoke execute on function public.status_incident_open(text, text, text, text, text, jsonb, timestamptz, timestamptz) from public, anon;
revoke execute on function public.status_incident_post(uuid, text, text) from public, anon;
revoke execute on function public.status_component_pin(text, text, text) from public, anon;
revoke execute on function public.status_recent_reports(int) from public, anon;

grant execute on function public.status_incident_open(text, text, text, text, text, jsonb, timestamptz, timestamptz) to authenticated, service_role;
grant execute on function public.status_incident_post(uuid, text, text) to authenticated, service_role;
grant execute on function public.status_component_pin(text, text, text) to authenticated, service_role;
grant execute on function public.status_recent_reports(int) to authenticated, service_role;

-- ──────────────────────────── the components ────────────────────────────────
--
-- Named for what a player would recognise, not for how it is deployed. Nobody
-- reporting a problem is looking for "Postgres connection pool"; they are
-- looking for "Games and scores". The one exception is Database, which is there
-- because when it is the database everything else is a symptom, and saying so
-- once is kinder than showing eight red rows.

insert into public.status_components (slug, name, description, group_name, position, probe, probe_target, degraded_ms)
values
  ('website', 'Website', 'The arcade itself - browsing games, profiles and every page on the site.',
   'Website', 10, 'http', '/', 2500),
  ('accounts', 'Accounts and sign-in', 'Signing in, signing up, and linking Discord or Google.',
   'Website', 20, 'auth', null, 2000),

  ('games', 'Games and scores', 'Loading a game, playing it, and having the run recorded.',
   'Arcade', 30, 'db', 'games', 1200),
  ('leaderboards', 'Leaderboards', 'Rankings, personal bests and the podium.',
   'Arcade', 40, 'db', 'leaderboards', 1200),
  ('parties', 'Parties and multiplayer', 'Party rooms, invites and real-time match state.',
   'Arcade', 50, 'db', 'parties', 1500),

  ('social', 'Messages and friends', 'Direct messages, group chats, friends and stories.',
   'Community', 60, 'db', 'social', 1200),
  ('economy', 'Credits and shop', 'Credit balances, the shop, the inventory and cosmetics.',
   'Community', 70, 'db', 'economy', 1200),

  ('database', 'Database', 'The Supabase Postgres instance everything above is built on.',
   'Infrastructure', 80, 'db', 'database', 800),

  ('discord-bot', 'Discord bot', 'Slash commands, the gateway worker, chat levels and the live feed.',
   'Integrations', 90, 'discord_worker', null, 3000),
  ('discord-api', 'Discord API', 'Discord itself. Shown because our bot is only ever as up as Discord is.',
   'Integrations', 100, 'discord_api', 'https://discord.com/api/v10/gateway', 3000)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  group_name = excluded.group_name,
  position = excluded.position,
  probe = excluded.probe,
  probe_target = excluded.probe_target,
  degraded_ms = excluded.degraded_ms;

comment on table public.status_components is
  'One row per thing /status reports on. `status` is what the probes think, '
  'pinned_status is a staff override that wins outright, and open incidents '
  'contribute their own per-component status - status_effective() combines them.';

comment on table public.status_reports is
  'Downdetector-style "this is broken for me" taps. Only ever read in '
  'aggregate through status_reports_timeline(); rows are staff-only.';
