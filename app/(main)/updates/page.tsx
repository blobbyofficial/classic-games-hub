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
  ChevronDown,
  GitMerge,
  GitCommitHorizontal,
  Layers,
  Package,
  Rocket,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SITE } from "@/lib/constants";
import {
  SERIES,
  LANDED,
  PULL_REQUESTS,
  RELEASE_OF_COMMIT,
  UNASSIGNED,
  UPDATE_STATS,
  REPO_URL,
  commitsOf,
  type UpdateRelease,
} from "@/lib/update-log";

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
  History,
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

/**
 * The chevron every dropdown carries, rotated by its own panel's open state.
 *
 * Native `<details>`, so the whole tree works with JavaScript disabled and
 * costs the page nothing - the alternative was a client component holding
 * open/closed state for twenty-four panels that only ever answer to a click.
 *
 * The groups are *named* because they nest. A plain `group-open:` matches any
 * open ancestor carrying `group`, so opening a line turned every collapsed
 * release chevron inside it upside down - each one claiming to be open.
 */
const CHEVRON_SCOPE = {
  series: "size-5 group-open/series:rotate-180",
  release: "group-open/release:rotate-180",
} as const;

function Chevron({ scope }: { scope: keyof typeof CHEVRON_SCOPE }) {
  return (
    <ChevronDown
      className={`size-4 shrink-0 text-muted-foreground transition-transform duration-200 ${CHEVRON_SCOPE[scope]}`}
      aria-hidden
    />
  );
}

/** The commits and pull requests a release is made of. */
function ReleaseContents({ release }: { release: UpdateRelease }) {
  const commits = commitsOf(release);
  if (commits.length === 0 && !release.prs?.length) return null;

  return (
    <Card variant="flat">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2.5 text-base">
          <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
            <GitCommitHorizontal className="size-4" />
          </span>
          What&apos;s in it
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {commits.length > 0 && (
          <ul className="divide-y divide-border/60">
            {commits.map((change) => (
              <li key={change.sha} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2 first:pt-0 last:pb-0">
                <a
                  href={`${REPO_URL}/commit/${change.sha}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 font-mono text-xs text-muted-foreground hover:text-primary hover:underline"
                >
                  {change.sha}
                </a>
                <span className="min-w-0 flex-1 text-sm">{change.subject}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{change.date}</span>
              </li>
            ))}
          </ul>
        )}
        {release.prs && release.prs.length > 0 && (
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span>Pull request{release.prs.length === 1 ? "" : "s"}:</span>
            {release.prs.map((number) => (
              <a
                key={number}
                href={`${REPO_URL}/pull/${number}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono font-semibold text-primary hover:underline"
              >
                #{number}
              </a>
            ))}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function ReleasePanel({ release, open }: { release: UpdateRelease; open: boolean }) {
  return (
    <details open={open} className="group/release rounded-2xl border border-border bg-card">
      <summary className="flex cursor-pointer list-none items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
        <Chevron scope="release" />
        <span className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
          <span className="font-bold tracking-tight">{release.version}</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-gradient font-semibold">{release.codename}</span>
          {release.formerly && (
            <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              was {release.formerly}
            </span>
          )}
        </span>
        <span className="ml-auto shrink-0 text-xs text-muted-foreground">{release.date}</span>
      </summary>

      <div className="space-y-4 border-t border-border/60 p-4">
        <div className="rounded-xl border border-border bg-gradient-to-br from-success/5 to-transparent p-4">
          <p className="max-w-2xl text-sm text-muted-foreground">{release.summary}</p>
          {release.dateNote && (
            <p className="mt-2 text-xs text-muted-foreground">{release.date} · {release.dateNote}</p>
          )}
          <p className="mt-3 max-w-2xl border-l-2 border-primary/40 pl-3 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Why this is one release: </span>
            {release.scope}
          </p>
        </div>

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

        <ReleaseContents release={release} />
      </div>
    </details>
  );
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
          The complete history, newest first: every release line, every release inside it, and every individual change
          that has landed in production. For what&apos;s coming next, see the{" "}
          <Link href="/roadmap" className="font-medium text-primary hover:underline">
            roadmap
          </Link>
          .
        </p>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat icon={Layers} value={UPDATE_STATS.releases} label="Releases shipped" />
          <Stat icon={Package} value={UPDATE_STATS.features} label="Features delivered" />
          <Stat icon={GitCommitHorizontal} value={UPDATE_STATS.landed} label="Changes in production" />
          <Stat icon={GitMerge} value={UPDATE_STATS.pullRequests} label="Pull requests merged" />
        </div>
      </header>

      {/* Releases, nested by line */}
      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-bold tracking-tight">Releases</h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            {UPDATE_STATS.releases} releases across {UPDATE_STATS.series} lines. Open a line to see its releases; open a
            release to see what it brought and which changes it was made of. A release is a unit of work rather than a
            unit of time - each one says why it was drawn where it was.
          </p>
        </div>

        {SERIES.map((series, seriesIndex) => {
          const newest = series.releases[0];
          const oldest = series.releases[series.releases.length - 1];
          const span =
            series.releases.length === 1 ? newest.version : `${oldest.version} – ${newest.version}`;

          return (
            <details
              key={series.version}
              open={seriesIndex === 0}
              className="group/series rounded-2xl border border-border bg-gradient-to-br from-primary/5 to-transparent"
            >
              <summary className="flex cursor-pointer list-none items-center gap-3 p-5 [&::-webkit-details-marker]:hidden">
                <Chevron scope="series" />
                <span className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="text-xl font-bold tracking-tight">{series.version}</span>
                  <span className="text-gradient text-lg font-semibold">{series.codename}</span>
                  <span className="text-xs text-muted-foreground">
                    {series.releases.length} release{series.releases.length === 1 ? "" : "s"} · {span}
                  </span>
                </span>
                <span className="ml-auto shrink-0 text-xs text-muted-foreground">{series.dates}</span>
              </summary>

              <div className="space-y-3 border-t border-border/60 p-4">
                <p className="max-w-2xl px-1 text-sm text-muted-foreground">{series.summary}</p>
                {series.releases.map((release, releaseIndex) => (
                  <ReleasePanel
                    key={release.version}
                    release={release}
                    open={seriesIndex === 0 && releaseIndex === 0}
                  />
                ))}
              </div>
            </details>
          );
        })}
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
          commit, and which release it shipped in. {UPDATE_STATS.landed} in total, going back to the very first one.
          {UNASSIGNED.length > 0
            ? ` ${UNASSIGNED.length} of them have not been assigned to a release yet.`
            : " All of them belong to a release."}
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
                      {RELEASE_OF_COMMIT[change.sha] && (
                        <span className="shrink-0 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 font-mono text-[11px] text-primary">
                          {RELEASE_OF_COMMIT[change.sha]}
                        </span>
                      )}
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
