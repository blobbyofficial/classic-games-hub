"use client";

import { useState, useTransition } from "react";
import { MessageSquare } from "lucide-react";
import { adminMessageReportContext } from "@/actions/admin";
import { Button } from "@/components/ui/button";
import { DeferredSpinner } from "@/components/ui/deferred";
import { cn } from "@/lib/utils";

/**
 * The reported message, shown inside the conversation around it.
 *
 * Loaded on demand rather than with the queue. A report is usually dismissed on
 * its reason alone, and fetching the surrounding messages for every row would
 * pull private conversations into memory to answer a question nobody asked -
 * the narrower the reach into someone's inbox, the better.
 */

interface ContextMessage {
  id: number;
  content: string;
  created_at: string;
  sender_id: string;
  username: string;
  display_name: string | null;
}

interface ReportContext {
  message: {
    id: number;
    content: string;
    created_at: string;
    deleted_at: string | null;
    sender: { id: string; username: string; display_name: string | null } | null;
  } | null;
  context: ContextMessage[];
}

const time = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
  day: "numeric",
  month: "short",
});

export function MessageReportContext({ reportId }: { reportId: number }) {
  const [data, setData] = useState<ReportContext | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const load = () =>
    start(async () => {
      setError(null);
      const res = await adminMessageReportContext(reportId);
      if (!res.ok) return setError(res.error ?? "Could not load the conversation");
      setData((res.context as ReportContext | undefined) ?? null);
    });

  if (!data && !error) {
    return (
      <Button size="sm" variant="outline" onClick={load} disabled={pending} className="mt-2">
        {pending ? <DeferredSpinner /> : <MessageSquare className="size-4" />}
        {pending ? "Loading…" : "Show the conversation"}
      </Button>
    );
  }

  if (error) return <p className="mt-2 text-xs text-destructive">{error}</p>;
  if (!data) return null;

  if (!data.message) {
    return (
      <p className="mt-2 rounded-lg bg-muted/50 p-2 text-xs text-muted-foreground">
        The reported message has since been deleted. Often that means it was already dealt with.
      </p>
    );
  }

  const reportedId = data.message.id;
  // The reported message is merged into its own context so the whole exchange
  // reads in one column, in order, the way it did to the person reporting it.
  const thread: ContextMessage[] = [
    ...data.context,
    {
      id: reportedId,
      content: data.message.content,
      created_at: data.message.created_at,
      sender_id: data.message.sender?.id ?? "",
      username: data.message.sender?.username ?? "unknown",
      display_name: data.message.sender?.display_name ?? null,
    },
  ].sort((a, b) => a.created_at.localeCompare(b.created_at));

  return (
    <div className="mt-2 space-y-1 rounded-lg border border-border bg-muted/30 p-2">
      {thread.map((m) => {
        const isReported = m.id === reportedId;
        return (
          <div
            key={m.id}
            className={cn(
              "rounded-md px-2 py-1.5 text-sm",
              isReported && "bg-destructive/10 ring-1 ring-destructive/40",
            )}
          >
            <p className="text-[11px] text-muted-foreground">
              <span className={cn(isReported && "font-semibold text-destructive")}>
                @{m.username}
              </span>{" "}
              · {time.format(new Date(m.created_at))}
              {isReported && " · reported"}
            </p>
            <p className="whitespace-pre-wrap break-words">{m.content}</p>
          </div>
        );
      })}
      {data.message.deleted_at && (
        <p className="px-2 text-[11px] text-muted-foreground">
          This message was deleted after being reported.
        </p>
      )}
    </div>
  );
}
