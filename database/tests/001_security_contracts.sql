-- Phase 2: run ONLY against an isolated local/staging database after all migrations.
-- Read-only assertions. Never run write/concurrency suites against production.
begin read only;
do $$
declare r record;
begin
  for r in
    select p.proname, p.oid
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public'
      and p.proname in ('award_credits','add_xp','cron_call')
  loop
    if has_function_privilege('anon',r.oid,'EXECUTE')
      or has_function_privilege('authenticated',r.oid,'EXECUTE') then
      raise exception 'Privileged function % is executable by a client role', r.proname;
    end if;
  end loop;
  if not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='submit_score'
  ) then raise exception 'submit_score RPC is missing'; end if;
  if not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='purchase_shop_item'
  ) then raise exception 'purchase_shop_item RPC is missing'; end if;
  if (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relkind in ('r','p')
      and c.relname in ('profiles','play_sessions','leaderboard_scores','inventory_items','credit_transactions')) <> 5
  then raise exception 'Expected sensitive tables missing'; end if;
  if exists (
    select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind in ('r','p')
      and c.relname in ('profiles','play_sessions','leaderboard_scores','inventory_items','credit_transactions')
      and not c.relrowsecurity
  ) then raise exception 'Sensitive public table lacks row-level security'; end if;
end $$;
rollback;
