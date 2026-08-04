-- 0066_message_report_context.sql
--
-- Lets staff read the conversation around a reported message.
--
-- `reports` has accepted `target_type = 'message'` since 0004, but nothing ever
-- reported one, and the admin page could only have shown the row id if it had -
-- which decides nothing. "wanker" is a joke between friends or abuse depending
-- entirely on what surrounds it, so a report without context is a report an
-- admin cannot act on.
--
-- Scope is deliberately narrow. This returns a window around ONE message that
-- someone reported, not a conversation browser: staff get the messages needed
-- to judge the report and nothing else, and there is no way to page through the
-- rest of an inbox with it. Messages RLS restricts reads to participants, which
-- is exactly right for members and exactly wrong for a moderator acting on a
-- report - hence SECURITY DEFINER, with an is_admin()/moderator check standing
-- in for the policy it steps around.

create or replace function public.admin_message_report_context(
  p_report_id bigint,
  p_before int default 5,
  p_after int default 5
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_report public.reports;
  v_message public.messages;
  v_before int := least(greatest(coalesce(p_before, 5), 0), 25);
  v_after  int := least(greatest(coalesce(p_after, 5), 0), 25);
begin
  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'moderator')
  ) then
    raise exception 'staff only';
  end if;

  select * into v_report from public.reports where id = p_report_id;
  if v_report.id is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  if v_report.target_type <> 'message' then
    return jsonb_build_object('ok', false, 'error', 'not_a_message_report');
  end if;

  -- target_id is text on the reports table because it holds ids of several
  -- shapes. A malformed one is a bad report, not a crash.
  begin
    select * into v_message from public.messages where id = v_report.target_id::bigint;
  exception when others then
    return jsonb_build_object('ok', false, 'error', 'bad_target');
  end;

  if v_message.id is null then
    -- Deleted since it was reported. Worth saying so plainly: it is the answer
    -- to "why is this queue item empty", and often means it was dealt with.
    return jsonb_build_object('ok', true, 'message', null, 'context', '[]'::jsonb);
  end if;

  return jsonb_build_object(
    'ok', true,
    'message', jsonb_build_object(
      'id', v_message.id,
      'content', v_message.content,
      'created_at', v_message.created_at,
      'deleted_at', v_message.deleted_at,
      'sender', (
        select jsonb_build_object('id', p.id, 'username', p.username, 'display_name', p.display_name)
        from public.profiles p where p.id = v_message.sender_id
      )
    ),
    'context', coalesce((
      select jsonb_agg(row_to_json(c) order by c.created_at)
      from (
        (select m.id, m.content, m.created_at, m.sender_id,
                p.username, p.display_name
         from public.messages m
         join public.profiles p on p.id = m.sender_id
         where m.conversation_id = v_message.conversation_id
           and m.created_at < v_message.created_at
         order by m.created_at desc
         limit v_before)
        union all
        (select m.id, m.content, m.created_at, m.sender_id,
                p.username, p.display_name
         from public.messages m
         join public.profiles p on p.id = m.sender_id
         where m.conversation_id = v_message.conversation_id
           and m.created_at > v_message.created_at
         order by m.created_at asc
         limit v_after)
      ) c
    ), '[]'::jsonb)
  );
end;
$$;

revoke execute on function public.admin_message_report_context(bigint, int, int) from public, anon;
grant execute on function public.admin_message_report_context(bigint, int, int) to authenticated;
