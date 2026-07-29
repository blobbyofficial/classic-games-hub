"use client";

import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cn, initials, stringToColor } from "@/lib/utils";
import { AvatarDecoration, hasDecoration } from "@/components/profile/avatar-decoration";

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn("relative flex size-10 shrink-0 overflow-hidden rounded-full", className)}
    {...props}
  />
));
Avatar.displayName = AvatarPrimitive.Root.displayName;

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image ref={ref} className={cn("aspect-square size-full object-cover", className)} {...props} />
));
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      "flex size-full items-center justify-center rounded-full text-xs font-semibold text-white",
      className,
    )}
    {...props}
  />
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

/** Simple ring/shadow frame styles keyed to the shop `avatar_frame` slugs. */
const FRAME_STYLES: Record<string, string> = {
  "frame-neon-ring": "ring-2 ring-cyan-400 shadow-[0_0_14px_3px] shadow-cyan-400/60 motion-safe:animate-glow-pulse",
  "frame-violet-pulse": "ring-2 ring-violet-400 shadow-[0_0_16px_4px] shadow-violet-500/60 motion-safe:animate-glow-pulse",
  "frame-gold-laurel": "ring-2 ring-amber-400 shadow-[0_0_12px_2px] shadow-amber-400/50",
  "frame-pixel-fire": "ring-2 ring-orange-500 shadow-[0_0_16px_4px] shadow-orange-500/60 motion-safe:animate-glow-pulse",
  "frame-summer-wave": "ring-2 ring-cyan-300 shadow-[0_0_14px_3px] shadow-amber-300/50",
  "frame-emerald-ring": "ring-2 ring-emerald-400 shadow-[0_0_12px_2px] shadow-emerald-400/50",
  "frame-shadow": "ring-2 ring-slate-700 shadow-[0_0_14px_3px] shadow-slate-900/60",
  "frame-royal": "ring-2 ring-amber-300 shadow-[0_0_16px_4px] shadow-violet-500/50 motion-safe:animate-glow-pulse",
  "frame-toxic": "ring-2 ring-lime-400 shadow-[0_0_16px_4px] shadow-lime-500/60 motion-safe:animate-glow-pulse",
};

/**
 * Premium frames: an animated rotating gradient rim (Discord "nitro" style). The
 * conic gradient sits behind the avatar and pokes out ~3px to read as a border;
 * a card-colored ring separates it from the image. `glow` is the outer bloom.
 */
const FRAME_RING: Record<string, { gradient: string; glow: string; spin?: boolean }> = {
  "frame-rainbow": {
    gradient: "conic-gradient(from 0deg, #f43f5e, #f59e0b, #22c55e, #3b82f6, #a855f7, #f43f5e)",
    glow: "shadow-[0_0_18px_4px] shadow-fuchsia-500/50",
    spin: true,
  },
  "frame-dev-aura": {
    gradient: "conic-gradient(from 0deg, #22d3ee, #8b5cf6, #22d3ee)",
    glow: "shadow-[0_0_20px_5px] shadow-violet-500/60",
    spin: true,
  },
  "frame-staff-aura": {
    gradient: "conic-gradient(from 0deg, #f43f5e, #8b5cf6, #f43f5e)",
    glow: "shadow-[0_0_20px_5px] shadow-rose-500/60",
    spin: true,
  },
  "frame-frostbite": {
    gradient: "conic-gradient(from 0deg, #e0f2fe, #38bdf8, #6366f1, #e0f2fe)",
    glow: "shadow-[0_0_18px_4px] shadow-cyan-400/60",
    spin: true,
  },
};

interface UserAvatarProps extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root> {
  src?: string | null;
  name?: string | null;
  frame?: string | null;
  /** Equipped `decoration` slug. Layers on top of the frame, and may overhang. */
  decoration?: string | null;
}

/** Avatar that renders image or colored initials, with optional cosmetic frame. */
function UserAvatar({ src, name, frame, decoration, className, ...props }: UserAvatarProps) {
  const ring = frame ? FRAME_RING[frame] : undefined;
  const deco = hasDecoration(decoration) ? decoration : null;
  const inner = (
    <Avatar className={cn(!ring && frame ? FRAME_STYLES[frame] : undefined, ring && "ring-2 ring-card", className)} {...props}>
      {src ? <AvatarImage src={src} alt={name ?? "avatar"} /> : null}
      <AvatarFallback style={{ backgroundColor: stringToColor(name ?? "?") }}>
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  );

  // The overwhelmingly common case is a plain avatar; keep it a single element
  // rather than paying for wrapper spans on every row of every list.
  if (!ring && !deco) return inner;

  // The decoration deliberately sits outside Avatar, which clips its overflow -
  // a crown that cannot poke above the head is not a crown.
  return (
    <span className={cn("relative inline-grid place-items-center rounded-full", ring?.glow)}>
      {ring && (
        <span
          className={cn("pointer-events-none absolute -inset-[3px] rounded-full", ring.spin && "motion-safe:animate-spin-slow")}
          style={{ background: ring.gradient }}
          aria-hidden
        />
      )}
      <span className="relative">{inner}</span>
      <AvatarDecoration slug={deco} />
    </span>
  );
}

export { Avatar, AvatarImage, AvatarFallback, UserAvatar, FRAME_STYLES };
