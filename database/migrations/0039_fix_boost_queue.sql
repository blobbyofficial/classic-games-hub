-- 0039_fix_boost_queue.sql
-- Bug fix: a queued boost could be consumed for nothing.
--
-- settle_user_boosts anchored each newly-activated window to
-- `greatest(expires_at, now() - 24h) + 24h`. When the previous window had
-- expired more than 24 hours earlier that expression evaluates to exactly
-- now(), so the queued boost was decremented, immediately judged expired, and
-- the player lost a boost they had paid credits for.
--
-- The window now anchors to now(), so a queued boost always activates with a
-- full, live 24-hour window no matter how long the player was away. Shipped
-- inline in 0036 too; this migration is the idempotent fix for databases where
-- 0036 was already applied.

create or replace function public.settle_user_boosts(p_user uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  r public.user_boosts%rowtype;
begin
  for r in select * from public.user_boosts where user_id = p_user for update loop
    while r.queued > 0 and (r.expires_at is null or r.expires_at <= now()) loop
      r.expires_at := greatest(coalesce(r.expires_at, now()), now()) + interval '24 hours';
      r.stacks := 1;
      r.queued := r.queued - 1;
    end loop;
    if r.expires_at is null or r.expires_at <= now() then
      r.stacks := 0;
    end if;
    update public.user_boosts
    set stacks = r.stacks, expires_at = r.expires_at, queued = r.queued
    where user_id = r.user_id and kind = r.kind;
  end loop;
end;
$$;
revoke execute on function public.settle_user_boosts(uuid) from public, anon, authenticated;
