-- 0010_banner_config.sql
-- Editable maintenance + site banners driven by feature_flags.payload.
--
-- The maintenance banner gains an editable message (payload.message). A new
-- `site_banner` flag adds a general-purpose, variant-styled announcement banner
-- with an optional call-to-action link. No new functions, so no grants needed.

-- Site-wide promo/info banner, separate from the maintenance warning.
insert into public.feature_flags (key, enabled, description, payload)
values (
  'site_banner',
  false,
  'Show an editable site-wide banner',
  '{"message":"","variant":"info","link_label":"","link_href":""}'::jsonb
)
on conflict (key) do nothing;

-- Seed a default editable message for the maintenance banner if one is not set,
-- so the admin editor is pre-filled with the previously hard-coded copy.
update public.feature_flags
set payload = jsonb_set(
  coalesce(payload, '{}'::jsonb),
  '{message}',
  '"Scheduled maintenance in progress — some features may be temporarily unavailable."'
)
where key = 'maintenance_banner'
  and not (coalesce(payload, '{}'::jsonb) ? 'message');
