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
 * animated ones are for Discord boosters and staff (locked otherwise - the
 * database enforces the same gate server-side).
 */
export function SiteThemePicker({
  current,
  canUsePremium,
  halloweenAvailable,
}: {
  current: string;
  canUsePremium: boolean;
  halloweenAvailable: boolean;
}) {
  const [selected, setSelected] = useState(current);
  const [pending, start] = useTransition();

  const apply = (id: string, premium: boolean) => {
    if (id === "halloween" && !halloweenAvailable) {
      toast.error("The Halloween theme is only available during October.");
      return;
    }
    if (premium && !canUsePremium) {
      toast.error("Boost the Discord server to unlock premium themes!");
      return;
    }
    if (id === selected || pending) return;
    const previous = selected;
    setSelected(id);
    document.documentElement.setAttribute("data-site-theme", id === "halloween" ? "default" : id);
    if (halloweenAvailable) {
      if (id === "halloween") document.documentElement.setAttribute("data-season", "halloween");
      else document.documentElement.removeAttribute("data-season");
    }
    start(async () => {
      const res = await updateSettings({ site_theme: id });
      if (!res.ok) {
        setSelected(previous);
        document.documentElement.setAttribute("data-site-theme", previous === "halloween" ? "default" : previous);
        if (halloweenAvailable) {
          if (previous === "halloween") document.documentElement.setAttribute("data-season", "halloween");
          else document.documentElement.removeAttribute("data-season");
        }
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
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {SITE_THEMES.filter((t) => t.id !== "halloween" || halloweenAvailable || selected === "halloween").map((t) => {
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
                  {t.id === "halloween" && <span className="ml-1 rounded border border-amber-600/50 px-1 py-0.5 text-[10px] font-normal text-amber-600 dark:text-amber-300">{halloweenAvailable ? "Limited time theme" : "Season ended"}</span>}
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
