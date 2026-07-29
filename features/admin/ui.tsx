"use client";

import { usePathname } from "next/navigation";
import { AlertCircle, CheckCircle2, Inbox, type LucideIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PAGE_META } from "./nav-items";

/**
 * The pieces every admin page shares.
 *
 * Each page used to open however its author felt that day - a bare paragraph,
 * a search box, a `<h2>` at whatever size. Nothing was wrong individually, but
 * moving between them felt like moving between different products. These are
 * the four shapes that were being reinvented: a page heading, a result line, a
 * Discord-ID field, and an empty state.
 */

/** Result of an action: exactly one of these, never both. */
export type Feedback = { error?: string; message?: string } | null;

export function FeedbackLine({ state }: { state: Feedback }) {
  if (!state) return null;
  const error = Boolean(state.error);
  const Icon = error ? AlertCircle : CheckCircle2;
  return (
    <p
      className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${
        error ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"
      }`}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <span>{error ? state.error : state.message}</span>
    </p>
  );
}

/**
 * The heading for whichever admin page is open.
 *
 * Rendered once in the layout and driven by the route, so a new page gets a
 * consistent header by adding one entry to PAGE_META rather than by
 * remembering to hand-write markup that matches ten other pages.
 */
export function AdminPageHeading() {
  const pathname = usePathname();
  const meta =
    PAGE_META[pathname] ??
    // Nested routes (/admin/users/<id>) fall back to their section.
    PAGE_META[Object.keys(PAGE_META).filter((p) => p !== "/admin" && pathname.startsWith(p))[0] ?? ""];
  if (!meta) return null;

  return (
    <div className="flex items-start gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
        <meta.icon className="size-5" />
      </span>
      <div className="min-w-0">
        <h2 className="text-lg font-bold tracking-tight">{meta.label}</h2>
        <p className="text-sm text-muted-foreground">{meta.description}</p>
      </div>
    </div>
  );
}

/** A Discord snowflake field, with the hint people always need. */
export function IdField({
  id,
  label,
  value,
  onChange,
  hint,
}: {
  id: string;
  label: string;
  value: string | null;
  onChange: (v: string | null) => void;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        inputMode="numeric"
        placeholder="123456789012345678"
        className="font-mono text-sm"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value.trim() || null)}
      />
      <p className="text-xs text-muted-foreground">
        {hint ? `${hint} ` : ""}
        Right-click in Discord → Copy ID (needs Developer Mode).
      </p>
    </div>
  );
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  hint,
}: {
  icon?: LucideIcon;
  title: string;
  hint?: string;
}) {
  return (
    <div className="grid place-items-center rounded-xl border border-dashed border-border py-10 text-center">
      <Icon className="size-6 text-muted-foreground/60" />
      <p className="mt-2 text-sm font-medium">{title}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
