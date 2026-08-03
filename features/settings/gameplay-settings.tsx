"use client";

import { useState, useTransition } from "react";
import { CalendarClock, Contrast, Gauge, Globe, Music, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { updateSettings } from "@/actions/profile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { UserSettings } from "@/types";

/**
 * Gameplay and formatting preferences (migration 0064).
 *
 * A separate section rather than more rows under Preferences, which had become
 * a single list mixing how the site looks with who may message you. These are
 * the settings that only matter once you press play.
 *
 * Every row carries a sentence explaining what it changes. The existing rows
 * mostly restated their own label ("Reduced motion - reduce motion"), which
 * tells someone deciding whether to turn it on precisely nothing.
 */

function Row({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof Gauge;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

/** A volume slider that only writes on release, not on every pixel of drag. */
function VolumeRow({
  icon,
  title,
  description,
  value,
  onCommit,
}: {
  icon: typeof Gauge;
  title: string;
  description: string;
  value: number;
  onCommit: (v: number) => void;
}) {
  const [shown, setShown] = useState(value);
  return (
    <Row icon={icon} title={title} description={description}>
      <div className="flex w-40 items-center gap-2">
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={shown}
          aria-label={title}
          onChange={(e) => setShown(Number(e.target.value))}
          // Dragging fires change continuously; committing on release keeps one
          // adjustment to one write instead of twenty.
          onPointerUp={() => onCommit(shown)}
          onKeyUp={() => onCommit(shown)}
          className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
        />
        <span className="w-8 shrink-0 text-right text-xs tnum text-muted-foreground">{shown}</span>
      </div>
    </Row>
  );
}

export function GameplaySettings({ settings }: { settings: UserSettings }) {
  const [local, setLocal] = useState(settings);
  const [, start] = useTransition();

  const update = (key: keyof UserSettings, value: unknown) => {
    setLocal((s) => ({ ...s, [key]: value }));
    start(async () => {
      const res = await updateSettings({ [key]: value });
      if (!res.ok) {
        toast.error(res.error ?? "Could not save");
        setLocal(settings);
      }
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Playing</CardTitle>
          <CardDescription>How games start and how they sound.</CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-border pt-0">
          <Row
            icon={Gauge}
            title="Default difficulty"
            description="Where the difficulty picker starts on a game page. You can still change it per game, and each difficulty has its own leaderboard."
          >
            <Select
              value={local.default_difficulty}
              onValueChange={(v) => update("default_difficulty", v)}
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="regular">Regular</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </Row>

          <VolumeRow
            icon={Volume2}
            title="Sound effects"
            description="Jumps, hits, clears and game-over sounds."
            value={local.sound_volume}
            onCommit={(v) => update("sound_volume", v)}
          />

          <VolumeRow
            icon={Music}
            title="Music"
            description="Background music, including profile music on other people's pages."
            value={local.music_volume}
            onCommit={(v) => update("music_volume", v)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Display & formatting</CardTitle>
          <CardDescription>How the Hub renders for you.</CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-border pt-0">
          <Row
            icon={Contrast}
            title="High contrast"
            description="Stronger borders and text contrast across the site. Separate from your system contrast setting, so you can turn it on here only."
          >
            <Switch
              checked={local.high_contrast}
              onCheckedChange={(v) => update("high_contrast", v)}
            />
          </Row>

          <Row
            icon={Globe}
            title="Time zone"
            description="Used for daily reward resets and timestamps. Left on automatic, the Hub follows your browser."
          >
            <Select
              value={local.timezone || "auto"}
              onValueChange={(v) => update("timezone", v === "auto" ? "" : v)}
            >
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Automatic</SelectItem>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz} value={tz}>
                    {tz.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Row>

          <Row
            icon={CalendarClock}
            title="Date format"
            description="How dates are written. Automatic follows your time zone's convention."
          >
            <Select value={local.date_format} onValueChange={(v) => update("date_format", v)}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Automatic</SelectItem>
                <SelectItem value="dmy">31/12/2026</SelectItem>
                <SelectItem value="mdy">12/31/2026</SelectItem>
                <SelectItem value="iso">2026-12-31</SelectItem>
              </SelectContent>
            </Select>
          </Row>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * A short list rather than the full IANA database.
 *
 * `Intl.supportedValuesOf("timeZone")` returns roughly 400 entries, which is a
 * scroll nobody finishes, and the setting exists for the handful of people
 * whose browser zone is wrong. Automatic covers everyone else.
 */
const TIMEZONES = [
  "Europe/London",
  "Europe/Dublin",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Madrid",
  "Europe/Moscow",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Sao_Paulo",
  "Africa/Lagos",
  "Africa/Johannesburg",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Pacific/Auckland",
];
