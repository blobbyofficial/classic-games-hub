import type { Metadata } from "next";
import Link from "next/link";
import {
  History,
  Palette,
  Users,
  SlidersHorizontal,
  Repeat,
  Gift,
  Sparkles,
  BarChart3,
  MessageSquare,
  Heart,
  ShoppingBag,
  Box,
  Gamepad2,
  LayoutDashboard,
  Megaphone,
  Bot,
  GitMerge,
  GitCommitHorizontal,
  Package,
  Rocket,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SITE } from "@/lib/constants";
import { RELEASES, LANDED, PULL_REQUESTS, UPDATE_STATS, REPO_URL } from "@/lib/update-log";

export const metadata: Metadata = {
  title: "Update log",
  description: `Every release, feature and change that has shipped on ${SITE.name}.`,
};

const ICONS: Record<string, LucideIcon> = {
  Palette,
  Users,
  SlidersHorizontal,
  Repeat,
  Gift,
  Sparkles,
  BarChart3,
  MessageSquare,
  Heart,
  ShoppingBag,
  Box,
  Gamepad2,
  LayoutDashboard,
  Megaphone,
  Bot,
  Rocket,
};

function Stat({ icon: Icon, value, label }: { icon: LucideIcon; value: number; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
        <Icon className="size-5" />
      </span>
      <div className="min-w-0">
        <p className="text-xl font-bold tabular-nums leading-tight">{value}</p>
        <p className="truncate text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

/** Groups the flat landed-changes list into month headings, newest first. */
function byMonth<T extends { date: string }>(rows: T[]): [string, T[]][] {
  const out = new Map<string, T[]>();
  for (const row of rows) {
    // "21 Jul 2026" → "Jul 2026"
    const month = row.date.split(" ").slice(1).join(" ");
    const bucket = out.get(month);
    if (bucket) bucket.push(row);
    else out.set(month, [row]);
  }
  return [...out.entries()];
}

export default function UpdatesPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-10">
      {/* Header */}
      <header className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
            <History className="size-6" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Update log</h1>
            <p className="text-sm text-muted-foreground">Everything that has shipped on {SITE.name}.</p>
          </div>
        </div>
        <p className="max-w-2xl text-sm text-muted-foreground">
          The complete history: every release and the features it brought, plus every individual change that has landed
          in production. For what&apos;s coming next, see the{" "}
          <Link href="/roadmap" className="font-medium text-primary hover:underline">
            roadmap
          </Link>
          .
        </p>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat icon={Rocket} value={UPDATE_STATS.releases} label="Releases shipped" />
          <Stat icon={Package} value={UPDATE_STATS.features} label="Features delivered" />
          <Stat icon={GitCommitHorizontal} value={UPDATE_STATS.landed} label="Changes in production" />
          <Stat icon={GitMerge} value={UPDATE_STATS.pullRequests} label="Pull requests merged" />
        </div>
      </header>

      {/* Releases */}
      <section className="space-y-10">
        <h2 className="text-lg font-bold tracking-tight">Releases</h2>

        {RELEASES.map((release) => (
          <div key={release.version} className="space-y-5">
            <div className="rounded-2xl border border-border bg-gradient-to-br from-success/5 to-transparent p-5">
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="text-xl font-bold tracking-tight">
                  {release.version} <span className="text-muted-foreground">·</span>{" "}
                  <span className="text-gradient">{release.codename}</span>
                </h3>
                <span className="inline-flex items-center rounded-full border border-success/30 bg-success/15 px-2.5 py-0.5 text-xs font-medium text-success">
                  Shipped
                </span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {release.date}
                  {release.dateNote && ` · ${release.dateNote}`}
                </span>
              </div>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{release.summary}</p>
            </div>

            <div className="space-y-4">
              {release.groups.map((group) => {
                const Icon = ICONS[group.icon] ?? Sparkles;
                return (
                  <Card key={group.heading}>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2.5 text-base">
                        <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
                          <Icon className="size-4" />
                        </span>
                        {group.heading}
                      </CardTitle>
                      {group.blurb && <p className="pt-1 text-sm text-muted-foreground">{group.blurb}</p>}
                    </CardHeader>
                    <CardContent>
                      <ul className="divide-y divide-border/60">
                        {group.items.map((item) => (
                          <li key={item.title} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={
                                  item.dropped ? "text-sm font-semibold line-through opacity-70" : "text-sm font-semibold"
                                }
                              >
                                {item.title}
                              </span>
                              {item.dropped && (
                                <span className="inline-flex items-center rounded-full border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">
                                  Dropped
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{item.description}</p>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      {/* Merged pull requests */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold tracking-tight">Merged pull requests</h2>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Every pull request merged into <code className="rounded bg-muted px-1 py-0.5 text-xs">main</code>. The five
          oldest predate the rebuild of the site as a Next.js app, so their commits are no longer reachable from the
          current history - GitHub still remembers them.
        </p>
        <Card>
          <CardContent className="pt-6">
            <ul className="divide-y divide-border/60">
              {PULL_REQUESTS.map((pr) => (
                <li key={pr.number} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2.5 first:pt-0 last:pb-0">
                  <a
                    href={`${REPO_URL}/pull/${pr.number}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 font-mono text-xs font-semibold text-primary hover:underline"
                  >
                    #{pr.number}
                  </a>
                  <span className="min-w-0 flex-1 text-sm">{pr.title}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{pr.date}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>

      {/* Full landing history */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold tracking-tight">Everything that landed</h2>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Every change that reached production, newest first - whether it arrived through a pull request or as a direct
          commit. {UPDATE_STATS.landed} in total, going back to the very first one.
        </p>

        <div className="space-y-4">
          {byMonth(LANDED).map(([month, changes]) => (
            <Card key={month}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  {month} <span className="font-normal">· {changes.length}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="divide-y divide-border/60">
                  {changes.map((change) => (
                    <li
                      key={change.sha}
                      className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2 first:pt-0 last:pb-0"
                    >
                      <a
                        href={`${REPO_URL}/commit/${change.sha}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 font-mono text-xs text-muted-foreground hover:text-primary hover:underline"
                      >
                        {change.sha}
                      </a>
                      <span className="min-w-0 flex-1 text-sm">{change.subject}</span>
                      {change.pr && (
                        <a
                          href={`${REPO_URL}/pull/${change.pr}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 font-mono text-[11px] text-primary hover:underline"
                        >
                          #{change.pr}
                        </a>
                      )}
                      <span className="shrink-0 text-xs text-muted-foreground">{change.date}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <p className="pb-4 text-center text-xs text-muted-foreground">
        Curious what&apos;s next?{" "}
        <Link href="/roadmap" className="text-primary hover:underline">
          See the roadmap.
        </Link>
      </p>
    </div>
  );
}
