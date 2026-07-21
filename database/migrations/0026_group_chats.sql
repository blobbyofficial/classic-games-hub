-- 0026: group chats. Conversations can be groups with a name, invite code and
-- owner; members carry a role. Creation is gated to Discord-linked members and
-- staff (a booster proxy until the bot lands). Reuses the existing messages
-- table + RLS (is_conversation_member covers groups too).

alter table public.conversations
  add column if not exists is_group boolean not null default false,
  add column if not exists name text check (char_length(name) <= 60),
  add column if not exists invite_code text unique,
  add column if not exists owner_id uuid references public.profiles(id) on delete set null;

alter table public.conversation_members
  add column if not exists role text not null default 'member' check (role in ('owner','admin','member'));

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
  v_code := encode(gen_random_bytes(6),'hex');
  insert into public.conversations (is_group, name, invite_code, owner_id)
    values (true, left(trim(p_name),60), v_code, v_me) returning id into v_id;
  insert into public.conversation_members (conversation_id, user_id, role) values (v_id, v_me, 'owner');
  return jsonb_build_object('ok',true,'conversation_id',v_id,'invite_code',v_code);
end; $$;
revoke execute on function public.create_group(text) from public, anon;
grant execute on function public.create_group(text) to authenticated;

create or replace function public.join_group(p_code text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_me uuid := auth.uid(); v_id uuid;
begin
  if v_me is null then raise exception 'authentication required'; end if;
  select id into v_id from public.conversations where invite_code = p_code and is_group;
  if v_id is null then return jsonb_build_object('ok',false,'error','That invite is invalid'); end if;
  insert into public.conversation_members (conversation_id, user_id, role)
    values (v_id, v_me, 'member') on conflict do nothing;
  return jsonb_build_object('ok',true,'conversation_id',v_id);
end; $$;
revoke execute on function public.join_group(text) from public, anon;
grant execute on function public.join_group(text) to authenticated;

create or replace function public.leave_conversation(p_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
  delete from public.conversation_members where conversation_id=p_id and user_id=auth.uid();
end; $$;
revoke execute on function public.leave_conversation(uuid) from public, anon;
grant execute on function public.leave_conversation(uuid) to authenticated;

-- Rebuilt to surface groups (title/is_group/member_count) alongside DMs.
drop function if exists public.list_conversations();
create function public.list_conversations()
returns table (
  conversation_id uuid, last_message_at timestamptz, is_group boolean, title text,
  other_user_id uuid, other_username text, other_avatar_url text, other_last_seen timestamptz,
  member_count int, last_message text, last_message_sender uuid, unread int
)
language sql stable security definer set search_path = public as $$
  select
    c.id, c.last_message_at, c.is_group,
    case when c.is_group then coalesce(c.name,'Group') else coalesce(op.display_name, op.username::text) end,
    case when c.is_group then null else op.id end,
    case when c.is_group then null else op.username::text end,
    case when c.is_group then null else op.avatar_url end,
    case when c.is_group then null else op.last_seen_at end,
    (select count(*)::int from public.conversation_members cm where cm.conversation_id = c.id),
    lm.content, lm.sender_id,
    (select count(*)::int from public.messages m
      where m.conversation_id = c.id and m.sender_id <> (select auth.uid()) and m.created_at > me.last_read_at)
  from public.conversation_members me
  join public.conversations c on c.id = me.conversation_id
  left join lateral (
    select op.id, op.username, op.display_name, op.avatar_url, op.last_seen_at
    from public.conversation_members om join public.profiles op on op.id = om.user_id
    where om.conversation_id = c.id and om.user_id <> (select auth.uid()) limit 1
  ) op on true
  left join lateral (
    select content, sender_id from public.messages m
    where m.conversation_id = c.id and m.deleted_at is null order by m.created_at desc limit 1
  ) lm on true
  where me.user_id = (select auth.uid())
  order by c.last_message_at desc;
$$;
grant execute on function public.list_conversations() to authenticated;
