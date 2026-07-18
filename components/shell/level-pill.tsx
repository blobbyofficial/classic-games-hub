"use client";

import { useSessionStore } from "@/lib/stores/session-store";
import { levelProgress } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/** Circular level indicator with an XP progress ring. */
export function LevelPill() {
  const profile = useSessionStore((s) => s.profile);
  if (!profile) return null;

  const { percent, current, needed } = levelProgress(profile.xp, profile.level);
  const deg = (percent / 100) * 360;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className="relative grid size-9 shrink-0 place-items-center rounded-full text-[11px] font-bold"
          style={{
            background: `conic-gradient(var(--primary) ${deg}deg, var(--muted) ${deg}deg)`,
          }}
        >
          <span className="grid size-7 place-items-center rounded-full bg-background tabular-nums">
            {profile.level}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        Level {profile.level} · {Math.round(current)}/{needed} XP to next
      </TooltipContent>
    </Tooltip>
  );
}
