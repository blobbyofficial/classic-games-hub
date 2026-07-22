"use client";

import { useState, useTransition } from "react";
import { Check, Lock, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { updateSettings } from "@/actions/profile";
import { SITE_THEMES } from "@/lib/themes";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Global site colour theme picker. Free presets for everyone; the premium and
 * animated ones are for Discord boosters and staff (locked otherwise — the
 * database enforces the same gate server-side).
 */
export function SiteThemePicker({
  current,
  canUsePremium,
}: {
  current: string;
  canUsePremium: boolean;
}) {
  const [selected, setSelected] = useState(current);
  const [pending, start] = useTransition();

  const apply = (id: string, premium: boolean) => {
    if (premium && !canUsePremium) {
      toast.error("Boost the Discord server to unlock premium themes!");
      return;
    }
    if (id === selected || pending) return;
    const previous = selected;
    setSelected(id);
    document.documentElement.setAttribute("data-site-theme", id);
    start(async () => {
      const res = await updateSettings({ site_theme: id });
      if (!res.ok) {
        setSelected(previous);
        document.documentElement.setAttribute("data-site-theme", previous);
        toast.error(res.error ?? "Could not save the theme");
      } else {
        toast.success("Site theme updated");
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Site colour theme</CardTitle>
        <CardDescription>
          Recolour the whole site. Premium and animated themes are a perk for Discord server
          boosters and staff.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {SITE_THEMES.map((t) => {
            const locked = t.premium && !canUsePremium;
            const active = selected === t.id;
            return (
              <button
                key={t.id}
                onClick={() => apply(t.id, t.premium)}
                aria-label={`${t.name}${locked ? " (boosters & staff only)" : ""}`}
                aria-pressed={active}
                className={cn(
                  "group relative overflow-hidden rounded-xl border p-2 text-left transition-all",
                  active
                    ? "border-primary ring-2 ring-primary/50"
                    : "border-border hover:border-primary/50",
                  locked && "opacity-80",
                )}
              >
                <span
                  className={cn(
                    "block h-12 w-full rounded-lg",
                    t.animated && "motion-safe:animate-gradient-flow bg-[length:200%_200%]",
                  )}
                  style={{
                    background: t.animated
                      ? `linear-gradient(120deg, ${t.swatch[0]}, ${t.swatch[1]}, ${t.swatch[0]})`
                      : `linear-gradient(150deg, ${t.swatch[0]}, ${t.swatch[1]})`,
                    backgroundSize: t.animated ? "200% 200%" : undefined,
                  }}
                />
                <span className="mt-1.5 flex items-center gap-1 text-xs font-medium">
                  {t.name}
                  {t.animated && <Sparkles className="size-3 text-gold" />}
                </span>
                {active && (
                  <span className="absolute right-1.5 top-1.5 grid size-5 place-items-center rounded-full bg-primary text-primary-foreground">
                    <Check className="size-3" />
                  </span>
                )}
                {locked && (
                  <span className="absolute inset-x-0 top-0 grid h-[3.5rem] place-items-center rounded-t-xl bg-black/45 backdrop-blur-[1px]">
                    <Lock className="size-5 text-white" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {!canUsePremium && (
          <p className="mt-3 text-xs text-muted-foreground">
            🔒 Locked themes unlock while you&rsquo;re boosting our Discord server.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
