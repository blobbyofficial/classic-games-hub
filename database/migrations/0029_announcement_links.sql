-- 0029: announcement links + real "notify everyone" broadcast.
-- Announcements can carry an optional call-to-action link, and publishing can
-- fan out a notification (with that link) to every player — previously the
-- "notifies everyone" toggle did nothing.

alter table public.announcements
  add column if not exists link_label text check (char_length(link_label) <= 40),
  add column if not exists link_href text check (char_length(link_href) <= 300);

create or replace function public.broadcast_announcement(
  p_title text, p_body text, p_level text,
  p_link_label text, p_link_href text, p_publish boolean, p_notify boolean
) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_me uuid := auth.uid(); v_id uuid;
begin
  if not public.is_staff() then raise exception 'staff only'; end if;
  insert into public.announcements (author_id, title, body, level, published, published_at, link_label, link_href)
    values (v_me, p_title, p_body, p_level, p_publish, case when p_publish then now() end,
            nullif(trim(coalesce(p_link_label,'')),''), nullif(trim(coalesce(p_link_href,'')),''))
    returning id into v_id;
  if p_publish and p_notify then
    insert into public.notifications (user_id, type, title, body, data)
    select p.id, 'announcement', p_title, left(p_body, 160),
      jsonb_build_object('link_label', nullif(trim(coalesce(p_link_label,'')),''),
                         'link_href', nullif(trim(coalesce(p_link_href,'')),''),
                         'announcement_id', v_id)
    from public.profiles p;
  end if;
  return jsonb_build_object('ok', true, 'id', v_id);
end; $$;
revoke execute on function public.broadcast_announcement(text,text,text,text,text,boolean,boolean) from public, anon;
grant execute on function public.broadcast_announcement(text,text,text,text,text,boolean,boolean) to authenticated;
