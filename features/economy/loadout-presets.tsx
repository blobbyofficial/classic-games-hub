"use client";

import { useState, useTransition } from "react";
import { Layers, Plus, Trash2, Check, Lock } from "lucide-react";
import { toast } from "sonner";
import { saveLoadoutPreset, applyLoadoutPreset, deleteLoadoutPreset } from "@/actions/economy";
import { useSessionStore } from "@/lib/stores/session-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DeferredSpinner } from "@/components/ui/deferred";
import { cn } from "@/lib/utils";
import type { LoadoutPreset } from "@/services/shop";

/**
 * Saved looks (roadmap v1.5.0, the level-20 milestone). A preset is a snapshot
 * of everything equipped, so switching your whole appearance is one tap rather
 * than five.
 *
 * The slot count comes from the server via `limit` - the level gate is enforced
 * in save_loadout_preset() and is not re-implemented here. This component only
 * decides what to show; it never decides what is allowed.
 */
export function LoadoutPresets({
  presets: initial,
  limit,
  level,
}: {
  presets: LoadoutPreset[];
  limit: number;
  level: number;
}) {
  const [presets, setPresets] = useState(initial);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const [pending, start] = useTransition();
  const patchProfile = useSessionStore((s) => s.patchProfile);

  const full = presets.length >= limit;
  // Only worth explaining the milestone to someone who hasn't passed it.
  const lockedByLevel = full && limit === 1 && level < 20;

  const save = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    start(async () => {
      const res = await saveLoadoutPreset(trimmed);
      if (!res.ok) return void toast.error(res.error ?? "Could not save that preset");
      setPresets((p) => [
        ...p,
        { id: String(res.id ?? crypto.randomUUID()), name: trimmed, equipped: {}, updated_at: new Date().toISOString() },
      ]);
      setName("");
      setNaming(false);
      toast.success(`Saved "${trimmed}"`);
    });
  };

  const apply = (preset: LoadoutPreset) => {
    start(async () => {
      const res = await applyLoadoutPreset(preset.id);
      if (!res.ok) return void toast.error(res.error ?? "Could not apply that preset");
      const equipped = (res.equipped ?? {}) as Record<string, string>;
      patchProfile({ equipped });
      const dropped = typeof res.dropped === "number" ? res.dropped : 0;
      toast.success(
        dropped > 0
          ? `Applied "${preset.name}" - ${dropped} item${dropped === 1 ? "" : "s"} you no longer own were skipped`
          : `Applied "${preset.name}"`,
      );
    });
  };

  const remove = (preset: LoadoutPreset) => {
    start(async () => {
      const res = await deleteLoadoutPreset(preset.id);
      if (!res.ok) return void toast.error(res.error ?? "Could not delete that preset");
      setPresets((p) => p.filter((x) => x.id !== preset.id));
      toast.success(`Deleted "${preset.name}"`);
    });
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
          <Layers className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">Saved looks</h2>
          <p className="text-sm text-muted-foreground">
            Snapshot everything you have equipped and switch back in one tap.
          </p>
        </div>
        <Badge variant="secondary" className="tabular-nums">
          {presets.length}/{limit}
        </Badge>
      </div>

      {presets.length > 0 && (
        <ul className="mb-3 space-y-2">
          {presets.map((preset) => (
            <li
              key={preset.id}
              className="flex items-center gap-2 rounded-xl border border-border/60 px-3 py-2"
            >
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{preset.name}</span>
              <Button size="sm" variant="ghost" disabled={pending} onClick={() => apply(preset)}>
                <Check className="size-4" /> Wear
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label={`Delete ${preset.name}`}
                disabled={pending}
                onClick={() => remove(preset)}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {naming ? (
        <div className="flex items-center gap-2">
          <Input
            autoFocus
            value={name}
            maxLength={32}
            placeholder="Name this look…"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") setNaming(false);
            }}
          />
          <Button disabled={pending || !name.trim()} onClick={save}>
            {pending && <DeferredSpinner />}
            Save
          </Button>
          <Button variant="ghost" onClick={() => setNaming(false)}>
            Cancel
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" disabled={full} onClick={() => setNaming(true)}>
            {full ? <Lock className="size-4" /> : <Plus className="size-4" />}
            Save current look
          </Button>
          {lockedByLevel && (
            <p className={cn("text-sm text-muted-foreground")}>
              Reach level 20 to save up to five looks.
            </p>
          )}
          {full && !lockedByLevel && (
            <p className="text-sm text-muted-foreground">
              All {limit} slots used - delete one to save another.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
