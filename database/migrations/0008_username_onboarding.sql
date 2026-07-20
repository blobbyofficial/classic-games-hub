-- 0008: free username onboarding + admin username management
--
-- New OAuth signups get to choose a username for free (a one-time pick,
-- tracked by profiles.needs_username). The same flag powers a forced,
-- free username reset when an admin reassigns a username away from someone.

-- 1. Flag: this profile still owes a free username choice.
alter table public.profiles
  add column if not exists needs_username boolean not null default false;

-- 2. New users get a placeholder username AND are asked to pick one for free.
create or replace function public.handle_new_user()
  returns trigger
  language plpgsql
  security definer
  set search_path to 'public'
as $function$
declare
  v_base text;
  v_username text;
  v_suffix int := 0;
begin
  v_base := coalesce(
    new.raw_user_meta_data ->> 'user_name',
    new.raw_user_meta_data ->> 'preferred_username',
    new.raw_user_meta_data ->> 'name',
    split_part(new.email, '@', 1),
    'player'
  );
  v_base := regexp_replace(lower(v_base), '[^a-z0-9_]', '', 'g');
  if char_length(v_base) < 3 then
    v_base := 'player' || floor(random() * 10000)::text;
  end if;
  v_base := left(v_base, 20);

  v_username := v_base;
  while exists (select 1 from public.profiles where username = v_username) loop
    v_suffix := v_suffix + 1;
    v_username := v_base || v_suffix::text;
  end loop;

  insert into public.profiles (id, username, display_name, avatar_url, needs_username)
  values (
    new.id,
    v_username,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', v_username),
    new.raw_user_meta_data ->> 'avatar_url',
    true
  );

  insert into public.user_settings (user_id) values (new.id);

  perform public.award_credits(new.id, 100, 'welcome_bonus');

  insert into public.notifications (user_id, type, title, body)
  values (new.id, 'welcome', 'Welcome to Classic Games Hub!',
          'You received 100 credits to get started. Have fun!');

  return new;
end;
$function$;

-- 3. Free, one-time username pick. Only works while a pick is owed
--    (onboarding, or after a forced reset). Paid changes use change_username.
create or replace function public.set_username(p_new text)
  returns jsonb
  language plpgsql
  security definer
  set search_path to 'public'
as $function$
declare
  v_me uuid := auth.uid();
  v_needs boolean;
begin
  if v_me is null then
    raise exception 'authentication required';
  end if;

  select needs_username into v_needs from public.profiles where id = v_me;
  if not coalesce(v_needs, false) then
    return jsonb_build_object('ok', false, 'error', 'You already have a username set');
  end if;

  if p_new !~ '^[a-zA-Z0-9_]{3,24}$' then
    return jsonb_build_object('ok', false, 'error', 'Usernames are 3-24 letters, numbers or underscores');
  end if;
  if exists (select 1 from public.profiles where username = p_new and id <> v_me) then
    return jsonb_build_object('ok', false, 'error', 'That username is taken');
  end if;

  update public.profiles set username = p_new, needs_username = false where id = v_me;
  return jsonb_build_object('ok', true, 'username', p_new);
end;
$function$;

-- 4. Admin: reassign a username. If it is currently held by someone else,
--    that person is bumped to a placeholder and owes a free reset.
create or replace function public.admin_set_username(p_user uuid, p_new text)
  returns jsonb
  language plpgsql
  security definer
  set search_path to 'public'
as $function$
declare
  v_holder uuid;
  v_temp text;
  v_suffix int := 0;
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;
  if p_new !~ '^[a-zA-Z0-9_]{3,24}$' then
    return jsonb_build_object('ok', false, 'error', 'Usernames are 3-24 letters, numbers or underscores');
  end if;

  select id into v_holder from public.profiles where username = p_new;
  if v_holder = p_user then
    return jsonb_build_object('ok', true, 'username', p_new);
  end if;

  if v_holder is not null then
    -- Free up the name: move the current holder to a placeholder and force a reset.
    v_temp := 'player' || floor(random() * 1000000)::text;
    while exists (select 1 from public.profiles where username = v_temp) loop
      v_suffix := v_suffix + 1;
      v_temp := 'player' || floor(random() * 1000000)::text || v_suffix::text;
    end loop;

    update public.profiles set username = v_temp, needs_username = true where id = v_holder;
    insert into public.notifications (user_id, type, title, body)
    values (v_holder, 'username', 'Choose a new username',
            'An admin reassigned your old username. Pick a new one for free next time you visit.');
    perform public.log_audit('username_displaced', 'user', v_holder::text,
                             jsonb_build_object('freed', p_new));
  end if;

  update public.profiles set username = p_new, needs_username = false where id = p_user;
  perform public.log_audit('set_username', 'user', p_user::text,
                           jsonb_build_object('username', p_new, 'displaced', v_holder));
  return jsonb_build_object('ok', true, 'username', p_new);
end;
$function$;

-- 5. Match 0006's hardening: only authenticated clients may call these RPCs.
revoke execute on function public.set_username(text) from public, anon;
revoke execute on function public.admin_set_username(uuid, text) from public, anon;
grant execute on function public.set_username(text) to authenticated;
grant execute on function public.admin_set_username(uuid, text) to authenticated;
