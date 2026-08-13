"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, Megaphone, Pin, PinOff, Send, Wrench } from "lucide-react";
import { openIncident, pinComponent, postIncidentUpdate } from "@/actions/status";
import {
  COMPONENT_STATUS,
  INCIDENT_STATUS,
  REPORT_PROBLEM_LABEL,
  formatDuration,
  type ComponentStatus,
  type Incident,
  type IncidentStatus,
  type ReportProblem,
  type StatusComponentSummary,
} from "@/lib/status";
import type { RecentReport } from "@/services/status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "./ui";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/utils";

/**
 * The status console: declare an incident, keep it updated, close it, pin a
 * component, and read what players have actually written.
 *
 * Deliberately one screen. Whoever is using this is using it while something is
 * on fire, and a flow that spans three pages is a flow nobody completes - so
 * declaring an incident and posting the first update are the same action, and
 * resolving one is a status on an update rather than a separate button hidden
 * behind a confirmation.
 */

const INCIDENT_STATUSES: IncidentStatus[] = ["investigating", "identified", "monitoring", "resolved"];
const MAINTENANCE_STATUSES: IncidentStatus[] = ["scheduled", "in_progress", "verifying", "completed"];
const COMPONENT_STATES: ComponentStatus[] = [
  "operational",
  "degraded_performance",
  "partial_outage",
  "major_outage",
  "under_maintenance",
];

export function StatusConsole({
  components,
  open,
  reports,
}: {
  components: StatusComponentSummary[];
  open: Incident[];
  reports: RecentReport[];
}) {
  return (
    <div className="space-y-5">
      {open.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Open now <span className="text-destructive">({open.length})</span>
          </h2>
          {open.map((incident) => (
            <OpenIncident key={incident.id} incident={incident} />
          ))}
        </section>
      )}

      <DeclareForm components={components} />
      <PinBoard components={components} />
      <ReportFeed reports={reports} />
    </div>
  );
}

// ── posting an update to something already open ─────────────────────────────

