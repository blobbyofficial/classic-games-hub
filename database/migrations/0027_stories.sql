-- 0027: stories. Post a short text or achievement to a 24h story, visible to
-- self and friends. Posting is gated to Discord-linked members and staff
-- (a booster proxy until the bot lands).

create table if not exists public.stories (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null default 'text' check (kind in ('text','achievement')),
  content text check (char_length(content) <= 280),
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);
create index if not exists stories_active_idx on public.stories(user_id, expires_at desc);

alter table public.stories enable row level security;
create policy "read stories" on public.stories for select using (
  expires_at > now() and (user_id = (select auth.uid()) or public.are_friends((select auth.uid()), user_id))
);
create policy "delete own stories" on public.stories for delete using (user_id = (select auth.uid()));

create or replace function public.post_story(p_kind text, p_content text, p_data jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_me uuid := auth.uid(); v_linked boolean; v_staff boolean;
begin
  if v_me is null then raise exception 'authentication required'; end if;
  select discord_linked, role in ('admin','moderator') into v_linked, v_staff from public.profiles where id=v_me;
  if not (coalesce(v_linked,false) or coalesce(v_staff,false)) then
    return jsonb_build_object('ok',false,'error','Link your Discord account to post stories');
  end if;
  if p_kind not in ('text','achievement') then return jsonb_build_object('ok',false,'error','Invalid story'); end if;
  if p_kind='text' and coalesce(char_length(trim(p_content)),0) < 1 then return jsonb_build_object('ok',false,'error','Say something first'); end if;
  insert into public.stories (user_id, kind, content, data) values (v_me, p_kind, left(coalesce(p_content,''),280), coalesce(p_data,'{}'::jsonb));
  return jsonb_build_object('ok',true);
end; $$;
revoke execute on function public.post_story(text,text,jsonb) from public, anon;
grant execute on function public.post_story(text,text,jsonb) to authenticated;
