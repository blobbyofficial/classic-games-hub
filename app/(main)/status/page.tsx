import type { Metadata } from "next";
import Link from "next/link";
import {
  Activity,
  Clock,
  Coins,
  Gamepad2,
  History,
  Link2,
  Play,
  ShieldAlert,
  Users,
} from "lucide-react";
import {
  getIncidentHistory,
  getPlatformStatus,
  getReportTimeline,
  getSchemaVersion,
  getStatusSummary,
  getUptimeMatrix,
} from "@/services/status";
import { getCurrentProfile } from "@/lib/supabase/queries";
import { PageHeader } from "@/components/page-header";
import { StatTile } from "@/components/stat-tile";
import { formatNumber } from "@/lib/utils";
import { AutoRefresh } from "@/features/status/auto-refresh";
import { ApiCard } from "@/features/status/api-card";
import { ComponentBoard } from "@/features/status/component-board";
import { IncidentCard } from "@/features/status/incident-card";
import { ReportPanel } from "@/features/status/report-panel";
import { StatusBanner } from "@/features/status/status-banner";
import { VersionsCard } from "@/features/status/versions-card";

export const metadata: Metadata = {
  title: "Status",
  description:
    "Live status for Classic Games Hub - uptime, incidents, versions and problems reported by players.",
};

// Everything here is only worth reading if it is current.
export const dynamic = "force-dynamic";

export default async function StatusPage() {
  const [summary, matrix, reports, history, platform, profile, schema] = await Promise.all([
    getStatusSummary(),
    getUptimeMatrix(90),
    getReportTimeline(null, 24),
    getIncidentHistory(10),
    getPlatformStatus(),
    getCurrentProfile(),
    getSchemaVersion(),
  ]);

  const isStaff = profile?.role === "admin" || profile?.role === "moderator";

  // The one case the page has to handle better than any other page on the site:
  // the database being unreachable is exactly when someone loads /status, so it
  // says so plainly rather than rendering an error boundary.
  if (!summary) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader icon={Activity} title="Status" />
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center">
          <p className="font-semibold text-destructive">We cannot read our own status right now.</p>
          <p className="mt-1.5 text-sm text-muted-foreground">
            That almost always means the database is unreachable, which means the site is having
            real problems. Try again in a minute.
          </p>
        </div>
      </div>
    );
  }

  const resolved = (history ?? []).filter((incident) => incident.resolved_at);

  return (
    <div className="mx-auto max-w-4xl">
      <AutoRefresh seconds={60} />

      <PageHeader
        icon={Activity}
        title="Platform status"
        description="Whether everything is working, what broke recently, and what players are telling us right now."
      />

      <div className="space-y-8">
        <StatusBanner summary={summary} />

        {summary.incidents.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground">Open incidents</h2>
            {summary.incidents.map((incident) => (
              <IncidentCard key={incident.id} incident={incident} />
            ))}
          </section>
        )}

        {summary.maintenance.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground">Scheduled maintenance</h2>
            {summary.maintenance.map((incident) => (
              <IncidentCard key={incident.id} incident={incident} />
            ))}
          </section>
        )}

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Services <span className="font-normal">- 90 days of uptime</span>
          </h2>
          <ComponentBoard components={summary.components} matrix={matrix} />
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">Reported by players</h2>
          <ReportPanel timeline={reports} components={summary.components} />
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <VersionsCard summary={summary} schema={schema} />
          <ApiCard />
        </section>

        {platform && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground">
              Right now <span className="font-normal">- how busy the arcade is</span>
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatTile icon={Users} label="Players online" value={formatNumber(platform.players.online)} accent="text-success" />
              <StatTile icon={Clock} label="Active today" value={formatNumber(platform.players.active_24h)} />
              <StatTile icon={Play} label="Plays today" value={formatNumber(platform.games.plays_today)} />
              <StatTile icon={Play} label="Plays last hour" value={formatNumber(platform.games.plays_last_hour)} />
              <StatTile icon={Users} label="Registered players" value={formatNumber(platform.players.total)} />
              <StatTile icon={Link2} label="Discord linked" value={formatNumber(platform.players.discord_linked)} />
              <StatTile icon={Gamepad2} label="Games" value={formatNumber(platform.games.published + (platform.games.in_development ?? 0))} />
              <StatTile icon={Coins} label="Credits earned today" value={formatNumber(platform.economy.credits_awarded_24h)} accent="text-gold" />
            </div>
          </section>
        )}

        {resolved.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <History className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-muted-foreground">Recently resolved</h2>
            </div>
            {resolved.map((incident) => (
              <IncidentCard key={incident.id} incident={incident} compact />
            ))}
          </section>
        )}

        {isStaff && platform && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground">Moderation (staff only)</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatTile
                icon={ShieldAlert}
                label="Open reports"
                value={formatNumber(platform.moderation.open_reports)}
                accent={platform.moderation.open_reports > 0 ? "text-destructive" : "text-primary"}
              />
              <StatTile icon={ShieldAlert} label="Suspended accounts" value={formatNumber(platform.moderation.banned)} />
              <StatTile icon={ShieldAlert} label="Mod cases" value={formatNumber(platform.discord.mod_cases)} />
              <StatTile icon={ShieldAlert} label="Open tickets" value={formatNumber(platform.discord.open_tickets)} />
            </div>
            <p className="text-xs text-muted-foreground">
              Open, update and resolve incidents from{" "}
              <Link href="/admin/status" className="font-medium text-primary hover:underline">
                the status console
              </Link>
              .
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