function OpenIncident({ incident }: { incident: Incident }) {
  const router = useRouter();
  const maintenance = incident.kind === "maintenance";
  const [status, setStatus] = useState<IncidentStatus>(
    maintenance ? "in_progress" : incident.status === "investigating" ? "identified" : "monitoring",
  );
  const [body, setBody] = useState("");
  const [pending, start] = useTransition();

  const submit = () =>
    start(async () => {
      const res = await postIncidentUpdate({ id: incident.id, status, body });
      if (!res.ok) {
        toast.error(res.error ?? "Could not post that.");
        return;
      }
      toast.success(
        status === "resolved" || status === "completed" ? "Incident closed." : "Update posted.",
      );
      setBody("");
      router.refresh();
    });

  return (
    <div className="rounded-xl border border-destructive/30 bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-semibold">
            {maintenance ? (
              <Wrench className="size-4 text-primary" />
            ) : (
              <AlertTriangle className="size-4 text-destructive" />
            )}
            {incident.title}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            INC-{incident.ref} · {INCIDENT_STATUS[incident.status].label} · open for{" "}
            {formatDuration(incident.started_at)}
            {incident.auto && " · opened automatically"}
          </p>
        </div>
        <span className={cn("text-xs font-semibold", INCIDENT_STATUS[incident.status].text)}>
          {incident.components.map((c) => c.name).join(", ") || "No components"}
        </span>
      </div>

      {incident.updates[0] && (
        <p className="mt-2 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          Latest: {incident.updates[0].body}
        </p>
      )}

      <div className="mt-3 space-y-2">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={2}
          maxLength={2000}
          placeholder="What has changed? This is published on /status as-is."
        />
        <div className="flex flex-wrap items-center gap-2">
          <Select value={status} onValueChange={(v) => setStatus(v as IncidentStatus)}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(maintenance ? MAINTENANCE_STATUSES : INCIDENT_STATUSES).map((s) => (
                <SelectItem key={s} value={s}>
                  {INCIDENT_STATUS[s].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={submit} disabled={pending || body.trim().length < 3} className="gap-2">
            <Send className="size-4" />
            {status === "resolved" || status === "completed" ? "Post and close" : "Post update"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── declaring a new one ─────────────────────────────────────────────────────

function DeclareForm({ components }: { components: StatusComponentSummary[] }) {
  const router = useRouter();
  const [kind, setKind] = useState<"incident" | "maintenance">("incident");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [impact, setImpact] = useState("minor");
  const [affected, setAffected] = useState<Record<string, ComponentStatus>>({});
  const [from, setFrom] = useState("");
  const [until, setUntil] = useState("");
  const [pending, start] = useTransition();

  const toggle = (slug: string) =>
    setAffected((current) => {
      const next = { ...current };
      if (next[slug]) delete next[slug];
      else next[slug] = kind === "maintenance" ? "under_maintenance" : "partial_outage";
      return next;
    });

  const submit = () =>
    start(async () => {
      const res = await openIncident({
        title,
        body,
        impact: kind === "maintenance" ? "maintenance" : impact,
        kind,
        components: Object.entries(affected).map(([slug, status]) => ({ slug, status })),
        scheduled_for: from,
        scheduled_until: until,
      });
      if (!res.ok) {
        toast.error(res.error ?? "Could not open that.");
        return;
      }
      toast.success(`INC-${res.ref} is live on /status.`);
      setTitle("");
      setBody("");
      setAffected({});
      setFrom("");
      setUntil("");
      router.refresh();
    });

  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">
          {kind === "maintenance" ? "Schedule maintenance" : "Declare an incident"}
        </h2>
        <Select value={kind} onValueChange={(v) => setKind(v as "incident" | "maintenance")}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="incident">Incident</SelectItem>
            <SelectItem value="maintenance">Maintenance</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="incident-title">Title</Label>
        <Input
          id="incident-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          placeholder={
            kind === "maintenance" ? "Database upgrade" : "Leaderboards are not loading"
          }
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="incident-body">First update</Label>
        <Textarea
          id="incident-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="What players will see. Say what is affected and what they should expect."
        />
        {/* The reminder that matters most: this is not an internal note. */}
        <p className="text-xs text-muted-foreground">
          Published on /status and readable by anyone, signed in or not.
        </p>
      </div>

      {kind === "incident" && (
        <div className="space-y-1.5">
          <Label htmlFor="incident-impact">Impact</Label>
          <Select value={impact} onValueChange={setImpact}>
            <SelectTrigger id="incident-impact" className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="minor">Minor</SelectItem>
              <SelectItem value="major">Major</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {kind === "maintenance" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="maint-from">Starts</Label>
            <Input
              id="maint-from"
              type="datetime-local"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="maint-until">Ends</Label>
            <Input
              id="maint-until"
              type="datetime-local"
              value={until}
              onChange={(e) => setUntil(e.target.value)}
            />
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label>Affected services</Label>
        <div className="flex flex-wrap gap-1.5">
          {components.map((component) => {
            const selected = affected[component.slug];
            return (
              <button
                key={component.slug}
                type="button"
                onClick={() => toggle(component.slug)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs transition-colors",
                  selected
                    ? cn(COMPONENT_STATUS[selected].border, COMPONENT_STATUS[selected].bg, COMPONENT_STATUS[selected].text)
                    : "border-border text-muted-foreground hover:bg-accent",
                )}
              >
                {component.name}
              </button>
            );
          })}
        </div>
        {Object.keys(affected).length > 0 && (
          <div className="space-y-1.5 rounded-lg border border-border/60 p-2.5">
            {Object.entries(affected).map(([slug, status]) => (
              <div key={slug} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate">{components.find((c) => c.slug === slug)?.name ?? slug}</span>
                <Select
                  value={status}
                  onValueChange={(v) =>
                    setAffected((current) => ({ ...current, [slug]: v as ComponentStatus }))
                  }
                >
                  <SelectTrigger className="h-8 w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPONENT_STATES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {COMPONENT_STATUS[s].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        )}
      </div>

      <Button
        onClick={submit}
        disabled={pending || title.trim().length < 3 || body.trim().length < 3}
        className="gap-2"
      >
        <Megaphone className="size-4" />
        {kind === "maintenance" ? "Schedule it" : "Publish incident"}
      </Button>
    </section>
  );
}

// ── pinning a component ─────────────────────────────────────────────────────

function PinBoard({ components }: { components: StatusComponentSummary[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  // Which row is mid-edit, and what it would be pinned to. Choosing a status
  // opens the reason field rather than applying immediately - the reason is
  // published on /status, so it is part of the change, not an afterthought.
  const [draft, setDraft] = useState<{ slug: string; status: ComponentStatus; reason: string } | null>(
    null,
  );

  const apply = (slug: string, status: ComponentStatus | null, reason: string) =>
    start(async () => {
      const res = await pinComponent({ slug, status, reason });
      if (!res.ok) {
        toast.error(res.error ?? "Could not change that.");
        return;
      }
      toast.success(status ? "Pinned." : "Pin cleared - back to what the checks say.");
      setDraft(null);
      router.refresh();
    });

  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div>
        <h2 className="text-sm font-semibold">Override a service</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          A pin beats both the automated checks and any open incident, in either direction. Use it
          for a probe that is wrong, or for work the checks cannot see - and clear it afterwards.
        </p>
      </div>

      <ul className="divide-y divide-border/60">
        {components.map((component) => {
          const editing = draft?.slug === component.slug;
          return (
            <li key={component.slug} className="py-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <span className={cn("size-2 rounded-full", COMPONENT_STATUS[component.status].dot)} />
                    {component.name}
                  </p>
                  {component.pinned && (
                    <p className="text-xs text-muted-foreground">
                      Pinned{component.pinned_reason ? `: ${component.pinned_reason}` : ""}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <Select
                    value={editing ? draft.status : ""}
                    onValueChange={(v) =>
                      setDraft({ slug: component.slug, status: v as ComponentStatus, reason: "" })
                    }
                    disabled={pending}
                  >
                    <SelectTrigger className="h-8 w-44">
                      <SelectValue placeholder={component.pinned ? "Change pin..." : "Pin to..."} />
                    </SelectTrigger>
                    <SelectContent>
                      {COMPONENT_STATES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {COMPONENT_STATUS[s].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {component.pinned ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => apply(component.slug, null, "")}
                      disabled={pending}
                      title="Clear the pin"
                    >
                      <PinOff className="size-4" />
                    </Button>
                  ) : (
                    <Pin className="size-4 shrink-0 text-muted-foreground/40" />
                  )}
                </div>
              </div>

              {editing && (
                <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-muted/30 p-2">
                  <Input
                    autoFocus
                    value={draft.reason}
                    onChange={(e) => setDraft({ ...draft, reason: e.target.value })}
                    maxLength={200}
                    placeholder="Why? Shown on /status beside the service."
                    className="h-8 min-w-0 flex-1"
                  />
                  <Button
                    size="sm"
                    onClick={() => apply(component.slug, draft.status, draft.reason)}
                    disabled={pending}
                  >
                    Pin
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setDraft(null)} disabled={pending}>
                    Cancel
                  </Button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ── what players wrote ──────────────────────────────────────────────────────

function ReportFeed({ reports }: { reports: RecentReport[] }) {
  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div>
        <h2 className="text-sm font-semibold">Recent player reports</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          The notes are only visible here. The public page shows counts and percentages, never the
          text.
        </p>
      </div>

      {reports.length === 0 ? (
        <EmptyState title="No reports yet" hint="Nothing has been reported. Quiet is good." />
      ) : (
        <ul className="divide-y divide-border/60">
          {reports.slice(0, 40).map((report) => (
            <li key={report.id} className="py-2">
              <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
                <span className="font-medium">
                  {REPORT_PROBLEM_LABEL[report.problem as ReportProblem] ?? report.problem}
                </span>
                <span className="text-xs text-muted-foreground">
                  {report.component_name ?? "Whole site"} · {timeAgo(report.created_at)}
                  {report.username ? ` · ${report.username}` : " · anonymous"}
                </span>
              </p>
              {report.note && (
                <p className="mt-0.5 text-sm text-muted-foreground">&ldquo;{report.note}&rdquo;</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
