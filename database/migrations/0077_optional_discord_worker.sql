-- 0077_optional_discord_worker.sql
-- A serverless-only installation does not have a Discord gateway worker.
-- Do not count a worker that has never checked in as a major outage.
-- A worker that has checked in even once remains monitored, including when stale.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.discord_bot_config
    WHERE key = 'worker'
      AND NULLIF(value ->> 'last_seen', '') IS NOT NULL
  ) THEN
    -- Retire only auto-created alerts, never a staff-authored incident.
    INSERT INTO public.status_incident_updates (incident_id, status, body)
    SELECT id, 'resolved',
      'Monitoring corrected: no gateway worker has ever checked in. This optional service was not deployed, so the automated outage was invalid.'
    FROM public.status_incidents
    WHERE auto = true AND auto_key = 'discord-bot' AND resolved_at IS NULL;

    UPDATE public.status_incidents
    SET status = 'resolved', resolved_at = now(), updated_at = now()
    WHERE auto = true AND auto_key = 'discord-bot' AND resolved_at IS NULL;

    UPDATE public.status_components
    SET status = 'operational', visible = false, updated_at = now()
    WHERE slug = 'discord-bot';
  END IF;
END $$;

INSERT INTO public.status_meta (key, value)
VALUES ('schema', jsonb_build_object('version', '0077'))
ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = now();
