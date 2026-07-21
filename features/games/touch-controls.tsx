"use client";

import {
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Circle,
  RotateCw,
  RotateCcw,
  ChevronsDown,
} from "lucide-react";
import type { ControlScheme } from "@/lib/games/config";

/** Dispatch a synthetic key event to the window so engines react uniformly. */
function key(k: string, type: "keydown" | "keyup" = "keydown") {
  window.dispatchEvent(new KeyboardEvent(type, { key: k, bubbles: true }));
}

function Pad({
  k,
  children,
  label,
  big,
  tap,
}: {
  k: string;
  children: React.ReactNode;
  label: string;
  big?: boolean;
  tap?: boolean;
}) {
  return (
    <button
      aria-label={label}
      onPointerDown={(e) => {
        e.preventDefault();
        key(k, "keydown");
        if (tap) key(k, "keyup");
      }}
      onPointerUp={() => !tap && key(k, "keyup")}
      onPointerLeave={() => !tap && key(k, "keyup")}
      onContextMenu={(e) => e.preventDefault()}
      className={`grid ${
        big ? "size-16" : "size-14"
      } touch-none select-none place-items-center rounded-xl border border-border bg-card/80 text-foreground shadow-sm active:scale-95 active:bg-accent [&_svg]:size-6`}
    >
      {children}
    </button>
  );
}

export function TouchControls({ scheme }: { scheme: ControlScheme }) {
  if (scheme === "none") return null;

  return (
    <div className="mt-4 flex items-center justify-between gap-4">
      {scheme === "dpad" && (
        <div className="mx-auto grid grid-cols-3 grid-rows-2 gap-1.5">
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

      {scheme === "vertical" && (
        <div className="flex w-full items-center justify-between">
          <div className="flex gap-2">
            <Pad k="ArrowUp" label="Up" big>
              <ArrowUp />
            </Pad>
            <Pad k="ArrowDown" label="Down" big>
              <ArrowDown />
            </Pad>
          </div>
          <div className="flex gap-2">
            <Pad k="ArrowUp" label="Up" big>
              <ArrowUp />
            </Pad>
            <Pad k="ArrowDown" label="Down" big>
              <ArrowDown />
            </Pad>
          </div>
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

      {scheme === "tetris" && (
        <div className="flex w-full items-center justify-between">
          <div className="flex gap-2">
            <Pad k="ArrowLeft" label="Move left">
              <ArrowLeft />
            </Pad>
            <Pad k="ArrowRight" label="Move right">
              <ArrowRight />
            </Pad>
          </div>
          <div className="flex gap-2">
            <Pad k="ArrowDown" label="Soft drop">
              <ArrowDown />
            </Pad>
            <Pad k="ArrowUp" label="Rotate" tap>
              <RotateCw />
            </Pad>
            <Pad k=" " label="Hard drop" tap big>
              <ChevronsDown />
            </Pad>
          </div>
        </div>
      )}

      {scheme === "thrust" && (
        <div className="flex w-full items-center justify-between">
          <div className="flex gap-2">
            <Pad k="ArrowLeft" label="Rotate left">
              <RotateCcw />
            </Pad>
            <Pad k="ArrowRight" label="Rotate right">
              <RotateCw />
            </Pad>
          </div>
          <div className="flex gap-2">
            <Pad k="ArrowUp" label="Thrust" big>
              <ArrowUp />
            </Pad>
            <Pad k=" " label="Fire" big>
              <Circle className="fill-current" />
            </Pad>
          </div>
        </div>
      )}

      {scheme === "flap" && (
        <button
          aria-label="Jump"
          onPointerDown={(e) => {
            e.preventDefault();
            key(" ");
          }}
          onPointerUp={() => key(" ", "keyup")}
          onContextMenu={(e) => e.preventDefault()}
          className="h-16 flex-1 touch-none select-none rounded-2xl border border-border bg-primary/15 text-lg font-semibold text-primary active:scale-95"
        >
          Tap to jump
        </button>
      )}
    </div>
  );
}
