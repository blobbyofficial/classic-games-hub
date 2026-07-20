"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BannerConfig, BannerVariant } from "@/types";

const VARIANT_STYLES: Record<BannerVariant, string> = {
  info: "border-primary/30 bg-primary/10 text-primary",
  success: "border-success/30 bg-success/10 text-success",
  warning:
    "border-warning/30 bg-warning/10 text-[oklch(0.5_0.15_75)] dark:text-warning",
  promo:
    "border-transparent bg-[linear-gradient(120deg,var(--primary),oklch(0.6_0.2_330))] text-white",
};

const STORAGE_KEY = "cgh:site-banner-dismissed";

export function SiteBanner({ config }: { config: BannerConfig }) {
  // Dismiss is keyed by the message so editing the banner re-shows it.
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(STORAGE_KEY) === config.message);
    } catch {
      setDismissed(false);
    }
  }, [config.message]);

  if (dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(STORAGE_KEY, config.message);
    } catch {
      /* ignore storage errors (private mode, etc.) */
    }
  };

  const isExternal = config.linkHref?.startsWith("http");

  return (
    <div
      className={cn(
        "flex items-center gap-3 border-b px-4 py-2 text-center text-sm font-medium",
        VARIANT_STYLES[config.variant],
      )}
    >
      <span className="flex min-w-0 flex-1 flex-wrap items-center justify-center gap-x-2 gap-y-1">
        <span>{config.message}</span>
        {config.linkHref && config.linkLabel && (
          <Link
            href={config.linkHref}
            {...(isExternal ? { target: "_blank", rel: "noreferrer" } : {})}
            className="whitespace-nowrap font-semibold underline underline-offset-2 hover:no-underline"
          >
            {config.linkLabel}
          </Link>
        )}
      </span>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss banner"
        className="shrink-0 rounded-md p-0.5 opacity-70 transition hover:bg-current/10 hover:opacity-100"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
