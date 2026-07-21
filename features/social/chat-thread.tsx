"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ChevronLeft, Send, SmilePlus, Users } from "lucide-react";
import { toast } from "sonner";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { sendMessage, markConversationRead, toggleReaction } from "@/actions/social";
import { useSessionStore } from "@/lib/stores/session-store";
import { UserAvatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PresenceDot } from "@/components/profile/presence-dot";
import { cn, isOnline } from "@/lib/utils";
import type { ConversationDetail } from "@/services/social";

interface Reaction {
  emoji: string;
  user_id: string;
}

interface Msg {
  id: number | string;
  sender_id: string;
  content: string;
  created_at: string;
  pending?: boolean;
  reactions?: Reaction[];
}

const QUICK_REACTIONS = ["👍", "❤️", "😂", "🔥", "😮", "😢", "🎉", "👀"];
const EMOJI_PALETTE = [
  "😀","😂","😊","😍","😎","🤔","😅","😭","😡","🥳",
  "👍","👎","👏","🙏","💪","🔥","✨","🎉","❤️","💜",
  "😮","😱","🤯","🥺","😴","🤝","👀","🎮","🏆","⭐",
];

const GROUP_GAP_MS = 5 * 60 * 1000; // start a fresh bubble group after a 5-min lull

/** Group a message's reactions by emoji with counts and whether I reacted. */
function groupReactions(reactions: Reaction[] | undefined, me: string | null) {
  if (!reactions?.length) return [] as { emoji: string; count: number; mine: boolean }[];
  const map = new Map<string, { count: number; mine: boolean }>();
  for (const r of reactions) {
    const e = map.get(r.emoji) ?? { count: 0, mine: false };
    e.count++;
    if (r.user_id === me) e.mine = true;
    map.set(r.emoji, e);
  }
  return [...map.entries()].map(([emoji, v]) => ({ emoji, ...v }));
}

/** Pure helper: add or remove a user's reaction on a message in the list. */
function applyReactionTo(list: Msg[], id: Msg["id"], emoji: string, userId: string, add: boolean): Msg[] {
  return list.map((m) => {
    if (m.id !== id) return m;
    const reactions = m.reactions ?? [];
    if (add) {
      if (reactions.some((r) => r.emoji === emoji && r.user_id === userId)) return m;
      return { ...m, reactions: [...reactions, { emoji, user_id: userId }] };
    }
    return { ...m, reactions: reactions.filter((r) => !(r.emoji === emoji && r.user_id === userId)) };
  });
}

const timeFmt = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
const dateFmt = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "short", day: "numeric" });

function sameDay(a: string, b: string) {
  const x = new Date(a);
  const y = new Date(b);
  return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate();
}

/** "Today" / "Yesterday" / a full date for the day-separator chips. */
function dayLabel(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOfDay(now) - startOfDay(d)) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return dateFmt.format(d);
}

