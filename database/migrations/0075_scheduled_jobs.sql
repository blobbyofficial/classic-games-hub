-- 0075_scheduled_jobs.sql
--
-- The four sub-daily cron jobs, moved off a third-party scheduler and into the
-- database.
--
-- docs/cron-jobs.md has always listed this as an option - "keeps the schedule
-- next to the data and needs no third party" - and then recommended
-- cron-job.org anyway. This migration takes the option.
--
-- The problem it solves is not that cron-job.org is bad. It is that the
-- schedule for the site's most timing-sensitive job lived in a free account on
-- a service with no alerting, owned by one person, and nothing in this
-- repository could tell you whether it was still running. `status_record_checks`
-- counts a failed check as five minutes of downtime, so a probe that silently
-- stops does not leave a gap in the graph - it leaves a *wrong* graph.
--
-- vercel.json is untouched and must stay untouched: two entries, both daily.
-- The Hobby plan rejects a sub-daily expression when the deployment is created,
-- which produces no deployment at all and no error anywhere. That cost ten days
-- of deploys in August 2026 and it is why these jobs are down here instead.
--
-- ─────────────────────────── BEFORE THIS WORKS ───────────────────────────
--
-- The bearer token is NOT in this file and must never be. Run this once, in
-- the SQL editor, with the real value from Vercel → Settings → Environment
-- Variables → CRON_SECRET:
--
--     select vault.create_secret('<the-real-CRON_SECRET>', 'cron_secret',
--                                'Bearer token for /api/cron/* routes');
--
-- Until that secret exists every scheduled call is skipped with a warning
-- rather than firing unauthenticated - see cron_call() below. To rotate it,
-- update the secret; the jobs pick the new value up on their next tick with no
-- redeploy and no reschedule.

-- ───────────────────────── 1. Extensions ─────────────────────────

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

-- ───────────────────────── 2. One way to make the call ─────────────────────
--
-- Every job goes through this, so the URL, the auth header and the
-- missing-secret behaviour are defined once. net.http_get queues the request
-- and returns immediately, so a slow or dead route delays nothing and a job
-- can never overrun its own interval.
--
-- The base URL is a setting rather than a literal so a fork, a staging project
-- or a domain change is one UPDATE rather than an edit to a shipped migration.

insert into public.status_meta (key, value)
values ('cron_base_url',
        jsonb_build_object('url', 'https://classic-games-hub.blobbyofficial.com'))
on conflict (key) do nothing;

create or replace function public.cron_call(p_path text)
returns bigint
language plpgsql
security definer
set search_path = public, extensions, vault
as $$
declare
  v_secret text;
  v_base   text;
begin
  select decrypted_secret into v_secret
    from vault.decrypted_secrets
   where name = 'cron_secret';

  -- Firing without the header would hit a route that correctly returns 401,
  -- four times a minute, forever. Skipping loudly is the better failure: the
  -- warning names the fix and lands in the Postgres logs.
  if v_secret is null then
    raise warning 'cron_call(%): vault secret "cron_secret" is not set - skipping. %',
      p_path, 'See database/migrations/0075_scheduled_jobs.sql.';
    return null;
  end if;

  select value->>'url' into v_base from public.status_meta where key = 'cron_base_url';
  if v_base is null then
    raise warning 'cron_call(%): status_meta.cron_base_url is not set - skipping.', p_path;
    return null;
  end if;

  return net.http_get(
    url     := v_base || p_path,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || v_secret,
      'User-Agent',    'classic-games-hub-pg_cron'
    ),
    timeout_milliseconds := 55000
  );
end;
$$;

-- Nothing outside the scheduler has any business calling this: it is an
-- authenticated fetch of an admin route with the secret already attached.
revoke execute on function public.cron_call(text) from public, anon, authenticated;

-- ───────────────────────── 3. The schedule ─────────────────────────
--
-- Unscheduled first so re-running this migration re-registers cleanly rather
-- than erroring on a duplicate job name. cron.unschedule throws if the job is
-- absent, hence the guard.

do $$
declare
  v_job text;
begin
  foreach v_job in array array[
    'status-probe', 'discord-role-sync', 'discord-stats', 'discord-audit-log'
  ] loop
    if exists (select 1 from cron.job where jobname = v_job) then
      perform cron.unschedule(v_job);
    end if;
  end loop;
end;
$$;

-- Cadences are the ones docs/cron-jobs.md says each job wants, now that
-- nothing is capping them.

-- Five minutes, because status_record_checks assumes exactly that.
select cron.schedule('status-probe', '*/5 * * * *',
  $$select public.cron_call('/api/cron/status-probe')$$);

-- Two minutes: roles drifting from the site is visible to the person it
-- happened to, and this is the sweep that catches what on-change sync missed.
select cron.schedule('discord-role-sync', '*/2 * * * *',
  $$select public.cron_call('/api/cron/discord-role-sync')$$);

-- Ten minutes. The gateway worker also refreshes these on its own timer while
-- it is up; both running is harmless, the route is idempotent.
select cron.schedule('discord-stats', '*/10 * * * *',
  $$select public.cron_call('/api/cron/discord-stats')$$);

-- Five minutes, and likewise redundant with the worker rather than conflicting
-- with it - the poller's cursor is what stops it logging anything twice.
select cron.schedule('discord-audit-log', '*/5 * * * *',
  $$select public.cron_call('/api/cron/discord-audit-log')$$);

-- ───────────────────────── 4. Reading it back ─────────────────────────
--
-- A schedule you cannot inspect is the thing this migration is replacing, so
-- it ships with the query that answers "is it running?". Admin-only; the
-- response carries no secret, only job names, cadences and outcomes.

create or replace function public.admin_cron_status()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, cron, vault
as $$
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;

  return jsonb_build_object(
    'ok', true,
    -- Whether the token is set, never what it is.
    'secret_set', exists (select 1 from vault.decrypted_secrets where name = 'cron_secret'),
    'jobs', coalesce((
      select jsonb_agg(jsonb_build_object(
        'name',        j.jobname,
        'schedule',    j.schedule,
        'active',      j.active,
        'last_run',    r.start_time,
        'last_status', r.status
      ) order by j.jobname)
      from cron.job j
      left join lateral (
        select start_time, status
          from cron.job_run_details d
         where d.jobid = j.jobid
         order by start_time desc
         limit 1
      ) r on true
      where j.jobname in ('status-probe','discord-role-sync','discord-stats','discord-audit-log')
    ), '[]'::jsonb)
  );
end;
$$;

revoke execute on function public.admin_cron_status() from public, anon;
grant execute on function public.admin_cron_status() to authenticated;

-- ───────────────────────── 5. Schema version ─────────────────────────

insert into public.status_meta (key, value)
values ('schema', jsonb_build_object('version', '0075'))
on conflict (key) do update set value = excluded.value, updated_at = now();
