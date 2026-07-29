import type { Metadata } from "next";
import Link from "next/link";
import {
  Map as MapIcon,
  Palette,
  Users,
  SlidersHorizontal,
  Repeat,
  Gift,
  Sparkles,
  BarChart3,
  CheckCircle2,
  MessageSquare,
  Heart,
  ShoppingBag,
  Box,
  Gamepad2,
  LayoutDashboard,
  Megaphone,
  Bot,
  Gauge,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { SITE } from "@/lib/constants";
import { ROADMAP, STATUS_META, DEFINITION_OF_DONE, type RoadmapRelease, type RoadmapStatus } from "@/lib/roadmap";
import { getFlagPayload } from "@/lib/supabase/queries";

export const metadata: Metadata = {
  title: "Roadmap",
  description: "What's shipped, what's next and what we're exploring for Classic Games Hub.",
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
  Gauge,
};

function StatusPill({ status, className }: { status: RoadmapStatus; className?: string }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        meta.className,
        className,
      )}
    >
      {meta.label}
    </span>
  );
}

export default async function RoadmapPage() {
  // Admins can override the roadmap from Admin → Site (validated JSON in the
  // roadmap_override flag); the built-in roadmap is the fallback.
  let roadmap: RoadmapRelease[] = ROADMAP;
  const override = await getFlagPayload("roadmap_override");
  if (override?.enabled) {
    const releases = (override.payload as { releases?: RoadmapRelease[] } | null)?.releases;
    if (Array.isArray(releases) && releases.length > 0) roadmap = releases;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      {/* Header */}
      <header className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
            <MapIcon className="size-6" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Roadmap</h1>
            <p className="text-sm text-muted-foreground">Where {SITE.name} is heading next.</p>
          </div>
        </div>
        <p className="max-w-2xl text-sm text-muted-foreground">
          A living plan of what we&apos;re building next. Everything here is an idea or an intention - not a promise.
          Plans shift, features ship early or get dropped, and your feedback genuinely changes what comes next. For
          everything already shipped, see the{" "}
          <Link href="/updates" className="font-medium text-primary hover:underline">
            update log
          </Link>
          . Have a suggestion?{" "}
          <a
            href={SITE.discord}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary hover:underline"
          >
            Tell us on Discord
          </a>
          .
        </p>

        {/* Legend */}
        <div className="flex flex-wrap gap-2">
          {(["in-progress", "next", "later", "idea"] as RoadmapStatus[]).map((s) => (
            <StatusPill key={s} status={s} />
          ))}
        </div>
      </header>

      {/* Releases */}
      {roadmap.map((release) => (
        <section key={release.version} className="space-y-5">
          <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/5 to-transparent p-5">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-xl font-bold tracking-tight">
                {release.version} <span className="text-muted-foreground">·</span>{" "}
                <span className="text-gradient">{release.codename}</span>
              </h2>
              <StatusPill status={release.status} />
              <span className="ml-auto text-xs text-muted-foreground">{release.timeframe}</span>
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
                            <span className="text-sm font-semibold">{item.title}</span>
                            {item.status && <StatusPill status={item.status} className="scale-90" />}
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
        </section>
      ))}

      {/* Definition of done */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold tracking-tight">How we ship</h2>
        <Card>
          <CardContent className="pt-6">
            <p className="mb-4 text-sm text-muted-foreground">
              Every feature that lands has to clear the same bar before it&apos;s considered done:
            </p>
            <ul className="grid gap-2.5 sm:grid-cols-2">
              {DEFINITION_OF_DONE.map((rule) => (
                <li key={rule} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="size-4 shrink-0 text-success" />
                  {rule}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>

      <p className="pb-4 text-center text-xs text-muted-foreground">
        This roadmap is a plan, not a guarantee. Want to shape it?{" "}
        <Link href="/challenges" className="text-primary hover:underline">
          Play, earn, and let us know what you&apos;d love to see.
        </Link>
      </p>
    </div>
  );
}
