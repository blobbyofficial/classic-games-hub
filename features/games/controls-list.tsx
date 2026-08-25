"use client";

import { useEffect, useState } from "react";
import { Keyboard, Hand } from "lucide-react";
import { CONTROL_SCHEME, SWIPE_GAMES } from "@/lib/games/config";
import { useCoarsePointer } from "@/lib/use-coarse-pointer";
import { cn } from "@/lib/utils";

interface ControlEntry {
  keys: string;
  action: string;
}

/** Touch-control descriptions per on-screen scheme. */
const SCHEME_TOUCH: Record<string, ControlEntry[]> = {
  dpad: [{ keys: "On-screen D-pad", action: "Move" }],
  horizontal: [
    { keys: "◀ ▶ buttons", action: "Move" },
    { keys: "Fire button", action: "Shoot" },
  ],
  flap: [{ keys: "Tap anywhere", action: "Jump" }],
  paddle: [{ keys: "Drag on the game", action: "Move the paddle" }],
  vertical: [{ keys: "▲ ▼ buttons", action: "Move" }],
  tetris: [
    { keys: "◀ ▶ buttons", action: "Move piece" },
    { keys: "Rotate button", action: "Rotate" },
    { keys: "Drop button", action: "Hard drop" },
  ],
  thrust: [
    { keys: "◀ ▶ buttons", action: "Rotate ship" },
    { keys: "Thrust button", action: "Accelerate" },
    { keys: "Fire button", action: "Shoot" },
  ],
  none: [{ keys: "Tap / drag", action: "Play directly on the board" }],
};

/** Per-game overrides where the generic scheme text isn't accurate enough. */
const GAME_TOUCH: Record<string, ControlEntry[]> = {
  snake: [{ keys: "Swipe or D-pad", action: "Steer" }],
  slithery: [{ keys: "Swipe or D-pad", action: "Steer" }],
  "2048": [{ keys: "Swipe", action: "Slide all tiles" }],
  slide: [{ keys: "Tap a tile (or swipe)", action: "Slide it into the gap" }],
  frogger: [{ keys: "Swipe or D-pad", action: "Hop" }],
  tetris: [
    { keys: "Swipe left / right", action: "Move piece" },
    { keys: "Swipe up", action: "Rotate" },
    { keys: "Swipe down", action: "Drop" },
  ],
  racer: [
    { keys: "Hold left half", action: "Steer left" },
    { keys: "Hold right half", action: "Steer right" },
    { keys: "Tap after a crash", action: "Restart" },
  ],
  tictactoe: [
    { keys: "Tap a cell", action: "Place your mark" },
    { keys: "VS AI / 2P pill", action: "Switch opponent mode" },
  ],
  connect4: [{ keys: "Tap a column", action: "Drop your disc" }],
  simon: [{ keys: "Tap the pads", action: "Repeat the sequence" }],
  whack: [{ keys: "Tap the moles", action: "Whack!" }],
  bubble: [{ keys: "Tap bubbles", action: "Pop matching groups" }],
  target: [{ keys: "Tap targets", action: "Score before they vanish" }],
  memory: [{ keys: "Tap cards", action: "Flip and match pairs" }],
  mines: [
    { keys: "Tap", action: "Reveal a tile" },
    { keys: "Long-press", action: "Flag a mine" },
  ],
  reversi: [{ keys: "Tap a highlighted cell", action: "Place your disc" }],
  lightsout: [{ keys: "Tap a light", action: "Toggle it and its neighbours" }],
  hangman: [{ keys: "Tap the letters", action: "Guess" }],
  mastermind: [{ keys: "Tap colours", action: "Build and submit your guess" }],
  match3: [{ keys: "Swipe two gems", action: "Swap them" }],
  breakout: [{ keys: "Drag on the game", action: "Move the paddle" }],
  pong: [{ keys: "Drag on your side", action: "Move the paddle" }],
};

function touchControlsFor(engineId: string): ControlEntry[] {
  if (GAME_TOUCH[engineId]) return GAME_TOUCH[engineId];
  const scheme = CONTROL_SCHEME[engineId] ?? "none";
  const base = [...(SCHEME_TOUCH[scheme] ?? SCHEME_TOUCH.none)];
  if (SWIPE_GAMES.has(engineId)) base.unshift({ keys: "Swipe", action: "Move" });
  return base;
}

/**
 * Device-aware controls list (roadmap: "controls should show the controls for
 * the type of device"). Defaults to the detected input; a toggle lets players
 * peek at the other device's controls.
 */
export function ControlsList({
  engineId,
  keyboard,
}: {
  engineId: string;
  keyboard: ControlEntry[];
}) {
  const coarse = useCoarsePointer();
  const [mode, setMode] = useState<"keyboard" | "touch" | null>(null);

  // Follow the detected device until the player explicitly toggles.
  useEffect(() => {
    if (mode === null && coarse !== null) setMode(coarse ? "touch" : "keyboard");
  }, [coarse, mode]);

  const active = mode ?? "keyboard";
  const entries = active === "touch" ? touchControlsFor(engineId) : keyboard;

  return (
    <div className="space-y-3">
      <div className="inline-flex rounded-lg border border-border p-0.5" role="tablist" aria-label="Controls by device">
        {(
          [
            { key: "touch" as const, label: "Touch", icon: Hand },
            { key: "keyboard" as const, label: "Keyboard", icon: Keyboard },
          ]
        ).map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={active === t.key}
            onClick={() => setMode(t.key)}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              active === t.key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <t.icon className="size-3.5" /> {t.label}
          </button>
        ))}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {entries.map((c, i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm"
          >
            <span className="text-muted-foreground">{c.action}</span>
            <kbd className="rounded border border-border bg-muted px-2 py-0.5 text-right font-mono text-xs">
              {c.keys}
            </kbd>
          </div>
        ))}
      </div>
      {active === "touch" && (
        <p className="text-xs text-muted-foreground">
          On-screen buttons appear automatically under the game on touch devices.
        </p>
      )}
    </div>
  );
}
