-- ═══════════════════════════════════════════════════════════════════════════
-- Classic Games Hub — 0003 social
-- Friendships, blocks, direct messages, realtime
-- ═══════════════════════════════════════════════════════════════════════════

create table public.friendships (
  id bigint generated always as identity primary key,
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);

create index friendships_addressee_idx on public.friendships (addressee_id, status);
create index friendships_requester_idx on public.friendships (requester_id, status);

create table public.user_blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

create table public.conversation_members (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create index conversation_members_user_idx on public.conversation_members (user_id);

create table public.messages (
  id bigint generated always as identity primary key,
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  content text not null check (char_length(content) between 1 and 2000),
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz
);

create index messages_conversation_idx on public.messages (conversation_id, created_at desc);

-- ── helpers ─────────────────────────────────────────────────────────────────
create or replace function public.are_friends(p_a uuid, p_b uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.friendships
    where status = 'accepted'
      and ((requester_id = p_a and addressee_id = p_b)
        or (requester_id = p_b and addressee_id = p_a))
  );
$$;

create or replace function public.is_conversation_member(p_conversation uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.conversation_members
    where conversation_id = p_conversation and user_id = (select auth.uid())
  );
$$;

create or replace function public.is_blocked_either_way(p_a uuid, p_b uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_blocks
    where (blocker_id = p_a and blocked_id = p_b)
       or (blocker_id = p_b and blocked_id = p_a)
  );
$$;

-- ── friend request flow ─────────────────────────────────────────────────────
create or replace function public.send_friend_request(p_username text)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_target public.profiles;
  v_reverse public.friendships;
  v_me_name text;
begin
  if v_me is null then
    raise exception 'authentication required';
  end if;

  select * into v_target from public.profiles where username = p_username;
  if v_target.id is null then
    return jsonb_build_object('ok', false, 'error', 'User not found');
  end if;
  if v_target.id = v_me then
    return jsonb_build_object('ok', false, 'error', 'You cannot add yourself');
  end if;
  if public.is_blocked_either_way(v_me, v_target.id) then
    return jsonb_build_object('ok', false, 'error', 'Unable to send request');
  end if;
  if not exists (
    select 1 from public.user_settings
    where user_id = v_target.id and allow_friend_requests
  ) then
    return jsonb_build_object('ok', false, 'error', 'This player is not accepting friend requests');
  end if;
  if exists (
    select 1 from public.friendships
    where requester_id = v_me and addressee_id = v_target.id and status in ('pending', 'accepted')
  ) then
    return jsonb_build_object('ok', false, 'error', 'Request already exists');
  end if;

  -- If they already asked us, accept instead of duplicating.
  select * into v_reverse from public.friendships
  where requester_id = v_target.id and addressee_id = v_me and status = 'pending';
  if v_reverse.id is not null then
    update public.friendships
    set status = 'accepted', responded_at = now()
    where id = v_reverse.id;
    return jsonb_build_object('ok', true, 'status', 'accepted');
  end if;

  insert into public.friendships (requester_id, addressee_id)
  values (v_me, v_target.id)
  on conflict (requester_id, addressee_id)
  do update set status = 'pending', created_at = now(), responded_at = null;

  select username into v_me_name from public.profiles where id = v_me;
  insert into public.notifications (user_id, type, title, body, data)
  values (
    v_target.id, 'friend_request', 'New friend request',
    format('%s wants to be your friend.', v_me_name),
    jsonb_build_object('username', v_me_name)
  );

  return jsonb_build_object('ok', true, 'status', 'pending');
end;
$$;

create or replace function public.respond_friend_request(p_id bigint, p_accept boolean)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_row public.friendships;
  v_me_name text;
begin
  select * into v_row from public.friendships
  where id = p_id and addressee_id = v_me and status = 'pending';
  if v_row.id is null then
    return jsonb_build_object('ok', false, 'error', 'Request not found');
  end if;

  update public.friendships
  set status = case when p_accept then 'accepted' else 'declined' end,
      responded_at = now()
  where id = p_id;

  if p_accept then
    select username into v_me_name from public.profiles where id = v_me;
    insert into public.notifications (user_id, type, title, body, data)
    values (
      v_row.requester_id, 'friend_accepted', 'Friend request accepted',
      format('%s accepted your friend request.', v_me_name),
      jsonb_build_object('username', v_me_name)
    );
    insert into public.activity_events (user_id, type, data)
    values (v_me, 'friend_added', jsonb_build_object('friend_id', v_row.requester_id));
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.remove_friend(p_user uuid)
returns void
language sql security definer
set search_path = public
as $$
  delete from public.friendships
  where status = 'accepted'
    and ((requester_id = (select auth.uid()) and addressee_id = p_user)
      or (requester_id = p_user and addressee_id = (select auth.uid())));
$$;

create or replace function public.block_user(p_user uuid)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
begin
  if v_me is null or p_user = v_me then
    raise exception 'invalid block';
  end if;
  insert into public.user_blocks (blocker_id, blocked_id)
  values (v_me, p_user)
  on conflict do nothing;
  delete from public.friendships
  where (requester_id = v_me and addressee_id = p_user)
     or (requester_id = p_user and addressee_id = v_me);
end;
$$;

create or replace function public.unblock_user(p_user uuid)
returns void
language sql security definer
set search_path = public
as $$
  delete from public.user_blocks
  where blocker_id = (select auth.uid()) and blocked_id = p_user;
$$;

-- ── direct messages ─────────────────────────────────────────────────────────
create or replace function public.get_or_create_dm(p_user uuid)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_conversation uuid;
  v_allow text;
begin
  if v_me is null then
    raise exception 'authentication required';
  end if;
  if p_user = v_me then
    raise exception 'cannot message yourself';
  end if;
  if public.is_blocked_either_way(v_me, p_user) then
    raise exception 'unable to start conversation';
  end if;

  select allow_dms into v_allow from public.user_settings where user_id = p_user;
  if v_allow = 'none' then
    raise exception 'this player has messages disabled';
  end if;
  if v_allow = 'friends' and not public.are_friends(v_me, p_user) then
    raise exception 'this player only accepts messages from friends';
  end if;

  select cm.conversation_id into v_conversation
  from public.conversation_members cm
  join public.conversation_members other
    on other.conversation_id = cm.conversation_id and other.user_id = p_user
  where cm.user_id = v_me
  limit 1;

  if v_conversation is null then
    insert into public.conversations default values returning id into v_conversation;
    insert into public.conversation_members (conversation_id, user_id)
    values (v_conversation, v_me), (v_conversation, p_user);
  end if;

  return v_conversation;
end;
$$;

-- Bump conversation freshness + notify recipients on new message.
create or replace function public.handle_new_message()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_sender text;
begin
  update public.conversations
  set last_message_at = new.created_at
  where id = new.conversation_id;

  select username into v_sender from public.profiles where id = new.sender_id;

  insert into public.notifications (user_id, type, title, body, data)
  select cm.user_id, 'message', format('New message from %s', v_sender),
         left(new.content, 80),
         jsonb_build_object('conversation_id', new.conversation_id, 'username', v_sender)
  from public.conversation_members cm
  where cm.conversation_id = new.conversation_id
    and cm.user_id <> new.sender_id
    and not exists (
      select 1 from public.notifications n
      where n.user_id = cm.user_id
        and n.type = 'message'
        and n.read_at is null
        and n.data ->> 'conversation_id' = new.conversation_id::text
    );

  return new;
end;
$$;

create trigger on_message_created
after insert on public.messages
for each row execute function public.handle_new_message();

create or replace function public.mark_conversation_read(p_conversation uuid)
returns void
language sql security definer
set search_path = public
as $$
  update public.conversation_members
  set last_read_at = now()
  where conversation_id = p_conversation and user_id = (select auth.uid());
  update public.notifications
  set read_at = now()
  where user_id = (select auth.uid())
    and type = 'message'
    and read_at is null
    and data ->> 'conversation_id' = p_conversation::text;
$$;

-- ── row level security ──────────────────────────────────────────────────────
alter table public.friendships enable row level security;
alter table public.user_blocks enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;

create policy "own friendships" on public.friendships
  for select using ((select auth.uid()) in (requester_id, addressee_id));

create policy "own blocks" on public.user_blocks
  for select using ((select auth.uid()) = blocker_id);

create policy "member conversations" on public.conversations
  for select using (public.is_conversation_member(id));

create policy "member conversation members" on public.conversation_members
  for select using (public.is_conversation_member(conversation_id));

create policy "update own membership" on public.conversation_members
  for update using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "member messages" on public.messages
  for select using (public.is_conversation_member(conversation_id));

create policy "send messages" on public.messages
  for insert with check (
    (select auth.uid()) = sender_id
    and public.is_conversation_member(conversation_id)
    and not exists (
      select 1 from public.profiles where id = (select auth.uid()) and is_banned
    )
  );

create policy "edit own messages" on public.messages
  for update using ((select auth.uid()) = sender_id)
  with check ((select auth.uid()) = sender_id);

-- Friendships/blocks/conversations mutate only through definer functions.
revoke insert, update, delete on public.friendships from authenticated, anon;
revoke insert, update, delete on public.user_blocks from authenticated, anon;
revoke insert, update, delete on public.conversations from authenticated, anon;
revoke insert, delete on public.conversation_members from authenticated, anon;

-- ── realtime ────────────────────────────────────────────────────────────────
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.friendships;
