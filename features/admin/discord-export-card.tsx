"use client";

import { useState, useTransition } from "react";
import { ClipboardCheck, Copy, Download, FileJson, TriangleAlert } from "lucide-react";
import { adminExportDiscordServer } from "@/actions/admin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DeferredSpinner } from "@/components/ui/deferred";
import { FeedbackLine as Line, type Feedback } from "./ui";

/**
 * Exports the whole server as JSON, to be pasted somewhere it can be read.
 *
 * Copy and download rather than only showing it: a full server runs to tens of
 * thousands of characters, which is past what anyone will select by hand out of
 * a scrolling box, and past what several chat clients accept in one message.
 *
 * The `problems` list is surfaced above the JSON instead of being left inside
 * it. It is the part worth acting on - a missing permission, a config id
 * pointing at a deleted channel, a worker that has never checked in - and
 * burying it 400 lines into a blob nobody scrolls through would waste it.
 */
export function DiscordExportCard() {
  const [state, setState] = useState<Feedback>(null);
  const [json, setJson] = useState<string | null>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  const run = () =>
    start(async () => {
      setState({ message: "Reading the server…" });
      setJson(null);
      setCopied(false);
      const res = await adminExportDiscordServer();
      if (!res.ok) {
        setState({ error: res.error });
        return;
      }
      setJson(res.json ?? null);
      setProblems(res.problems ?? []);
      const size = ((res.json?.length ?? 0) / 1024).toFixed(1);
      setState({ message: `Exported ${size} KB. Copy it, or download it as a file.` });
    });

  const copy = async () => {
    if (!json) return;
    await navigator.clipboard.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const download = () => {
    if (!json) return;
    const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `discord-server-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Export the server</CardTitle>
        <CardDescription>
          Every channel, role, category and permission overwrite, with IDs resolved to names and
          permission bitfields decoded - plus what the bot itself can see and do, and which saved
          settings point at things that no longer exist. Copy or download it to share when something
          needs diagnosing.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button onClick={run} disabled={pending} variant="gradient">
            {pending ? <DeferredSpinner /> : <FileJson className="size-4" />}
            {pending ? "Reading…" : "Export server"}
          </Button>
          {json && (
            <>
              <Button onClick={copy} variant="outline">
                {copied ? <ClipboardCheck className="size-4" /> : <Copy className="size-4" />}
                {copied ? "Copied" : "Copy JSON"}
              </Button>
              <Button onClick={download} variant="outline">
                <Download className="size-4" />
                Download
              </Button>
            </>
          )}
        </div>

        <Line state={state} />

        {problems.length > 0 && (
          <div className="space-y-1.5 rounded-lg bg-destructive/10 px-3 py-2.5">
            <p className="flex items-center gap-2 text-sm font-medium text-destructive">
              <TriangleAlert className="size-4 shrink-0" />
              {problems.length} thing{problems.length === 1 ? "" : "s"} worth fixing
            </p>
            <ul className="list-disc space-y-1 pl-5 text-xs text-destructive/90">
              {problems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
        )}

        {json && (
          <textarea
            readOnly
            value={json}
            onFocus={(e) => e.currentTarget.select()}
            className="h-64 w-full resize-y rounded-lg border border-border bg-muted/40 p-3 font-mono text-xs"
            aria-label="Server export JSON"
          />
        )}
      </CardContent>
    </Card>
  );
}
