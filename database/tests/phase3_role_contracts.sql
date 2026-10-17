-- Phase 3 read-only verification against a fully migrated, DISPOSABLE database.
-- Requires a trusted admin connection. Not proof of behaviour under parallel loads.
begin read only;
do $$
declare
  name text;
  arg_types text;
  obj regprocedure;
  enabled boolean;
  can_insert boolean;
  can_update boolean;
  can_delete boolean;
begin
  foreach name in array array['submit_score','purchase_shop_item','gift_item','gift_with_token'] loop
    case name
      when 'submit_score' then arg_types := 'text,bigint,integer,text';
      when 'purchase_shop_item' then arg_types := 'text';
      else arg_types := 'text,uuid';
    end case;
    obj := to_regprocedure(format('public.%I(%s)',name,arg_types));
    if obj is null then raise exception 'Missing RPC % (%)',name,arg_types; end if;
    if has_function_privilege('anon',obj,'EXECUTE') then
      raise exception 'Anonymous role can execute %',obj;
    end if;
    if not has_function_privilege('authenticated',obj,'EXECUTE') then
      raise exception 'Player role cannot execute %',obj;
    end if;
  end loop;
  foreach name in array array['award_credits','add_xp'] loop
    select p.oid::regprocedure into obj from pg_proc p
      join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='public' and p.proname=name limit 1;
    if obj is null then raise exception 'Internal helper % missing',name; end if;
    if has_function_privilege('anon',obj,'EXECUTE')
      or has_function_privilege('authenticated',obj,'EXECUTE') then
      raise exception 'Internal helper % is client-callable',obj;
    end if;
  end loop;
  foreach name in array array['profiles','play_sessions','leaderboard_scores','inventory_items','credit_transactions'] loop
    select c.relrowsecurity into enabled from pg_class c
      join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relname=name and c.relkind in ('r','p');
    if enabled is distinct from true then
      raise exception 'Table % absent or RLS disabled',name;
    end if;
    -- Flag accidental anonymous write grants even when RLS is enabled.
    if name in ('credit_transactions','play_sessions','leaderboard_scores') then
      select has_table_privilege('anon',format('public.%I',name),'INSERT'),
             has_table_privilege('anon',format('public.%I',name),'UPDATE'),
             has_table_privilege('anon',format('public.%I',name),'DELETE')
        into can_insert,can_update,can_delete;
      if can_insert or can_update or can_delete then
        raise exception 'Anonymous write grant on sensitive table %',name;
      end if;
    end if;
  end loop;
end $$;
rollback;
