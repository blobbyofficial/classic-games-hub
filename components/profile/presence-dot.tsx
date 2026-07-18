import { cn, isOnline } from "@/lib/utils";

export function PresenceDot({
  lastSeen,
  className,
  ring = true,
}: {
  lastSeen: string | null | undefined;
  className?: string;
  ring?: boolean;
}) {
  const online = isOnline(lastSeen);
  return (
    <span
      className={cn(
        "block size-3 rounded-full",
        ring && "ring-2 ring-card",
        online ? "bg-success" : "bg-muted-foreground/50",
        className,
      )}
      title={online ? "Online" : "Offline"}
      aria-label={online ? "Online" : "Offline"}
    />
  );
}
