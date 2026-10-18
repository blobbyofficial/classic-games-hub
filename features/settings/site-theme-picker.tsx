"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { updateSettings } from "@/actions/profile";
import { SITE_THEMES } from "@/lib/themes";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** Free Basic, seasonal Halloween, and fixed-mode Red. */
export function SiteThemePicker({
  current,
  halloweenAvailable,
}: {
  current: string;
  halloweenAvailable: boolean;
}) {
  const [selected, setSelected] = useState(SITE_THEMES.some(t => t.id === current) ? current : "default");
  const [pending, start] = useTransition();

  const apply = (id: string) => {
    if (id === "halloween" && !halloweenAvailable) {
      toast.error("The Halloween theme is only available during October.");
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
          Choose Basic, seasonal Halloween or Velvet Red. Red has one carefully balanced appearance and ignores the Light/Dark preference until you switch away.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {SITE_THEMES.filter((t) => t.id !== "halloween" || halloweenAvailable || selected === "halloween").map((t) => {
            const active = selected === t.id;
            return (
              <button
                key={t.id}
                onClick={() => apply(t.id)}
                aria-label={t.name}
                aria-pressed={active}
                className={cn(
                  "group relative overflow-hidden rounded-xl border p-2 text-left transition-all",
                  active
                    ? "border-primary ring-2 ring-primary/50"
                    : "border-border hover:border-primary/50",
                )}
              >
                <span
                  className={cn(
                    "block h-12 w-full rounded-lg",
                  )}
                  style={{
                    background: `linear-gradient(150deg, ${t.swatch[0]}, ${t.swatch[1]})`,
                  }}
                />
                <span className="mt-1.5 flex items-center gap-1 text-xs font-medium">
                  {t.name}
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
