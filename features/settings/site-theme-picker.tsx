"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { updateSettings } from "@/actions/profile";
import { SITE_THEMES, canUseSiteTheme, type ThemeEntitlements } from "@/lib/themes";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** All five themes with server-backed Premium and Retro unlock status. */
export function SiteThemePicker({
  current,
  halloweenAvailable,
  entitlements,
}: {
  current: string;
  halloweenAvailable: boolean;
  entitlements: ThemeEntitlements;
}) {
  const [selected, setSelected] = useState(canUseSiteTheme(current, entitlements) ? current : "default");
  const [pending, start] = useTransition();

  const apply = (id: string) => {
    if (id === "halloween" && !halloweenAvailable) {
      toast.error("The Halloween theme is only available during October.");
      return;
    }
    if (!canUseSiteTheme(id, entitlements)) {
      toast.error(id === "premium" ? "Boost the Discord server or reach Level 25 to unlock Premium." : "Reach level 25 to unlock Retro.");
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
      try {
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
      } catch {
        // Network/server-action exceptions must undo the optimistic preview.
        setSelected(previous);
        document.documentElement.setAttribute("data-site-theme", previous === "halloween" ? "default" : previous);
        if (halloweenAvailable) {
          if (previous === "halloween") document.documentElement.setAttribute("data-season", "halloween");
          else document.documentElement.removeAttribute("data-season");
        }
        toast.error("Could not save the theme. Please try again.");
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Site colour theme</CardTitle>
        <CardDescription>
          Choose from five designs. Premium is for boosters, staff and Level 25 players; Retro permanently unlocks at level 25. Velvet Red uses a fixed appearance, while the others support Light and Dark.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {SITE_THEMES.filter((t) => t.id !== "halloween" || halloweenAvailable || selected === "halloween").map((t) => {
            const active = selected === t.id;
            const locked = !canUseSiteTheme(t.id, entitlements);
            return (
              <button
                key={t.id}
                onClick={() => apply(t.id)}
                aria-label={locked ? `${t.name}, locked: ${t.id === "premium" ? "requires a Discord server boost or level 25" : "requires level 25"}` : t.name}
                aria-pressed={active}
                disabled={locked || pending}
                title={locked ? (t.id === "premium" ? "Boost the server or reach level 25" : "Unlock at level 25") : undefined}
                className={cn(
                  "group relative overflow-hidden rounded-xl border p-2 text-left transition-all",
                  active
                    ? "border-primary ring-2 ring-primary/50"
                    : "border-border hover:border-primary/50",
                  locked && "cursor-not-allowed opacity-65",
                )}
              >
                {t.id === "premium" ? (
                  <span aria-hidden="true" className="flex h-12 flex-col overflow-hidden rounded-lg border border-[#aa9677] bg-[#0c1018] p-1.5">
                    <span className="mb-1 flex items-center justify-between">
                      <span className="h-1 w-12 rounded-full bg-[#c9ab7d]" />
                      <span className="h-1 w-1 rounded-full bg-[#b5beca]" />
                    </span>
                    <span className="flex min-h-0 flex-1 gap-1">
                      <span className="w-1/4 rounded-sm bg-[#202937]" />
                      <span className="flex flex-1 flex-col justify-between rounded-sm border border-[#384455] bg-[#161d27] p-1">
                        <span className="h-1 w-1/2 rounded-full bg-[#b5beca]" />
                        <span className="h-1.5 w-2/5 rounded-sm bg-[#c9ab7d]" />
                      </span>
                    </span>
                  </span>
                ) : t.id === "retro" ? (
                  <span aria-hidden="true" className="flex h-12 flex-col overflow-hidden rounded-sm border-[3px] border-[#678d71] bg-[#101715] p-1">
                    <span className="mb-1 h-1 w-3/4 bg-[#f2ce81]" />
                    <span className="flex min-h-0 flex-1 gap-1">
                      <span className="w-1/4 border border-[#678d71] bg-[#293c31]" />
                      <span className="flex flex-1 flex-col border border-[#678d71] bg-[#182720] p-1">
                        <span className="h-1 w-2/3 bg-[#8bebb6]" />
                        <span className="mt-auto h-1.5 w-1/2 bg-[#f2ce81]" />
                      </span>
                    </span>
                  </span>
                ) : t.id === "red" ? (
                  <span aria-hidden="true" className="flex h-12 w-full flex-col overflow-hidden rounded-lg border border-[#614a52] bg-[#161214] p-1.5">
                    <span className="mb-1 flex h-1.5 items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#d77b82]" />
                      <span className="h-1 w-8 rounded-full bg-[#72505b]" />
                      <span className="ml-auto h-1 w-3 rounded-full bg-[#574149]" />
                    </span>
                    <span className="flex min-h-0 flex-1 gap-1">
                      <span className="w-1/4 rounded-sm bg-[#30252a]" />
                      <span className="flex flex-1 flex-col justify-between rounded-sm border border-[#554149] bg-[#211a1e] p-1">
                        <span className="h-1 w-3/5 rounded-full bg-[#9a747d]" />
                        <span className="h-1.5 w-2/5 rounded-sm bg-[#d77b82]" />
                      </span>
                    </span>
                  </span>
                ) : (
                  <span
                    className="block h-12 w-full rounded-lg"
                    style={{ background: `linear-gradient(150deg, ${t.swatch[0]}, ${t.swatch[1]})` }}
                  />
                )}
                <span className="mt-1.5 flex items-center gap-1 text-xs font-medium">
                  {t.name}
                  {locked && <span className="ml-1 text-[10px] text-muted-foreground">{t.id === "premium" ? "Booster / Level 25" : "Level 25"}</span>}
                  {t.id === "halloween" && <span className="ml-1 rounded border border-amber-600/50 px-1 py-0.5 text-[10px] font-normal text-amber-600 dark:text-amber-300">{halloweenAvailable ? "Limited time theme" : "Season ended"}</span>}
                </span>
                {active && (
                  <span className="absolute right-1.5 top-1.5 grid size-5 place-items-center rounded-full bg-primary text-primary-foreground">
                    <Check className="size-3" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
