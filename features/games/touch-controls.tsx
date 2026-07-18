"use client";

import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Circle } from "lucide-react";
import type { ControlScheme } from "@/lib/games/config";

/** Dispatch a synthetic key event to the window so engines react uniformly. */
function key(k: string, type: "keydown" | "keyup" = "keydown") {
  window.dispatchEvent(new KeyboardEvent(type, { key: k, bubbles: true }));
}

function Pad({ k, children, label }: { k: string; children: React.ReactNode; label: string }) {
  return (
    <button
      aria-label={label}
      onPointerDown={(e) => {
        e.preventDefault();
        key(k, "keydown");
      }}
      onPointerUp={() => key(k, "keyup")}
      onPointerLeave={() => key(k, "keyup")}
      className="grid size-14 touch-none select-none place-items-center rounded-xl border border-border bg-card/80 text-foreground shadow-sm active:scale-95 active:bg-accent"
    >
      {children}
    </button>
  );
}

export function TouchControls({ scheme }: { scheme: ControlScheme }) {
  if (scheme === "none") return null;

  return (
    <div className="mt-4 flex items-center justify-between gap-4 lg:hidden">
      {scheme === "dpad" && (
        <div className="grid grid-cols-3 grid-rows-2 gap-1.5">
          <div />
          <Pad k="ArrowUp" label="Up">
            <ArrowUp />
          </Pad>
          <div />
          <Pad k="ArrowLeft" label="Left">
            <ArrowLeft />
          </Pad>
          <Pad k="ArrowDown" label="Down">
            <ArrowDown />
          </Pad>
          <Pad k="ArrowRight" label="Right">
            <ArrowRight />
          </Pad>
        </div>
      )}

      {scheme === "horizontal" && (
        <div className="flex w-full items-center justify-between">
          <div className="flex gap-2">
            <Pad k="ArrowLeft" label="Left">
              <ArrowLeft />
            </Pad>
            <Pad k="ArrowRight" label="Right">
              <ArrowRight />
            </Pad>
          </div>
          <Pad k=" " label="Fire">
            <Circle className="fill-current" />
          </Pad>
        </div>
      )}

      {scheme === "paddle" && (
        <div className="flex w-full items-center justify-between">
          <div className="flex gap-2">
            <Pad k="ArrowLeft" label="Left">
              <ArrowLeft />
            </Pad>
            <Pad k="ArrowRight" label="Right">
              <ArrowRight />
            </Pad>
          </div>
          <Pad k=" " label="Launch">
            <Circle className="fill-current" />
          </Pad>
        </div>
      )}

      {scheme === "flap" && (
        <button
          aria-label="Jump"
          onPointerDown={(e) => {
            e.preventDefault();
            key(" ");
          }}
          className="h-16 flex-1 touch-none select-none rounded-2xl border border-border bg-primary/15 text-lg font-semibold text-primary active:scale-95"
        >
          Tap to jump
        </button>
      )}
    </div>
  );
}
