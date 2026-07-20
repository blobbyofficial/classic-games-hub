-- 0009: admin control over a member's level & XP
--
-- Column grants stop clients writing profiles.level / profiles.xp directly, so
-- edits go through this admin-only SECURITY DEFINER function.

create or replace function public.admin_set_level_xp(p_user uuid, p_level int, p_xp bigint)
  returns jsonb
  language plpgsql
  security definer
  set search_path to 'public'
as $function$
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;
  if p_level < 1 or p_level > 999 then
    return jsonb_build_object('ok', false, 'error', 'Level must be between 1 and 999');
  end if;
  if p_xp < 0 then
    return jsonb_build_object('ok', false, 'error', 'XP cannot be negative');
  end if;

  update public.profiles set level = p_level, xp = p_xp where id = p_user;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'User not found');
  end if;

  perform public.log_audit('set_level_xp', 'user', p_user::text,
                           jsonb_build_object('level', p_level, 'xp', p_xp));
  return jsonb_build_object('ok', true);
end;
$function$;

revoke execute on function public.admin_set_level_xp(uuid, int, bigint) from public, anon;
grant execute on function public.admin_set_level_xp(uuid, int, bigint) to authenticated;
