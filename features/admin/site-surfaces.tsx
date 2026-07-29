"use client";

import { useState, useTransition } from "react";
import { AlertCircle, ArrowDown, ArrowUp, CheckCircle2, Eye, EyeOff, Map, LayoutDashboard, Save } from "lucide-react";
import { adminSetFlag, adminSetFlagConfig } from "@/actions/admin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { FeedbackLine, type Feedback } from "./ui";
import { cn } from "@/lib/utils";

interface FlagRow {
  key: string;
  enabled: boolean;
  payload: unknown;
}

const SECTION_LABELS: Record<string, string> = {
  event: "Community event",
  daily: "Daily reward",
  recent: "Continue playing",
  featured: "Featured games",
  categories: "Category rail",
  all_games: "All games + top players",
};
const ALL_SECTIONS = Object.keys(SECTION_LABELS);

export function SiteSurfaces({
  homeLayout,
  roadmapOverride,
}: {
  homeLayout: FlagRow;
  roadmapOverride: FlagRow;
}) {
  const [pending, start] = useTransition();

  // ── Home layout ──
  const layoutInit = (homeLayout.payload ?? {}) as { order?: string[]; hidden?: string[] };
  const initialOrder = [
    ...(layoutInit.order ?? []).filter((k) => ALL_SECTIONS.includes(k)),
    ...ALL_SECTIONS.filter((k) => !(layoutInit.order ?? []).includes(k)),
  ];
  const [layoutOn, setLayoutOn] = useState(homeLayout.enabled);
  const [order, setOrder] = useState<string[]>(initialOrder);
  const [hidden, setHidden] = useState<Set<string>>(new Set(layoutInit.hidden ?? []));
  const [layoutState, setLayoutState] = useState<Feedback>(null);

  const move = (key: string, dir: -1 | 1) => {
    setOrder((o) => {
      const i = o.indexOf(key);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= o.length) return o;
      const next = [...o];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  const saveLayout = () =>
    start(async () => {
      const res = await adminSetFlagConfig("home_layout", layoutOn, {
        order,
        hidden: [...hidden],
      });
      setLayoutState(res.ok ? { message: "Home layout saved." } : { error: res.error });
    });

  // ── Roadmap override ──
  const [roadmapOn, setRoadmapOn] = useState(roadmapOverride.enabled);
  const [roadmapText, setRoadmapText] = useState(
    JSON.stringify(roadmapOverride.payload ?? {}, null, 2),
  );
  const [roadmapState, setRoadmapState] = useState<Feedback>(null);

  const saveRoadmap = () =>
    start(async () => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(roadmapText || "{}");
      } catch {
        setRoadmapState({ error: "That isn't valid JSON." });
        return;
      }
      const res = await adminSetFlagConfig("roadmap_override", roadmapOn, parsed);
      setRoadmapState(res.ok ? { message: "Roadmap saved." } : { error: res.error });
    });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LayoutDashboard className="size-5 text-primary" /> Home screen layout
          </CardTitle>
          <CardDescription>
            Reorder or hide the sections of the home page (the hero always stays on top). Turn the
            toggle off to fall back to the default layout.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Switch id="layout-on" checked={layoutOn} onCheckedChange={setLayoutOn} />
            <Label htmlFor="layout-on">Use custom layout</Label>
          </div>
          <ul className="space-y-1.5">
            {order.map((key, i) => (
              <li
                key={key}
                className={cn(
                  "flex items-center gap-2 rounded-lg border border-border/60 px-3 py-2 text-sm",
                  hidden.has(key) && "opacity-50",
                )}
              >
                <span className="flex-1">{SECTION_LABELS[key]}</span>
                <Button variant="ghost" size="icon-sm" aria-label={`Move ${SECTION_LABELS[key]} up`} onClick={() => move(key, -1)} disabled={i === 0}>
                  <ArrowUp className="size-4" />
                </Button>
                <Button variant="ghost" size="icon-sm" aria-label={`Move ${SECTION_LABELS[key]} down`} onClick={() => move(key, 1)} disabled={i === order.length - 1}>
                  <ArrowDown className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={hidden.has(key) ? `Show ${SECTION_LABELS[key]}` : `Hide ${SECTION_LABELS[key]}`}
                  onClick={() =>
                    setHidden((h) => {
                      const next = new Set(h);
                      if (next.has(key)) next.delete(key);
                      else next.add(key);
                      return next;
                    })
                  }
                >
                  {hidden.has(key) ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </Button>
              </li>
            ))}
          </ul>
          <FeedbackLine state={layoutState} />
          <Button onClick={saveLayout} disabled={pending} variant="gradient">
            <Save className="size-4" /> Save layout
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Map className="size-5 text-primary" /> Roadmap
          </CardTitle>
          <CardDescription>
            Edit the public /roadmap without touching code. The JSON must be{" "}
            <code>{"{ \"releases\": [...] }"}</code> matching the built-in roadmap shape (version,
            codename, status, timeframe, summary, groups → items); it is validated before saving.
            Disable the toggle to fall back to the built-in roadmap.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Switch id="roadmap-on" checked={roadmapOn} onCheckedChange={setRoadmapOn} />
            <Label htmlFor="roadmap-on">Use this roadmap instead of the built-in one</Label>
          </div>
          <Textarea
            rows={14}
            className="font-mono text-xs"
            value={roadmapText}
            onChange={(e) => setRoadmapText(e.target.value)}
            aria-label="Roadmap JSON"
          />
          <FeedbackLine state={roadmapState} />
          <Button onClick={saveRoadmap} disabled={pending} variant="gradient">
            <Save className="size-4" /> Save roadmap
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
