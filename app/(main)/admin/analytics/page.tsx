import type { Metadata } from "next";
import { Users, Gamepad2, Activity, UserPlus, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { StatTile } from "@/components/stat-tile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Analytics — Admin" };

/**
 * Admin analytics centre (roadmap v1.3 "Analytics, ads & admin"). Read-only
 * aggregates over data staff can already see under RLS — no schema changes,
 * no extra tracking, no third-party analytics.
 */

const DAYS = 14;

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function lastNDays(n: number): string[] {
  const out: string[] = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    out.push(dayKey(d));
  }
  return out;
}

function Spark({ series, label }: { series: { day: string; count: number }[]; label: string }) {
  const max = Math.max(1, ...series.map((s) => s.count));
  return (
    <div>
      <div className="flex h-28 items-end gap-1" role="img" aria-label={label}>
        {series.map((s) => (
          <div key={s.day} className="group relative flex-1">
            <div
              className="w-full rounded-t bg-primary/70 transition-colors group-hover:bg-primary"
              style={{ height: `${Math.max(3, Math.round((s.count / max) * 104))}px` }}
            />
            <div className="pointer-events-none absolute -top-7 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded bg-popover px-1.5 py-0.5 text-xs shadow group-hover:block">
              {s.day.slice(5)}: {s.count}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        <span>{series[0]?.day.slice(5)}</span>
        <span>{series[series.length - 1]?.day.slice(5)}</span>
      </div>
    </div>
  );
}

export default async function AdminAnalyticsPage() {
  const supabase = await createClient();
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - (DAYS - 1));
  since.setUTCHours(0, 0, 0, 0);

  const dayAgo = new Date(Date.now() - 24 * 3600_000).toISOString();
  const weekAgo = new Date(Date.now() - 7 * 24 * 3600_000).toISOString();
  const monthAgo = new Date(Date.now() - 30 * 24 * 3600_000).toISOString();

  const [
    { data: sessions },
    { data: newProfiles },
    { count: dau },
    { count: wau },
    { count: mau },
    { count: players },
    { data: durations },
  ] = await Promise.all([
    supabase
      .from("play_sessions")
      .select("created_at")
      .gte("created_at", since.toISOString())
      .limit(10000),
    supabase
      .from("profiles")
      .select("created_at")
      .gte("created_at", since.toISOString())
      .limit(10000),
    supabase.from("profiles").select("*", { count: "exact", head: true }).gte("last_seen_at", dayAgo),
    supabase.from("profiles").select("*", { count: "exact", head: true }).gte("last_seen_at", weekAgo),
    supabase.from("profiles").select("*", { count: "exact", head: true }).gte("last_seen_at", monthAgo),
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase
      .from("play_sessions")
      .select("duration_seconds")
      .gte("created_at", weekAgo)
      .limit(10000),
  ]);

  const days = lastNDays(DAYS);
  const playByDay = new Map(days.map((d) => [d, 0]));
  for (const s of sessions ?? []) {
    const k = s.created_at.slice(0, 10);
    if (playByDay.has(k)) playByDay.set(k, (playByDay.get(k) ?? 0) + 1);
  }
  const signupByDay = new Map(days.map((d) => [d, 0]));
  for (const p of newProfiles ?? []) {
    const k = p.created_at.slice(0, 10);
    if (signupByDay.has(k)) signupByDay.set(k, (signupByDay.get(k) ?? 0) + 1);
  }
  const playSeries = days.map((day) => ({ day, count: playByDay.get(day) ?? 0 }));
  const signupSeries = days.map((day) => ({ day, count: signupByDay.get(day) ?? 0 }));
  const totalPlays14 = playSeries.reduce((s, d) => s + d.count, 0);
  const totalSignups14 = signupSeries.reduce((s, d) => s + d.count, 0);

  const durs = (durations ?? [])
    .map((d) => d.duration_seconds)
    .filter((n): n is number => typeof n === "number" && n > 0);
  const avgDuration = durs.length ? Math.round(durs.reduce((a, b) => a + b, 0) / durs.length) : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatTile icon={Activity} label="Active today" value={formatNumber(dau ?? 0)} />
        <StatTile icon={Activity} label="Active (7d)" value={formatNumber(wau ?? 0)} accent="text-sky-400" />
        <StatTile icon={Activity} label="Active (30d)" value={formatNumber(mau ?? 0)} accent="text-emerald-400" />
        <StatTile icon={Users} label="All players" value={formatNumber(players ?? 0)} accent="text-violet-400" />
        <StatTile
          icon={Clock}
          label="Avg session (7d)"
          value={avgDuration ? `${Math.floor(avgDuration / 60)}m ${avgDuration % 60}s` : "—"}
          accent="text-gold"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Gamepad2 className="size-4 text-primary" /> Plays per day
            </CardTitle>
            <CardDescription>
              {formatNumber(totalPlays14)} plays in the last {DAYS} days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Spark series={playSeries} label={`Plays per day over the last ${DAYS} days`} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserPlus className="size-4 text-emerald-400" /> New players per day
            </CardTitle>
            <CardDescription>
              {formatNumber(totalSignups14)} sign-ups in the last {DAYS} days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Spark series={signupSeries} label={`New players per day over the last ${DAYS} days`} />
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground">
        Aggregated from gameplay and profile data only — no extra tracking is collected for this
        page. Site-traffic analytics (page views, performance) live in the Vercel dashboard.
      </p>
    </div>
  );
}
