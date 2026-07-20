-- 0024: message reactions (messenger 2.0). Conversation members can react to
-- messages with an emoji; each (message, user, emoji) is unique.

create table if not exists public.message_reactions (
  message_id bigint not null references public.messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null check (char_length(emoji) <= 8),
  created_at timestamptz not null default now(),
  primary key (message_id, user_id, emoji)
);
create index if not exists message_reactions_message_idx on public.message_reactions(message_id);

alter table public.message_reactions enable row level security;

create policy "read reactions" on public.message_reactions for select using (
  exists (select 1 from public.messages m where m.id = message_id and public.is_conversation_member(m.conversation_id))
);
create policy "manage own reactions" on public.message_reactions for all
  using (
    user_id = (select auth.uid())
    and exists (select 1 from public.messages m where m.id = message_id and public.is_conversation_member(m.conversation_id))
  )
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.messages m where m.id = message_id and public.is_conversation_member(m.conversation_id))
  );
