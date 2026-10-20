"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, X } from "lucide-react";

const STORAGE_KEY = "cgh:seen-whats-new:v1";

/** A per-browser release announcement, not a claim that individual features were used. */
export function WhatsNewNotice({ version, message, href = "/updates" }: {
  version: string;
  message: string;
  href?: string;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    try { setVisible(window.localStorage.getItem(STORAGE_KEY) !== version); }
    catch { setVisible(false); }
  }, [version]);
  if (!visible) return null;
  const dismiss = () => {
    try { window.localStorage.setItem(STORAGE_KEY, version); } catch { /* ignore */ }
    setVisible(false);
  };
  return (
    <aside aria-label={`What's new in ${version}`} className="relative flex items-start gap-3 rounded-2xl border border-primary/25 bg-primary/5 p-4">
      <Sparkles aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />
      <div className="min-w-0 flex-1 space-y-1 text-sm">
        <p className="font-semibold">What’s new · {version}</p>
        <p className="text-muted-foreground">{message}</p>
        <Link className="inline-flex min-h-8 items-center font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2" href={href}>Read update notes</Link>
      </div>
      <button type="button" aria-label="Dismiss what's new" onClick={dismiss} className="grid size-9 shrink-0 place-items-center rounded-lg hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"><X className="size-4" /></button>
    </aside>
  );
}
