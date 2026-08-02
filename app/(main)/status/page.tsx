import type { Metadata } from "next";
import {
  Activity,
  Users,
  Gamepad2,
  Play,
  MessageSquare,
  Coins,
  Link2,
  ShieldAlert,
  Heart,
  Bot,
  Clock,
} from "lucide-react";
import { getPlatformStatus } from "@/services/status";
import { getCurrentProfile } from "@/lib/supabase/queries";
import { StatTile } from "@/components/stat-tile";
import { formatNumber, timeAgo } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Status",
  description: "Live platform status for Classic Games Hub - players online, games, and services.",
};

// Counts are only interesting when they're current.
export const dynamic = "force-dynamic";

export default async function StatusPage() {
  const [status, profile] = await Promise.all([getPlatformStatus(), getCurrentProfile()]);
  const isStaff = profile?.role === "admin" || profile?.role === "moderator";

  if (!status) {
    return (
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold tracking-tight">Status</h1>
        <p className="mt-4 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Status is unavailable right now. That usually means the database is unreachable - try again
          in a moment.
        </p>
      </div>
    );
  }

  const { players, games, social, economy, discord, moderation } = status;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
          <Activity className="size-6" />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Platform status</h1>
          <p className="text-sm text-muted-foreground">
            Live numbers, generated {timeAgo(status.generated_at)}.
          </p>
        </div>
      </div>

      <Section title="Players">
        <StatTile icon={Users} label="Registered" value={formatNumber(players.total)} />
        <StatTile icon={Activity} label="Online now" value={formatNumber(players.online)} accent="text-success" />
        <StatTile icon={Clock} label="Active today" value={formatNumber(players.active_24h)} />
        <StatTile icon={Link2} label="Discord linked" value={formatNumber(players.discord_linked)} />
      </Section>

      <Section title="Games">
        <StatTile icon={Gamepad2} label="Published" value={formatNumber(games.published)} />
        <StatTile icon={Play} label="Plays today" value={formatNumber(games.plays_today)} />
        <StatTile icon={Play} label="Plays last hour" value={formatNumber(games.plays_last_hour)} />
        <StatTile icon={Play} label="Plays all time" value={formatNumber(games.plays_total)} />
      </Section>

      <Section title="Community">
        <StatTile icon={MessageSquare} label="Messages today" value={formatNumber(social.messages_24h)} />
        <StatTile icon={Heart} label="Friendships" value={formatNumber(social.friendships)} />
        <StatTile icon={Coins} label="Credits earned today" value={formatNumber(economy.credits_awarded_24h)} accent="text-gold" />
        <StatTile icon={Coins} label="Shop items" value={formatNumber(economy.shop_items)} />
      </Section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">Discord bot</h2>
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Bot className="size-5 text-primary" />
              <div>
                <p className="font-semibold">Gateway worker</p>
                <p className="text-xs text-muted-foreground">
                  {discord.worker_last_seen
                    ? `Last heartbeat ${timeAgo(discord.worker_last_seen)}`
                    : "No heartbeat recorded yet"}
                </p>
              </div>
            </div>
            <span
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                discord.worker_online
                  ? "bg-success/15 text-success"
                  : "bg-destructive/15 text-destructive"
              }`}
            >
              <span className={`size-2 rounded-full ${discord.worker_online ? "bg-success" : "bg-destructive"}`} />
              {discord.worker_online ? "Online" : "Offline"}
            </span>
          </div>

          <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <Row label="Levelling" value={discord.leveling_enabled ? "On" : "Off"} />
            <Row label="Verification" value={discord.verification_configured ? "Configured" : "Not set up"} />
            <Row label="Tickets" value={discord.tickets_configured ? "Configured" : "Not set up"} />
            <Row label="Live counters" value={discord.counters_configured ? "Configured" : "Not set up"} />
            <Row
              label="Milestone roles"
              value={`${discord.milestone_roles_created}/${discord.milestone_roles_expected} created`}
            />
            <Row label="Chat members tracked" value={formatNumber(discord.chat_members)} />
          </dl>
        </div>
      </section>

      {isStaff && (
        <Section title="Moderation (staff only)">
          <StatTile
            icon={ShieldAlert}
            label="Open reports"
            value={formatNumber(moderation.open_reports)}
            accent={moderation.open_reports > 0 ? "text-destructive" : "text-primary"}
          />
          <StatTile icon={ShieldAlert} label="Suspended accounts" value={formatNumber(moderation.banned)} />
          <StatTile icon={ShieldAlert} label="Mod cases" value={formatNumber(discord.mod_cases)} />
          <StatTile icon={ShieldAlert} label="Open tickets" value={formatNumber(discord.open_tickets)} />
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-muted-foreground">{title}</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/60 py-1.5 last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
