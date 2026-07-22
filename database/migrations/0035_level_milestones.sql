-- 0035_level_milestones.sql
-- Roadmap v1.3 "Level-milestone unlocks": levelling now unlocks real features,
-- so the ladder has a point beyond a number — and gating social features
-- behind either a linked Discord account OR a real level keeps spam out
-- without walling off dedicated email-only players.
--
--   Level 10 → create group chats     (was: Discord-linked/staff only)
--   Level 15 → post stories           (was: Discord-linked/staff only)
--
-- Discord-linked members and staff keep instant access, as before.

create or replace function public.create_group(p_name text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_me uuid := auth.uid(); v_id uuid; v_code text; v_linked boolean; v_staff boolean; v_level int;
begin
  if v_me is null then raise exception 'authentication required'; end if;
  if char_length(coalesce(trim(p_name),'')) < 1 then return jsonb_build_object('ok',false,'error','Name required'); end if;
  select discord_linked, role in ('admin','moderator'), level into v_linked, v_staff, v_level
  from public.profiles where id=v_me;
  if not (coalesce(v_linked,false) or coalesce(v_staff,false) or coalesce(v_level,0) >= 10) then
    return jsonb_build_object('ok',false,'error','Link your Discord account or reach level 10 to create groups');
  end if;
  v_code := substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
  insert into public.conversations (is_group, name, invite_code, owner_id)
    values (true, left(trim(p_name),60), v_code, v_me) returning id into v_id;
  insert into public.conversation_members (conversation_id, user_id, role) values (v_id, v_me, 'owner');
  return jsonb_build_object('ok',true,'conversation_id',v_id,'invite_code',v_code);
end; $$;
revoke execute on function public.create_group(text) from public, anon;
grant execute on function public.create_group(text) to authenticated;

create or replace function public.post_story(p_kind text, p_content text, p_data jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_me uuid := auth.uid(); v_linked boolean; v_staff boolean; v_level int;
begin
  if v_me is null then raise exception 'authentication required'; end if;
  select discord_linked, role in ('admin','moderator'), level into v_linked, v_staff, v_level
  from public.profiles where id=v_me;
  if not (coalesce(v_linked,false) or coalesce(v_staff,false) or coalesce(v_level,0) >= 15) then
    return jsonb_build_object('ok',false,'error','Link your Discord account or reach level 15 to post stories');
  end if;
  if p_kind not in ('text','achievement') then return jsonb_build_object('ok',false,'error','Invalid story'); end if;
  if p_kind='text' and coalesce(char_length(trim(p_content)),0) < 1 then return jsonb_build_object('ok',false,'error','Say something first'); end if;
  insert into public.stories (user_id, kind, content, data) values (v_me, p_kind, left(coalesce(p_content,''),280), coalesce(p_data,'{}'::jsonb));
  return jsonb_build_object('ok',true);
end; $$;
revoke execute on function public.post_story(text,text,jsonb) from public, anon;
grant execute on function public.post_story(text,text,jsonb) to authenticated;
