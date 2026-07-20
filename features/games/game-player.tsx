"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw, Maximize2, Loader2, Trophy } from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { ENGINE_LOADERS } from "@/lib/games/registry";
import { canvasFor, CONTROL_SCHEME, SWIPE_GAMES } from "@/lib/games/config";
import { submitScore } from "@/actions/games";
import { useSessionStore } from "@/lib/stores/session-store";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/utils";
import { TouchControls } from "./touch-controls";
import { RewardOverlay, SimulatedAd } from "./reward-overlay";
import type { GameEngineHandle, ScoreResult } from "@/types";

interface Props {
  slug: string;
  engineId: string;
  title: string;
  bestScore: number;
  isAuthed: boolean;
}

export function GamePlayer({ slug, engineId, title, bestScore, isAuthed }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handleRef = useRef<GameEngineHandle | null>(null);
  const startTimeRef = useRef(0);
  const submittingRef = useRef(false);
  const { resolvedTheme } = useTheme();

  const setCredits = useSessionStore((s) => s.setCredits);
  const profile = useSessionStore((s) => s.profile);
  const adsEnabled = useSessionStore((s) => s.settings?.ads_enabled ?? false);

  const [score, setScore] = useState(0);
  const [best, setBest] = useState(bestScore);
  const [status, setStatus] = useState("");
  const [paused, setPaused] = useState(false);
  const [loadingEngine, setLoadingEngine] = useState(true);
  const [gameOver, setGameOver] = useState(false);
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showAd, setShowAd] = useState(false);

  const { w, h } = canvasFor(engineId);
  const scheme = CONTROL_SCHEME[engineId] ?? "none";

  const handleGameOver = useCallback(
    async (finalScore: number, durationHint: number) => {
      if (submittingRef.current) return;
      submittingRef.current = true;
      const duration = durationHint || Math.round((Date.now() - startTimeRef.current) / 1000);
      setGameOver(true);
      if (finalScore > best) setBest(finalScore);

      if (!isAuthed) {
        setResult({ ok: false, error: "Log in to save scores and earn rewards" });
        submittingRef.current = false;
        return;
      }

      // Occasionally show a (simulated) rewarded ad when the player opted in.
      const wantsAd = adsEnabled && Math.random() < 0.34 && finalScore > 0;
      if (wantsAd) setShowAd(true);

      setSubmitting(true);
      const res = await submitScore(slug, finalScore, duration);
      setResult(res);
      setSubmitting(false);
      if (res.ok && res.credits_earned && profile) {
        setCredits(profile.credits + res.credits_earned);
      }
      submittingRef.current = false;
    },
    [adsEnabled, best, isAuthed, profile, setCredits, slug],
  );

  // (Re)build the engine. Also re-runs on theme change so palettes update.
  const buildEngine = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    handleRef.current?.destroy();
    setLoadingEngine(true);
    setGameOver(false);
    setShowAd(false);
    setResult(null);
    setScore(0);
    setPaused(false);
    submittingRef.current = false;
    startTimeRef.current = Date.now();

    const loader = ENGINE_LOADERS[engineId];
    if (!loader) {
      setStatus("This game is coming soon.");
      setLoadingEngine(false);
      return;
    }

    loader().then(({ default: factory }) => {
      if (!canvasRef.current) return;
      const reduced =
        typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      handleRef.current = factory({
        canvas,
        width: w,
        height: h,
        reducedMotion: reduced,
        onScore: setScore,
        onStatus: setStatus,
        onGameOver: (s, d) => void handleGameOver(s, d),
      });
      setLoadingEngine(false);
    });
  }, [engineId, w, h, handleGameOver]);

  useEffect(() => {
    buildEngine();
    return () => handleRef.current?.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engineId, resolvedTheme]);

  // Pause with P / Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "p" || e.key === "P" || e.key === "Escape") && !gameOver) {
        e.preventDefault();
        togglePause();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameOver]);

  // Swipe-to-move on the canvas for grid/directional games — dispatched as
  // arrow keys so engines handle them the same as a keyboard or D-pad.
  useEffect(() => {
    if (!SWIPE_GAMES.has(engineId)) return;
    const el = canvasRef.current;
    if (!el) return;
    const THRESHOLD = 24;
    let sx = 0;
    let sy = 0;
    let tracking = false;

    const onDown = (e: PointerEvent) => {
      tracking = true;
      sx = e.clientX;
      sy = e.clientY;
    };
    const onUp = (e: PointerEvent) => {
      if (!tracking) return;
      tracking = false;
      const dx = e.clientX - sx;
      const dy = e.clientY - sy;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < THRESHOLD) return;
      const k =
        Math.abs(dx) > Math.abs(dy)
          ? dx > 0
            ? "ArrowRight"
            : "ArrowLeft"
          : dy > 0
            ? "ArrowDown"
            : "ArrowUp";
      window.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true }));
      window.dispatchEvent(new KeyboardEvent("keyup", { key: k, bubbles: true }));
    };
    const onCancel = () => {
      tracking = false;
    };

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onCancel);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onCancel);
    };
  }, [engineId]);

  const togglePause = () => {
    if (!handleRef.current) return;
    setPaused((p) => {
      const next = !p;
      next ? handleRef.current!.pause() : handleRef.current!.resume();
      return next;
    });
  };

  const replay = () => buildEngine();

  const fullscreen = () => {
    canvasRef.current?.parentElement?.requestFullscreen?.().catch(() => {});
  };

  return (
    <div className="space-y-3 overscroll-contain [padding-bottom:env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Score</p>
            <p className="text-2xl font-bold tabular-nums">{formatNumber(score)}</p>
          </div>
          <div className="border-l border-border pl-4">
            <p className="text-xs text-muted-foreground">Best</p>
            <p className="flex items-center gap-1 text-2xl font-bold tabular-nums text-gold">
              <Trophy className="size-4" /> {formatNumber(best)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="icon" onClick={togglePause} disabled={gameOver} aria-label={paused ? "Resume" : "Pause"}>
            {paused ? <Play /> : <Pause />}
          </Button>
          <Button variant="outline" size="icon" onClick={replay} aria-label="Restart">
            <RotateCcw />
          </Button>
          <Button variant="outline" size="icon" onClick={fullscreen} aria-label="Fullscreen" className="hidden sm:inline-flex">
            <Maximize2 />
          </Button>
        </div>
      </div>

      <div
        className="relative mx-auto w-full select-none overflow-hidden rounded-2xl border border-border bg-card shadow-lg"
        style={{ maxWidth: `min(100%, ${w * 1.1}px)`, aspectRatio: `${w} / ${h}` }}
      >
        <canvas ref={canvasRef} width={w} height={h} className="block size-full touch-none" />

        {loadingEngine && (
          <div className="absolute inset-0 grid place-items-center bg-card">
            <Loader2 className="size-8 animate-spin text-primary" />
          </div>
        )}

        {status && !gameOver && !loadingEngine && (
          <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center">
            <span className="rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
              {status}
            </span>
          </div>
        )}

        {paused && !gameOver && (
          <button
            onClick={togglePause}
            className="absolute inset-0 z-10 grid place-items-center bg-black/60 backdrop-blur-sm"
          >
            <div className="text-center text-white">
              <Pause className="mx-auto size-10" />
              <p className="mt-2 font-semibold">Paused</p>
              <p className="text-xs opacity-70">Press P or tap to resume</p>
            </div>
          </button>
        )}

        {gameOver && showAd && (
          <SimulatedAd onDone={() => setShowAd(false)} onSkip={() => setShowAd(false)} />
        )}

        {gameOver && !showAd && (
          <RewardOverlay score={score} result={result} loading={submitting} onReplay={replay} />
        )}
      </div>

      <TouchControls scheme={scheme} />

      <p className="text-center text-xs text-muted-foreground">
        Tip: press <kbd className="rounded border border-border bg-muted px-1">P</kbd> to pause ·{" "}
        <kbd className="rounded border border-border bg-muted px-1">R</kbd> to restart in most games
      </p>
    </div>
  );
}
