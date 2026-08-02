-- 0048_hyphens_not_em_dashes.sql
-- House style is a hyphen, not an em dash. The repo was swept separately; this
-- is the half of the copy that lives in the database.
--
-- Two things need doing, and only the second one is permanent. Rewriting the
-- rows fixes the text that exists today; rewriting the functions stops new em
-- dashes being minted tomorrow, because six functions build notification and
-- challenge copy with an em dash baked into a format string.
--
-- The functions are rewritten from pg_get_functiondef() rather than being
-- retyped here. Retyping six bodies by hand invites drift between what this
-- file says and what is actually live - especially since some of them were
-- last replaced several migrations ago. Round-tripping the live definition and
-- swapping one character is faithful by construction, and re-running it is a
-- no-op once no em dashes remain.
--
-- audit_logs is deliberately excluded. It is an append-only record of what
-- happened, and tidying the punctuation in a historical log entry would be
-- editing evidence to look neater than it was.

-- ── Existing rows ──────────────────────────────────────────────────────────

update public.games
set description = replace(description, '—', '-')
where description like '%—%';

update public.games
set how_to_play = replace(how_to_play, '—', '-')
where how_to_play like '%—%';

update public.challenges
set description = replace(description, '—', '-')
where description like '%—%';

update public.announcements
set body = replace(body, '—', '-')
where body like '%—%';

-- value is jsonb (the bot's verification copy lives inside it). Round-tripping
-- through text is safe: an em dash can only ever appear inside a string value,
-- never in JSON's structural syntax, so nothing else can be disturbed.
update public.discord_bot_config
set value = replace(value::text, '—', '-')::jsonb
where value::text like '%—%';

-- Already-delivered notifications are still rendered in the bell menu, so they
-- are copy the player can see today rather than a historical record.
update public.notifications
set body = replace(body, '—', '-')
where body like '%—%';

update public.notifications
set title = replace(title, '—', '-')
where title like '%—%';

-- ── The functions that mint new ones ───────────────────────────────────────

do $$
declare
  r record;
  v_def text;
begin
  for r in
    select p.oid
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosrc like '%—%'
  loop
    v_def := replace(pg_get_functiondef(r.oid), '—', '-');
    execute v_def;
  end loop;
end $$;