export function ChatThread({ conversation }: { conversation: ConversationDetail }) {
  const me = useSessionStore((s) => s.userId);
  const [messages, setMessages] = useState<Msg[]>(conversation.messages);
  const [otherReadAt, setOtherReadAt] = useState<string | null>(conversation.otherLastReadAt);
  const [text, setText] = useState("");
  const [otherTyping, setOtherTyping] = useState(false);
  const [, startSend] = useTransition();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const other = conversation.other;
  const isGroup = conversation.isGroup;
  const memberMap = new Map(conversation.members.map((mem) => [mem.id, mem]));

  const scrollToBottom = () => {
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }));
  };

  useEffect(() => {
    void markConversationRead(conversation.id);
    scrollToBottom();
  }, [conversation.id]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`conversation:${conversation.id}`, { config: { broadcast: { self: false } } })
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversation.id}` },
        (payload) => {
          const m = payload.new as Msg;
          setMessages((prev) => {
            // replace optimistic if it's ours, else append
            if (m.sender_id === me) {
              const idx = prev.findIndex((x) => x.pending && x.content === m.content);
              if (idx >= 0) {
                const next = [...prev];
                next[idx] = m;
                return next;
              }
            }
            if (prev.some((x) => x.id === m.id)) return prev;
            return [...prev, m];
          });
          if (m.sender_id !== me) void markConversationRead(conversation.id);
          scrollToBottom();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "conversation_members",
          filter: `conversation_id=eq.${conversation.id}`,
        },
        (payload) => {
          const row = payload.new as { user_id: string; last_read_at: string | null };
          if (row.user_id === other?.id && row.last_read_at) setOtherReadAt(row.last_read_at);
        },
      )
      .on("broadcast", { event: "typing" }, (payload) => {
        if (payload.payload.userId !== me) {
          setOtherTyping(true);
          setTimeout(() => setOtherTyping(false), 2500);
        }
      })
      .on("broadcast", { event: "reaction" }, (payload) => {
        const p = payload.payload as { id: number; emoji: string; userId: string; add: boolean };
        if (p.userId === me) return;
        setMessages((prev) => applyReactionTo(prev, p.id, p.emoji, p.userId, p.add));
      })
      .subscribe();
    channelRef.current = channel;

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversation.id, me, other?.id]);

  const onType = (v: string) => {
    setText(v);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    channelRef.current?.send({ type: "broadcast", event: "typing", payload: { userId: me } });
  };

  const react = (id: Msg["id"], emoji: string) => {
    if (typeof id !== "number" || !me) return; // can't react to a still-sending message
    const msg = messages.find((m) => m.id === id);
    const mine = msg?.reactions?.some((r) => r.emoji === emoji && r.user_id === me) ?? false;
    const add = !mine;
    setMessages((prev) => applyReactionTo(prev, id, emoji, me, add));
    channelRef.current?.send({ type: "broadcast", event: "reaction", payload: { id, emoji, userId: me, add } });
    startSend(async () => {
      const res = await toggleReaction(id, emoji, add);
      if (!res.ok) {
        setMessages((prev) => applyReactionTo(prev, id, emoji, me, !add));
        toast.error(res.error ?? "Could not react");
      }
    });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const content = text.trim();
    if (!content) return;
    const optimistic: Msg = {
      id: `tmp-${Date.now()}`,
      sender_id: me!,
      content,
      created_at: new Date().toISOString(),
      pending: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    setText("");
    scrollToBottom();
    startSend(async () => {
      const res = await sendMessage(conversation.id, content);
      if (!res.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
        toast.error(res.error ?? "Message failed to send");
      }
    });
  };

  // The most recent message I sent — the only one that carries a read receipt.
  let lastMineId: Msg["id"] | undefined;
  for (const m of messages) if (m.sender_id === me) lastMineId = m.id;

  return (
    <div className="flex h-[calc(100dvh-9rem)] flex-col overflow-hidden rounded-2xl border border-border bg-card lg:h-[calc(100dvh-8rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <Button variant="ghost" size="icon-sm" asChild className="lg:hidden">
          <Link href="/messages" aria-label="Back">
            <ChevronLeft />
          </Link>
        </Button>
        {isGroup ? (
          <>
            <span className="grid size-9 place-items-center rounded-full bg-primary/10 text-primary">
              <Users className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{conversation.name ?? "Group"}</p>
              <p className="text-xs text-muted-foreground">
                {otherTyping ? "someone is typing…" : `${conversation.members.length + 1} members`}
              </p>
            </div>
          </>
        ) : (
          other && (
            <>
              <Link href={`/u/${other.username}`} className="relative">
                <UserAvatar src={other.avatar_url} name={other.display_name ?? other.username} className="size-9" />
                <span className="absolute -bottom-0.5 -right-0.5">
                  <PresenceDot lastSeen={other.last_seen_at} className="size-3" />
                </span>
              </Link>
              <div className="min-w-0">
                <Link href={`/u/${other.username}`} className="truncate text-sm font-semibold hover:underline">
                  {other.display_name ?? other.username}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {otherTyping ? "typing…" : isOnline(other.last_seen_at) ? "Online" : "Offline"}
                </p>
              </div>
            </>
          )
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {isGroup
              ? `This is the start of ${conversation.name ?? "the group"}. Say hello!`
              : `Say hi to ${other?.display_name ?? other?.username}!`}
          </p>
        )}
        {messages.map((m, i) => {
          const mine = m.sender_id === me;
          const prev = messages[i - 1];
          const next = messages[i + 1];
          const showDate = !prev || !sameDay(prev.created_at, m.created_at);
          // End a bubble group when the next message is from someone else, after
          // a lull, or when the day changes — the timestamp shows on the last one.
          const endGroup =
            !next ||
            next.sender_id !== m.sender_id ||
            !sameDay(next.created_at, m.created_at) ||
            new Date(next.created_at).getTime() - new Date(m.created_at).getTime() > GROUP_GAP_MS;
          const startGroup =
            showDate ||
            !prev ||
            prev.sender_id !== m.sender_id ||
            new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() > GROUP_GAP_MS;
          const isMyLast = mine && m.id === lastMineId;
          const seen = otherReadAt != null && new Date(otherReadAt).getTime() >= new Date(m.created_at).getTime();

          return (
            <div key={m.id}>
              {showDate && (
                <div className="my-3 flex items-center justify-center">
                  <span className="rounded-full bg-muted px-3 py-0.5 text-[0.7rem] font-medium text-muted-foreground">
                    {dayLabel(m.created_at)}
                  </span>
                </div>
              )}
              <div
                className={cn(
                  "group/msg flex flex-col",
                  mine ? "items-end" : "items-start",
                  startGroup ? "mt-2" : "mt-0.5",
                )}
              >
                {isGroup && !mine && startGroup && (
                  <span className="mb-0.5 px-1 text-[0.7rem] font-medium text-muted-foreground">
                    {memberMap.get(m.sender_id)?.display_name ?? memberMap.get(m.sender_id)?.username ?? "Unknown"}
                  </span>
                )}
                <div className={cn("flex items-center gap-1", mine ? "flex-row-reverse" : "flex-row")}>
                  <div
                    className={cn(
                      "max-w-[75%] px-3.5 py-2 text-sm",
                      mine
                        ? "rounded-2xl rounded-br-md bg-primary text-primary-foreground"
                        : "rounded-2xl rounded-bl-md bg-muted",
                      m.pending && "opacity-60",
                    )}
                  >
                    <p className="whitespace-pre-wrap break-words">{m.content}</p>
                  </div>
                  {typeof m.id === "number" && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          className="rounded-full p-1 text-muted-foreground opacity-60 transition-opacity hover:bg-accent hover:text-foreground sm:opacity-0 sm:group-hover/msg:opacity-100"
                          aria-label="Add reaction"
                        >
                          <SmilePlus className="size-4" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-1">
                        <div className="flex gap-0.5">
                          {QUICK_REACTIONS.map((e) => (
                            <button
                              key={e}
                              onClick={() => react(m.id, e)}
                              className="rounded-md p-1 text-lg leading-none transition-transform hover:scale-125"
                            >
                              {e}
                            </button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>

                {(() => {
                  const grouped = groupReactions(m.reactions, me);
                  if (grouped.length === 0) return null;
                  return (
                    <div className={cn("mt-1 flex flex-wrap gap-1", mine ? "justify-end" : "justify-start")}>
                      {grouped.map((g) => (
                        <button
                          key={g.emoji}
                          onClick={() => react(m.id, g.emoji)}
                          className={cn(
                            "flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-xs transition-colors",
                            g.mine ? "border-primary bg-primary/10" : "border-border bg-muted hover:bg-accent",
                          )}
                        >
                          <span>{g.emoji}</span>
                          <span className="tabular-nums text-muted-foreground">{g.count}</span>
                        </button>
                      ))}
                    </div>
                  );
                })()}

                {endGroup && (
                  <p className="mt-0.5 px-1 text-[0.65rem] text-muted-foreground">
                    {timeFmt.format(new Date(m.created_at))}
                    {!isGroup && isMyLast && !m.pending && (
                      <span className="ml-1">· {seen ? "Seen" : "Delivered"}</span>
                    )}
                    {isMyLast && m.pending && <span className="ml-1">· Sending…</span>}
                  </p>
                )}
              </div>
            </div>
          );
        })}
        {otherTyping && (
          <div className="flex justify-start">
            <div className="flex gap-1 rounded-2xl rounded-bl-md bg-muted px-4 py-3">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Composer */}
      <form onSubmit={submit} className="flex items-center gap-2 border-t border-border p-3">
        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="icon" aria-label="Insert emoji">
              <SmilePlus />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2">
            <div className="grid grid-cols-10 gap-0.5">
              {EMOJI_PALETTE.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setText((t) => (t + e).slice(0, 2000))}
                  className="rounded-md p-1 text-lg leading-none transition-transform hover:scale-125"
                >
                  {e}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
        <Input
          value={text}
          onChange={(e) => onType(e.target.value)}
          placeholder="Type a message…"
          maxLength={2000}
          autoComplete="off"
        />
        <Button type="submit" variant="gradient" size="icon" disabled={!text.trim()} aria-label="Send">
          <Send />
        </Button>
      </form>
    </div>
  );
}
