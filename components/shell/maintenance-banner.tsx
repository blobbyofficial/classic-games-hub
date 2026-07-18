import { AlertTriangle } from "lucide-react";

export function MaintenanceBanner() {
  return (
    <div className="border-b border-warning/30 bg-warning/10 px-4 py-2 text-center text-sm font-medium text-[oklch(0.5_0.15_75)] dark:text-warning">
      <span className="inline-flex items-center gap-2">
        <AlertTriangle className="size-4" />
        Scheduled maintenance in progress — some features may be temporarily unavailable.
      </span>
    </div>
  );
}
