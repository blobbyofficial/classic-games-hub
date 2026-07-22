"use client";

import { useEffect, useState } from "react";
import { Flame } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface StreakInfo {
  streak: number;
  best: number;
  alive: boolean;
  at_risk: boolean;
}

/**
 * Message-streak flame for a DM header (roadmap v1.3). Shows the current
 * both-sides daily streak; pulses amber when today hasn't been counted yet.
 */
export function StreakChip({ conversationId }: { conversationId: string }) {
  const [info, setInfo] = useState<StreakInfo | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    supabase
      .rpc("conversation_streak", { p_conversation: conversationId })
      .then(({ data }) => {
        if (!cancelled && data) setInfo(data as unknown as StreakInfo);
      });
    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  if (!info || info.streak < 1) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "ml-auto inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold",
            info.at_risk
              ? "border-amber-400/40 bg-amber-400/10 text-amber-400 motion-safe:animate-pulse"
              : "border-orange-500/40 bg-orange-500/10 text-orange-400",
          )}
        >
          <Flame className="size-3.5" /> {info.streak}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        {info.at_risk
          ? `${info.streak}-day streak — you both need to message today to keep it alive!`
          : `${info.streak}-day chat streak (best: ${info.best}). Message each other every day to grow it.`}
      </TooltipContent>
    </Tooltip>
  );
}
