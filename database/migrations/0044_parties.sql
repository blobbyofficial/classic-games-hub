-- 0044_parties.sql
-- Parties — the lobby layer behind online play.
--
-- A party is a small, transient group (2–20 people) that travels together
-- between games: one row in `parties` per group, one row per member in
-- `party_members`. A player can be in exactly one party at a time, and that is
-- enforced by a UNIQUE constraint on party_members.user_id rather than by
-- application code, so a double-click or two tabs cannot split someone across
-- two parties.
--
-- Security model matches the rest of the schema: both tables are RLS-locked to
-- "you can only see a party you belong to", with no insert/update/delete
-- policies at all — every mutation goes through a SECURITY DEFINER RPC that is
-- revoked from public/anon and granted only to `authenticated`. The RPCs
-- return jsonb `{ok, error}` envelopes with machine-readable error codes
-- (`party_full`, `invalid_code`, …) which actions/parties.ts turns into
-- sentences, so the wording lives in one place in the UI layer.
--
-- Membership is the only thing stored server-side. The live game state a party
-- shares while playing rides on Supabase Realtime broadcast, keyed by party
-- id — nothing about a match in progress is written to Postgres.

-- ───────────────────────── Tables ─────────────────────────

create table if not exists public.parties (
  id uuid primary key default gen_random_uuid(),
  leader_id uuid not null references public.profiles (id) on delete cascade,
  name text check (char_length(name) <= 60),
  invite_code text not null unique,
  game_slug text references public.games (slug) on delete set null,
  max_size int not null default 8 check (max_size between 2 and 20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.parties enable row level security;

create table if not exists public.party_members (
  party_id uuid not null references public.parties (id) on delete cascade,
  -- One party per person. Every RPC below relies on this invariant.
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (party_id, user_id)
);
alter table public.party_members enable row level security;

create index if not exists party_members_party_idx on public.party_members (party_id);

-- ───────────────────────── RLS ─────────────────────────

drop policy if exists parties_select_member on public.parties;
create policy parties_select_member on public.parties
  for select using (
    exists (select 1 from public.party_members m where m.party_id = parties.id and m.user_id = auth.uid())
  );

drop policy if exists party_members_select_member on public.party_members;
create policy party_members_select_member on public.party_members
  for select using (
    exists (select 1 from public.party_members m where m.party_id = party_members.party_id and m.user_id = auth.uid())
  );

-- ───────────────────────── Reads ─────────────────────────

create or replace function public.my_party_id()
returns uuid language sql stable security definer set search_path = public as $$
  select party_id from public.party_members where user_id = auth.uid();
$$;
revoke execute on function public.my_party_id() from public, anon;
grant execute on function public.my_party_id() to authenticated;

-- The whole lobby in one round trip: the party, its roster, and who is online.
create or replace function public.party_state()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_me uuid := auth.uid();
  v_party public.parties%rowtype;
begin
  if v_me is null then
    return jsonb_build_object('in_party', false);
  end if;
  select p.* into v_party
  from public.parties p
  join public.party_members m on m.party_id = p.id
  where m.user_id = v_me;

  if v_party.id is null then
    return jsonb_build_object('in_party', false);
  end if;

  return jsonb_build_object(
    'in_party', true,
    'id', v_party.id,
    'name', v_party.name,
    'invite_code', v_party.invite_code,
    'game_slug', v_party.game_slug,
    'max_size', v_party.max_size,
    'is_leader', v_party.leader_id = v_me,
    'leader_id', v_party.leader_id,
    'created_at', v_party.created_at,
    'members', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'user_id', pr.id,
        'username', pr.username::text,
        'display_name', pr.display_name,
        'avatar_url', pr.avatar_url,
        'level', pr.level,
        'is_leader', pr.id = v_party.leader_id,
        'online', pr.last_seen_at > now() - interval '5 minutes',
        'joined_at', pm.joined_at
      ) order by (pr.id = v_party.leader_id) desc, pm.joined_at), '[]'::jsonb)
      from public.party_members pm
      join public.profiles pr on pr.id = pm.user_id
      where pm.party_id = v_party.id
    )
  );
end;
$$;
revoke execute on function public.party_state() from public, anon;
grant execute on function public.party_state() to authenticated;

-- ───────────────────────── Mutations ─────────────────────────

