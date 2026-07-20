-- 0012_player_search.sql
-- Profile customization 2.0 — easier friend-adding.
--
-- A discoverable player search: match by username prefix or display-name
-- substring, returning each match's friendship relation so the UI can show the
-- right action inline. SECURITY DEFINER + 0006 hardening (authenticated only).

create or replace function public.search_players(p_query text)
returns table (
  id uuid,
  username text,
  display_name text,
  avatar_url text,
  level int,
  equipped jsonb,
  relation text
)
language sql stable security definer
set search_path = public
as $$
  select
    p.id,
    p.username::text,
    p.display_name,
    p.avatar_url,
    p.level,
    p.equipped,
    public.friendship_status(p.id) as relation
  from public.profiles p
  where char_length(btrim(p_query)) >= 2
    and p.id <> (select auth.uid())
    and p.is_banned = false
    and p.needs_username = false
    and (
      p.username ilike btrim(p_query) || '%'
      or p.display_name ilike '%' || btrim(p_query) || '%'
    )
  order by (p.username ilike btrim(p_query) || '%') desc, p.level desc
  limit 12;
$$;

revoke execute on function public.search_players(text) from public, anon;
grant execute on function public.search_players(text) to authenticated;
