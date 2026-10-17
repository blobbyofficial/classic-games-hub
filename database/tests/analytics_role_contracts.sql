-- Verify the analytics report cannot be executed by anonymous visitors or without a signed-in staff member.
do $$
begin
  if has_function_privilege('anon', 'public.admin_analytics_daily(integer)', 'execute') then
    raise exception 'anonymous role can execute the admin analytics function';
  end if;
  if not has_function_privilege('authenticated', 'public.admin_analytics_daily(integer)', 'execute') then
    raise exception 'authenticated role missing analytics function grant';
  end if;
end
$$;

set role authenticated;
do $$
begin
  begin
    perform * from public.admin_analytics_daily(14);
    raise exception 'unauthenticated access to analytics unexpectedly succeeded';
  exception when insufficient_privilege then
    null;
  end;
end
$$;
reset role;