create or replace function public.create_party(p_name text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := auth.uid();
  v_id uuid;
  v_code text;
begin
  if v_me is null then raise exception 'authentication required'; end if;
  if exists (select 1 from public.profiles where id = v_me and is_banned) then
    return jsonb_build_object('ok', false, 'error', 'suspended');
  end if;
  if exists (select 1 from public.party_members where user_id = v_me) then
    return jsonb_build_object('ok', false, 'error', 'already_in_party');
  end if;

  v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
  insert into public.parties (leader_id, name, invite_code)
  values (v_me, nullif(left(trim(coalesce(p_name, '')), 60), ''), v_code)
  returning id into v_id;

  insert into public.party_members (party_id, user_id) values (v_id, v_me);

  return jsonb_build_object('ok', true, 'party_id', v_id, 'invite_code', v_code);
end;
$$;
revoke execute on function public.create_party(text) from public, anon;
grant execute on function public.create_party(text) to authenticated;

create or replace function public.join_party(p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := auth.uid();
  v_party public.parties%rowtype;
  v_count int;
begin
  if v_me is null then raise exception 'authentication required'; end if;
  if exists (select 1 from public.profiles where id = v_me and is_banned) then
    return jsonb_build_object('ok', false, 'error', 'suspended');
  end if;
  if exists (select 1 from public.party_members where user_id = v_me) then
    return jsonb_build_object('ok', false, 'error', 'already_in_party');
  end if;

  -- Lock the party row so two people racing for the last slot cannot both win.
  select * into v_party from public.parties
  where invite_code = upper(trim(coalesce(p_code, '')))
  for update;

  if v_party.id is null then
    return jsonb_build_object('ok', false, 'error', 'invalid_code');
  end if;

  if exists (
    select 1 from public.user_blocks b
    where (b.blocker_id = v_party.leader_id and b.blocked_id = v_me)
       or (b.blocker_id = v_me and b.blocked_id = v_party.leader_id)
  ) then
    return jsonb_build_object('ok', false, 'error', 'blocked');
  end if;

  select count(*) into v_count from public.party_members where party_id = v_party.id;
  if v_count >= v_party.max_size then
    return jsonb_build_object('ok', false, 'error', 'party_full');
  end if;

  insert into public.party_members (party_id, user_id) values (v_party.id, v_me);
  update public.parties set updated_at = now() where id = v_party.id;

  insert into public.notifications (user_id, type, title, body, data)
  values (v_party.leader_id, 'party', 'Someone joined your party',
    (select coalesce(display_name, username::text) from public.profiles where id = v_me) || ' joined your party.',
    jsonb_build_object('party_id', v_party.id));

  return jsonb_build_object('ok', true, 'party_id', v_party.id);
end;
$$;
revoke execute on function public.join_party(text) from public, anon;
grant execute on function public.join_party(text) to authenticated;

create or replace function public.leave_party()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := auth.uid();
  v_party_id uuid;
  v_leader uuid;
  v_next uuid;
  v_remaining int;
begin
  if v_me is null then raise exception 'authentication required'; end if;

  select m.party_id, p.leader_id into v_party_id, v_leader
  from public.party_members m
  join public.parties p on p.id = m.party_id
  where m.user_id = v_me;

  if v_party_id is null then
    return jsonb_build_object('ok', false, 'error', 'not_in_party');
  end if;

  delete from public.party_members where party_id = v_party_id and user_id = v_me;
  select count(*) into v_remaining from public.party_members where party_id = v_party_id;

  -- Last one out disbands the party.
  if v_remaining = 0 then
    delete from public.parties where id = v_party_id;
    return jsonb_build_object('ok', true, 'disbanded', true);
  end if;

  -- The leader left but others remain: hand it to the longest-serving member.
  if v_leader = v_me then
    select user_id into v_next from public.party_members
    where party_id = v_party_id order by joined_at limit 1;
    update public.parties set leader_id = v_next, updated_at = now() where id = v_party_id;

    insert into public.notifications (user_id, type, title, body, data)
    values (v_next, 'party', 'You lead the party now',
      'The previous leader left, so the party is yours.',
      jsonb_build_object('party_id', v_party_id));
  else
    update public.parties set updated_at = now() where id = v_party_id;
  end if;

  return jsonb_build_object('ok', true, 'disbanded', false);
end;
$$;
revoke execute on function public.leave_party() from public, anon;
grant execute on function public.leave_party() to authenticated;

create or replace function public.kick_from_party(p_user uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := auth.uid();
  v_party_id uuid;
begin
  if v_me is null then raise exception 'authentication required'; end if;
  select id into v_party_id from public.parties
  where leader_id = v_me
    and id = (select party_id from public.party_members where user_id = v_me);

  if v_party_id is null then
    return jsonb_build_object('ok', false, 'error', 'not_leader');
  end if;
  if p_user = v_me then
    return jsonb_build_object('ok', false, 'error', 'cannot_kick_self');
  end if;

  delete from public.party_members where party_id = v_party_id and user_id = p_user;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_a_member');
  end if;
  update public.parties set updated_at = now() where id = v_party_id;

  insert into public.notifications (user_id, type, title, body, data)
  values (p_user, 'party', 'Removed from party',
    'You were removed from the party.', jsonb_build_object('party_id', v_party_id));

  return jsonb_build_object('ok', true);
end;
$$;
revoke execute on function public.kick_from_party(uuid) from public, anon;
grant execute on function public.kick_from_party(uuid) to authenticated;

-- Only the leader picks the game; everyone else follows them into it.
create or replace function public.set_party_game(p_slug text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := auth.uid();
  v_party_id uuid;
begin
  if v_me is null then raise exception 'authentication required'; end if;
  select id into v_party_id from public.parties
  where leader_id = v_me
    and id = (select party_id from public.party_members where user_id = v_me);
  if v_party_id is null then
    return jsonb_build_object('ok', false, 'error', 'not_leader');
  end if;

  if p_slug is not null and p_slug <> ''
     and not exists (select 1 from public.games where slug = p_slug and status = 'published') then
    return jsonb_build_object('ok', false, 'error', 'unknown_game');
  end if;

  update public.parties
  set game_slug = nullif(p_slug, ''), updated_at = now()
  where id = v_party_id;

  return jsonb_build_object('ok', true);
end;
$$;
revoke execute on function public.set_party_game(text) from public, anon;
grant execute on function public.set_party_game(text) to authenticated;

-- Any member can invite, not just the leader — the invite is a notification
-- carrying the code, so the recipient still chooses to join.
create or replace function public.invite_to_party(p_user uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := auth.uid();
  v_party public.parties%rowtype;
  v_count int;
begin
  if v_me is null then raise exception 'authentication required'; end if;
  select p.* into v_party from public.parties p
  join public.party_members m on m.party_id = p.id and m.user_id = v_me
  where p.id = m.party_id;

  if v_party.id is null then
    return jsonb_build_object('ok', false, 'error', 'not_in_party');
  end if;
  if exists (select 1 from public.party_members where user_id = p_user) then
    return jsonb_build_object('ok', false, 'error', 'already_in_a_party');
  end if;
  if exists (
    select 1 from public.user_blocks b
    where (b.blocker_id = p_user and b.blocked_id = v_me)
       or (b.blocker_id = v_me and b.blocked_id = p_user)
  ) then
    return jsonb_build_object('ok', false, 'error', 'blocked');
  end if;

  select count(*) into v_count from public.party_members where party_id = v_party.id;
  if v_count >= v_party.max_size then
    return jsonb_build_object('ok', false, 'error', 'party_full');
  end if;

  insert into public.notifications (user_id, type, title, body, data)
  values (p_user, 'party', 'Party invite',
    (select coalesce(display_name, username::text) from public.profiles where id = v_me)
      || ' invited you to their party.',
    jsonb_build_object('party_id', v_party.id, 'invite_code', v_party.invite_code));

  return jsonb_build_object('ok', true);
end;
$$;
revoke execute on function public.invite_to_party(uuid) from public, anon;
grant execute on function public.invite_to_party(uuid) to authenticated;

-- ───────────────────────── Housekeeping ─────────────────────────

-- Parties are transient; anything untouched for a day is dead weight.
create or replace function public.purge_stale_parties()
returns void language sql security definer set search_path = public as $$
  delete from public.parties where updated_at < now() - interval '24 hours';
$$;
revoke execute on function public.purge_stale_parties() from public, anon;
grant execute on function public.purge_stale_parties() to authenticated, service_role;
