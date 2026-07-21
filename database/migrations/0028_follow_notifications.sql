-- 0028: notify a user when someone follows them (only on a new follow).

create or replace function public.follow_user(p_user uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_me uuid := auth.uid(); v_name text;
begin
  if v_me is null then raise exception 'authentication required'; end if;
  if v_me = p_user then return jsonb_build_object('ok', false, 'error', 'You cannot follow yourself'); end if;
  if public.is_blocked_either_way(v_me, p_user) then return jsonb_build_object('ok', false, 'error', 'Unable to follow'); end if;
  insert into public.follows (follower_id, following_id) values (v_me, p_user) on conflict do nothing;
  if found then
    select username::text into v_name from public.profiles where id = v_me;
    insert into public.notifications (user_id, type, title, body, data)
    values (p_user, 'follow', format('%s started following you', v_name), null,
            jsonb_build_object('username', v_name, 'user_id', v_me));
  end if;
  return jsonb_build_object('ok', true);
end; $$;
revoke execute on function public.follow_user(uuid) from public, anon;
grant execute on function public.follow_user(uuid) to authenticated;
