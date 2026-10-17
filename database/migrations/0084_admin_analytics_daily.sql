-- v1.7 analytics: database-side daily totals, never user-level rows.
-- SECURITY: staff-only, no identities, no client writes or unrestricted SQL.
create or replace function public.admin_analytics_daily(p_days integer default 30)
returns table(day date, plays bigint, signups bigint)
language plpgsql stable security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_staff() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if p_days is null or p_days < 1 or p_days > 90 then
    raise exception 'days out of range' using errcode = '22023';
  end if;
  return query
  with days as (
    select generate_series(
      (now() at time zone 'utc')::date - (p_days - 1),
      (now() at time zone 'utc')::date,
      interval '1 day'
    )::date as date_utc
  ), plays_per_day as (
    select (created_at at time zone 'utc')::date as date_utc, count(*)::bigint as total
    from public.play_sessions
    where created_at >= ((now() at time zone 'utc')::date - (p_days - 1))::timestamp at time zone 'utc'
    group by 1
  ), signups_per_day as (
    select (created_at at time zone 'utc')::date as date_utc, count(*)::bigint as total
    from public.profiles
    where created_at >= ((now() at time zone 'utc')::date - (p_days - 1))::timestamp at time zone 'utc'
    group by 1
  )
  select d.date_utc, coalesce(p.total, 0)::bigint, coalesce(s.total, 0)::bigint
  from days d
  left join plays_per_day p on p.date_utc = d.date_utc
  left join signups_per_day s on s.date_utc = d.date_utc
  order by d.date_utc;
end
$$;
revoke all on function public.admin_analytics_daily(integer) from public, anon;
grant execute on function public.admin_analytics_daily(integer) to authenticated;
