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
import { useEffect, useRef } from "react";
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
  const activePointer = useRef<number | null>(null);
  const keyboardHeld = useRef(false);
  useEffect(() => {
    const clearHeld = () => {
      if ((activePointer.current !== null || keyboardHeld.current) && !tap) key(k, "keyup");
      activePointer.current = null;
      keyboardHeld.current = false;
    };
    const onVisibility = () => { if (document.hidden) clearHeld(); };
    window.addEventListener("blur", clearHeld);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearHeld();
      window.removeEventListener("blur", clearHeld);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [k, tap]);
  const release = (pointerId: number) => {
    if (activePointer.current !== pointerId) return;
    activePointer.current = null;
    if (!tap) key(k, "keyup");
  };
  return (
    <button
      type="button"
      aria-label={label}
      onKeyDown={(e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        if (keyboardHeld.current || e.repeat) return;
        keyboardHeld.current = true;
        key(k, "keydown");
        if (tap) key(k, "keyup");
      }}
      onKeyUp={(e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        if (!keyboardHeld.current) return;
        keyboardHeld.current = false;
        if (!tap) key(k, "keyup");
      }}
      onBlur={() => {
        if (!keyboardHeld.current) return;
        keyboardHeld.current = false;
        if (!tap) key(k, "keyup");
      }}
      onPointerDown={(e) => {
        e.preventDefault();
        if (activePointer.current !== null) return;
        activePointer.current = e.pointerId;
        e.currentTarget.setPointerCapture(e.pointerId);
        key(k, "keydown");
        if (tap) key(k, "keyup");
      }}
      onPointerUp={(e) => release(e.pointerId)}
      onPointerCancel={(e) => release(e.pointerId)}
      onLostPointerCapture={(e) => release(e.pointerId)}
      onClick={(e) => {
        // Assistive technology can activate a native button with a virtual click
        // but without pointer or keyboard events. Do not double-activate taps.
        if (e.detail !== 0) return;
        key(k, "keydown");
        key(k, "keyup");
      }}
      onContextMenu={(e) => e.preventDefault()}
      className={`grid ${
        big ? "size-16" : "size-14"
      } touch-none select-none place-items-center rounded-xl border border-border bg-card/80 text-foreground shadow-sm motion-safe:active:scale-95 active:bg-accent [&_svg]:size-6`}
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
        <div className="w-full flex justify-center">
          <Pad k=" " label="Jump" tap big><span className="text-sm font-semibold">Tap to jump</span></Pad>
        </div>
      )}
    </div>
  );
}
