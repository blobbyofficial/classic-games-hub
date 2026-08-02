"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw, Maximize2, Minimize2, Loader2, Trophy } from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { ENGINE_LOADERS } from "@/lib/games/registry";
import { canvasFor, CONTROL_SCHEME, SWIPE_GAMES } from "@/lib/games/config";
import { useCoarsePointer } from "@/lib/use-coarse-pointer";
import { submitScore } from "@/actions/games";
import { useSessionStore } from "@/lib/stores/session-store";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/utils";
import { TouchControls } from "./touch-controls";
import { RewardOverlay } from "./reward-overlay";
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
  const shellRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<GameEngineHandle | null>(null);
  const startTimeRef = useRef(0);
  const submittingRef = useRef(false);
  const { resolvedTheme } = useTheme();

  const setCredits = useSessionStore((s) => s.setCredits);
  const profile = useSessionStore((s) => s.profile);

  const [score, setScore] = useState(0);
  const [best, setBest] = useState(bestScore);
  const [status, setStatus] = useState("");
  const [paused, setPaused] = useState(false);
  const [loadingEngine, setLoadingEngine] = useState(true);
  const [gameOver, setGameOver] = useState(false);
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const { w, h } = canvasFor(engineId);
  const scheme = CONTROL_SCHEME[engineId] ?? "none";
  const coarse = useCoarsePointer();

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

      setSubmitting(true);
      const res = await submitScore(slug, finalScore, duration);
      setResult(res);
      setSubmitting(false);
      if (res.ok && res.credits_earned && profile) {
        setCredits(profile.credits + res.credits_earned);
      }
      submittingRef.current = false;
    },
    [best, isAuthed, profile, setCredits, slug],
  );

  // (Re)build the engine. Also re-runs on theme change so palettes update.
  const buildEngine = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    handleRef.current?.destroy();
    setLoadingEngine(true);
    setGameOver(false);
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
      // Render at device resolution (capped 2×) for crisp HiDPI/fullscreen
      // output; engines keep working in logical w×h coordinates.
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.getContext("2d")?.setTransform(dpr, 0, 0, dpr, 0, 0);
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

  // Swipe-to-move on the canvas for grid/directional games - dispatched as
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

  // Fullscreen wraps the whole shell (stage + HUD + touch controls) so the
  // experience stays complete on every device.
  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {});
    } else {
      shellRef.current?.requestFullscreen?.().catch(() => {});
    }
  };

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // Auto-pause when the tab is hidden mid-run.
  useEffect(() => {
    const onVis = () => {
      if (document.hidden && !gameOver && !paused && handleRef.current) {
        handleRef.current.pause();
        setPaused(true);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [gameOver, paused]);

  return (
    <div
      ref={shellRef}
      className={
        isFullscreen
          ? "game-shell-fs flex h-full w-full flex-col items-center justify-center gap-3 overflow-hidden p-3 sm:p-6"
          : "space-y-3 overscroll-contain [padding-bottom:env(safe-area-inset-bottom)]"
      }
    >
      <div className={`flex items-center justify-between gap-3 ${isFullscreen ? "w-full max-w-3xl" : ""}`}>
        <div className="flex items-center gap-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Score
            </p>
            <p className="text-2xl font-bold tnum leading-tight">{formatNumber(score)}</p>
          </div>
          <div className="border-l border-border pl-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Best
            </p>
            <p className="flex items-center gap-1 text-2xl font-bold tnum leading-tight text-gold">
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
          <Button
            variant="outline"
            size="icon"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize2 /> : <Maximize2 />}
          </Button>
        </div>
      </div>

      <div
        className={`game-stage relative mx-auto w-full select-none overflow-hidden rounded-2xl border border-border bg-card shadow-lg ${
          isFullscreen ? "min-h-0 flex-1" : ""
        }`}
        style={
          isFullscreen
            ? { maxWidth: `min(100%, calc((100vh - 170px) * ${w} / ${h}))`, aspectRatio: `${w} / ${h}` }
            : { maxWidth: `min(100%, ${w * 1.1}px)`, aspectRatio: `${w} / ${h}` }
        }
      >
        <canvas ref={canvasRef} width={w} height={h} className="block size-full touch-none object-contain" />

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

        {gameOver && <RewardOverlay score={score} result={result} loading={submitting} onReplay={replay} />}
      </div>

      {/* Touch controls for touch devices; keyboard hints for pointer devices. */}
      {coarse === true && (
        <div className={isFullscreen ? "w-full max-w-3xl" : undefined}>
          <TouchControls scheme={scheme} />
        </div>
      )}

      {coarse === false && (
        <p className="text-center text-xs text-muted-foreground">
          Tip: press <kbd className="rounded border border-border bg-muted px-1">P</kbd> to pause ·{" "}
          <kbd className="rounded border border-border bg-muted px-1">R</kbd> to restart in most games
        </p>
      )}
    </div>
  );
}
