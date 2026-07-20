-- 0022: Social graph — follows, private notes/nicknames, and a profile-social RPC
-- that respects each user's friends-list visibility setting.

create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint no_self_follow check (follower_id <> following_id)
);
create index if not exists follows_following_idx on public.follows(following_id);
alter table public.follows enable row level security;
create policy "read follows" on public.follows for select using (true);
create policy "manage own follows" on public.follows
  for all using ((select auth.uid()) = follower_id) with check ((select auth.uid()) = follower_id);

create table if not exists public.user_notes (
  author_id uuid not null references public.profiles(id) on delete cascade,
  target_id uuid not null references public.profiles(id) on delete cascade,
  nickname text check (char_length(nickname) <= 40),
  note text check (char_length(note) <= 500),
  updated_at timestamptz not null default now(),
  primary key (author_id, target_id)
);
alter table public.user_notes enable row level security;
create policy "own notes" on public.user_notes
  for all using ((select auth.uid()) = author_id) with check ((select auth.uid()) = author_id);

create or replace function public.follow_user(p_user uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_me uuid := auth.uid();
begin
  if v_me is null then raise exception 'authentication required'; end if;
  if v_me = p_user then return jsonb_build_object('ok', false, 'error', 'You cannot follow yourself'); end if;
  if public.is_blocked_either_way(v_me, p_user) then return jsonb_build_object('ok', false, 'error', 'Unable to follow'); end if;
  insert into public.follows (follower_id, following_id) values (v_me, p_user) on conflict do nothing;
  return jsonb_build_object('ok', true);
end; $$;
revoke execute on function public.follow_user(uuid) from public, anon;
grant execute on function public.follow_user(uuid) to authenticated;

create or replace function public.unfollow_user(p_user uuid)
returns void language sql security definer set search_path = public as $$
  delete from public.follows where follower_id = auth.uid() and following_id = p_user;
$$;
revoke execute on function public.unfollow_user(uuid) from public, anon;
grant execute on function public.unfollow_user(uuid) to authenticated;

-- Follower/following counts, mutual-friend count and whether the target's
-- friends list is visible to the caller, all in one round-trip.
create or replace function public.profile_social(p_target uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_me uuid := auth.uid();
  v_followers int; v_following int; v_is_following boolean;
  v_friends int; v_vis text; v_visible boolean; v_mutual int;
begin
  select count(*) into v_followers from public.follows where following_id = p_target;
  select count(*) into v_following from public.follows where follower_id = p_target;
  select exists(select 1 from public.follows where follower_id = v_me and following_id = p_target) into v_is_following;
  select coalesce(friends_visibility, 'public') into v_vis from public.user_settings where user_id = p_target;
  select count(*) into v_friends from public.friendships
    where status = 'accepted' and (requester_id = p_target or addressee_id = p_target);

  v_visible := case
    when v_me = p_target then true
    when v_vis = 'public' then true
    when v_vis = 'followers' then v_is_following or public.are_friends(v_me, p_target)
    when v_vis = 'friends' then public.are_friends(v_me, p_target)
    else false end;

  select count(*) into v_mutual from (
    select case when requester_id = p_target then addressee_id else requester_id end as fid
    from public.friendships where status='accepted' and (requester_id=p_target or addressee_id=p_target)
    intersect
    select case when requester_id = v_me then addressee_id else requester_id end
    from public.friendships where status='accepted' and (requester_id=v_me or addressee_id=v_me)
  ) m;

  return jsonb_build_object(
    'followers', v_followers, 'following', v_following, 'is_following', coalesce(v_is_following,false),
    'friends_count', v_friends, 'friends_visible', v_visible, 'mutual', coalesce(v_mutual,0)
  );
end; $$;
revoke execute on function public.profile_social(uuid) from public;
grant execute on function public.profile_social(uuid) to authenticated, anon;
