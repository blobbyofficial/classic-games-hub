"use client";

import { useState, useTransition } from "react";
import { Sparkles, Award, Trophy } from "lucide-react";
import { toast } from "sonner";
import { setNameStyle, setFeaturedAchievement, setShowcase } from "@/actions/profile";
import { useSessionStore } from "@/lib/stores/session-store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NAME_STYLES, NameStyle } from "@/components/profile/name-style";
import { cn } from "@/lib/utils";
import type { Profile } from "@/types";

interface AchievementOption {
  slug: string;
  name: string;
}

interface GameOption {
  slug: string;
  title: string;
}

const MAX_SHOWCASE = 4;

export function AppearanceSettings({
  profile,
  achievements,
  games,
}: {
  profile: Profile;
  achievements: AchievementOption[];
  games: GameOption[];
}) {
  const patchProfile = useSessionStore((s) => s.patchProfile);
  const [nameStyle, setStyle] = useState<string>(profile.equipped?.name_style ?? "none");
  const [featured, setFeatured] = useState<string>(profile.featured_achievement ?? "none");
  const [showcase, setShow] = useState<string[]>(
    Array.isArray(profile.showcase) ? (profile.showcase as string[]) : [],
  );
  const [, start] = useTransition();

  const toggleShowcase = (slug: string) => {
    const next = showcase.includes(slug)
      ? showcase.filter((s) => s !== slug)
      : showcase.length < MAX_SHOWCASE
        ? [...showcase, slug]
        : showcase;
    if (next === showcase) return void toast.error(`You can showcase up to ${MAX_SHOWCASE} games`);
    setShow(next);
    start(async () => {
      const res = await setShowcase(next);
      if (!res.ok) {
        toast.error(res.error ?? "Could not save");
        setShow(showcase);
      } else {
        patchProfile({ showcase: next });
      }
    });
  };

  const changeStyle = (v: string) => {
    setStyle(v);
    start(async () => {
      const res = await setNameStyle(v);
      if (!res.ok) {
        toast.error(res.error ?? "Could not save");
        setStyle(profile.equipped?.name_style ?? "none");
      } else {
        patchProfile({ equipped: res.equipped as Record<string, string> });
        toast.success("Name style updated");
      }
    });
  };

  const changeFeatured = (v: string) => {
    setFeatured(v);
    start(async () => {
      const res = await setFeaturedAchievement(v === "none" ? null : v);
      if (!res.ok) {
        toast.error(res.error ?? "Could not save");
        setFeatured(profile.featured_achievement ?? "none");
      } else {
        patchProfile({ featured_achievement: v === "none" ? null : v });
        toast.success("Featured achievement updated");
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-5 text-primary" /> Appearance
        </CardTitle>
        <CardDescription>Style how your name and profile show up.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-1.5">
          <Label>Display-name style</Label>
          <div className="flex items-center gap-3">
            <Select value={nameStyle} onValueChange={changeStyle}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(NAME_STYLES).map(([key, s]) => (
                  <SelectItem key={key} value={key}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-lg font-bold">
              <NameStyle style={nameStyle}>{profile.display_name ?? profile.username}</NameStyle>
            </span>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5">
            <Award className="size-4" /> Featured achievement
          </Label>
          <Select value={featured} onValueChange={changeFeatured}>
            <SelectTrigger className="w-full max-w-xs">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {achievements.map((a) => (
                <SelectItem key={a.slug} value={a.slug}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {achievements.length === 0 && (
            <p className="text-xs text-muted-foreground">Unlock achievements to feature one on your profile.</p>
          )}
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <Trophy className="size-4" /> Trophy case
            <span className="text-xs font-normal text-muted-foreground">
              ({showcase.length}/{MAX_SHOWCASE})
            </span>
          </Label>
          {games.length === 0 ? (
            <p className="text-xs text-muted-foreground">Play some games to pin your favourites here.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {games.map((g) => {
                const on = showcase.includes(g.slug);
                return (
                  <button
                    key={g.slug}
                    onClick={() => toggleShowcase(g.slug)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                      on ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {g.title}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
