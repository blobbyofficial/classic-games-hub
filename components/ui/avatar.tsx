"use client";

import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cn, initials, stringToColor } from "@/lib/utils";

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

/** Frame styles keyed to the shop `avatar_frame` slugs. */
const FRAME_STYLES: Record<string, string> = {
  "frame-neon-ring": "ring-2 ring-cyan-400 shadow-[0_0_12px_2px] shadow-cyan-400/50",
  "frame-violet-pulse": "ring-2 ring-violet-400 shadow-[0_0_14px_3px] shadow-violet-500/50 animate-glow-pulse",
  "frame-gold-laurel": "ring-2 ring-amber-400 shadow-[0_0_12px_2px] shadow-amber-400/50",
  "frame-pixel-fire": "ring-2 ring-orange-500 shadow-[0_0_16px_4px] shadow-orange-500/60 animate-glow-pulse",
  "frame-summer-wave": "ring-2 ring-cyan-300 shadow-[0_0_14px_3px] shadow-amber-300/50",
  "frame-staff-aura": "ring-2 ring-rose-400 shadow-[0_0_16px_4px] shadow-rose-500/60 animate-glow-pulse",
};

interface UserAvatarProps extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root> {
  src?: string | null;
  name?: string | null;
  frame?: string | null;
}

/** Avatar that renders image or colored initials, with optional cosmetic frame. */
function UserAvatar({ src, name, frame, className, ...props }: UserAvatarProps) {
  const frameClass = frame ? FRAME_STYLES[frame] : undefined;
  return (
    <Avatar className={cn(frameClass, className)} {...props}>
      {src ? <AvatarImage src={src} alt={name ?? "avatar"} /> : null}
      <AvatarFallback style={{ backgroundColor: stringToColor(name ?? "?") }}>
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  );
}

export { Avatar, AvatarImage, AvatarFallback, UserAvatar, FRAME_STYLES };
