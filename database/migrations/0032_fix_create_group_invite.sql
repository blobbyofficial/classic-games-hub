-- 0032_fix_create_group_invite.sql
-- Fix live group-creation bug. Migration 0026's create_group used
-- encode(gen_random_bytes(6),'hex'), but pgcrypto lives in the `extensions`
-- schema while the function runs with search_path=public, so the call errored:
--   "function gen_random_bytes(integer) does not exist".
-- Swap the invite-code generation to gen_random_uuid() (available in public
-- without pgcrypto). Everything else is identical to 0026: Discord-link/staff
-- gate, security definer, search_path=public, and the same grants.

create or replace function public.create_group(p_name text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_me uuid := auth.uid(); v_id uuid; v_code text; v_linked boolean; v_staff boolean;
begin
  if v_me is null then raise exception 'authentication required'; end if;
  if char_length(coalesce(trim(p_name),'')) < 1 then return jsonb_build_object('ok',false,'error','Name required'); end if;
  select discord_linked, role in ('admin','moderator') into v_linked, v_staff from public.profiles where id=v_me;
  if not (coalesce(v_linked,false) or coalesce(v_staff,false)) then
    return jsonb_build_object('ok',false,'error','Link your Discord account to create groups');
  end if;
  v_code := substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
  insert into public.conversations (is_group, name, invite_code, owner_id)
    values (true, left(trim(p_name),60), v_code, v_me) returning id into v_id;
  insert into public.conversation_members (conversation_id, user_id, role) values (v_id, v_me, 'owner');
  return jsonb_build_object('ok',true,'conversation_id',v_id,'invite_code',v_code);
end; $$;
revoke execute on function public.create_group(text) from public, anon;
grant execute on function public.create_group(text) to authenticated;
