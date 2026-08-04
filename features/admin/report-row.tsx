"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, X, Flag } from "lucide-react";
import { toast } from "sonner";
import { adminResolveReport } from "@/actions/admin";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageReportContext } from "./message-report-context";
import { timeAgo } from "@/lib/utils";

interface ReportData {
  id: number;
  target_type: string;
  target_id: string | null;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  reporter?: { username: string } | null;
  target?: { username: string } | null;
}

export function ReportRow({ report }: { report: ReportData }) {
  const [status, setStatus] = useState(report.status);
  const [pending, start] = useTransition();

  const resolve = (s: "resolved" | "dismissed") =>
    start(async () => {
      const res = await adminResolveReport(report.id, s);
      if (!res.ok) {
        toast.error(res.error ?? "Failed");
        return;
      }
      setStatus(s);
      toast.success(`Report ${s}`);
    });

  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">
              <Flag className="size-3" /> {report.target_type}
            </Badge>
            <span className="text-sm font-medium">{report.reason}</span>
            {status !== "open" && (
              <Badge variant={status === "resolved" ? "success" : "secondary"}>{status}</Badge>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Reported by{" "}
            {report.reporter ? (
              <Link href={`/u/${report.reporter.username}`} className="hover:underline">
                @{report.reporter.username}
              </Link>
            ) : (
              "unknown"
            )}
            {report.target && (
              <>
                {" · target "}
                <Link href={`/u/${report.target.username}`} className="hover:underline">
                  @{report.target.username}
                </Link>
              </>
            )}
            {" · "}
            {timeAgo(report.created_at)}
          </p>
          {report.details && <p className="mt-2 rounded-lg bg-muted/50 p-2 text-sm">{report.details}</p>}
          {/* Only message reports have a conversation to show. A profile report
              has nothing surrounding it to read. */}
          {report.target_type === "message" && <MessageReportContext reportId={report.id} />}
        </div>
        {status === "open" && (
          <div className="flex shrink-0 gap-1.5">
            <Button size="icon-sm" variant="outline" onClick={() => resolve("resolved")} disabled={pending} aria-label="Resolve">
              <Check />
            </Button>
            <Button size="icon-sm" variant="ghost" onClick={() => resolve("dismissed")} disabled={pending} aria-label="Dismiss">
              <X />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
