import { cn, isOnline, PRESENCE_META, type DisplayPresence } from "@/lib/utils";

/**
 * Presence indicator. Pass a resolved `status` (via resolvePresence) for rich
 * away/DND/sleep states, or just `lastSeen` for a simple online/offline dot.
 */
export function PresenceDot({
  lastSeen,
  status,
  className,
  ring = true,
}: {
  lastSeen?: string | null;
  status?: DisplayPresence;
  className?: string;
  ring?: boolean;
}) {
  const presence: DisplayPresence = status ?? (isOnline(lastSeen) ? "online" : "offline");
  const meta = PRESENCE_META[presence];
  return (
    <span
      className={cn("block size-3 rounded-full", ring && "ring-2 ring-card", meta.className, className)}
      title={meta.label}
      aria-label={meta.label}
    />
  );
}
