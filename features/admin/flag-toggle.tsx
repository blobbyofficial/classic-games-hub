"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { adminSetFlag } from "@/actions/admin";
import { Switch } from "@/components/ui/switch";
import type { FeatureFlag } from "@/types";

export function FlagToggle({ flag }: { flag: FeatureFlag }) {
  const [enabled, setEnabled] = useState(flag.enabled);
  const [, start] = useTransition();

  const toggle = (v: boolean) => {
    setEnabled(v);
    start(async () => {
      const res = await adminSetFlag(flag.key, v);
      if (!res.ok) {
        toast.error(res.error ?? "Failed");
        setEnabled(!v);
        return;
      }
      toast.success(`${flag.key} ${v ? "enabled" : "disabled"}`);
    });
  };

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border p-3.5">
      <div className="min-w-0">
        <p className="font-mono text-sm font-medium">{flag.key}</p>
        {flag.description && <p className="text-xs text-muted-foreground">{flag.description}</p>}
      </div>
      <Switch checked={enabled} onCheckedChange={toggle} />
    </div>
  );
}
