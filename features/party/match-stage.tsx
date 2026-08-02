"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, LogOut, Medal, Swords, Trophy, WifiOff } from "lucide-react";
import { ENGINE_LOADERS } from "@/lib/games/registry";
import { canvasFor } from "@/lib/games/config";
import { submitScore } from "@/actions/games";
import { useSessionStore } from "@/lib/stores/session-store";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/avatar";
import { formatNumber } from "@/lib/utils";
import { COUNTDOWN_MS, type MatchConfig, type PartyEvent, type RaceEntry } from "@/lib/party/protocol";
import type { GameEngineHandle, MatchOutcome, PartyMember, ScoreResult } from "@/types";

/** Don't flood the channel with every point scored in a fast arcade game. */
const SCORE_BROADCAST_MS = 700;

interface Props {
  config: MatchConfig;
  me: string;
  members: PartyMember[];
  present: Set<string>;
  send: (event: PartyEvent) => void;
  subscribe: (handler: (event: PartyEvent) => void) => () => void;
  onExit: () => void;
}

export function MatchStage({ config, me, members, present, send, subscribe, onExit }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handleRef = useRef<GameEngineHandle | null>(null);
  const startedAtRef = useRef(0);
  const lastBroadcast = useRef(0);
  const submittedRef = useRef(false);

  const profile = useSessionStore((s) => s.profile);
  const setCredits = useSessionStore((s) => s.setCredits);

  const [now, setNow] = useState(() => Date.now());
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState("");
  const [outcome, setOutcome] = useState<MatchOutcome | null>(null);
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [standings, setStandings] = useState<Record<string, RaceEntry>>(() =>
    Object.fromEntries(config.players.map((id) => [id, { userId: id, score: 0, finished: false }])),
  );

  // The leader's clock decides when play begins, but clocks differ between
  // machines - clamping means a skewed one costs a moment, never the match.
  const [startAt] = useState(() => {
    const t = Date.now();
    return Math.min(Math.max(config.startAt, t), t + COUNTDOWN_MS);
  });

  const { w, h } = canvasFor(config.engineId);
  const msLeft = startAt - now;
  const started = msLeft <= 0;
  const isVersus = config.mode === "versus";
  const opponentId = isVersus ? config.players.find((id) => id !== me) : undefined;
  const opponentGone = Boolean(opponentId && !present.has(opponentId));

  const nameOf = useCallback(
    (id: string) => {
      const m = members.find((x) => x.user_id === id);
      return m?.display_name ?? m?.username ?? "Player";
    },
    [members],
  );

  // Countdown tick. It stops as soon as the match is under way.
  useEffect(() => {
    if (started) return;
    const t = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(t);
  }, [started]);

  const finishRun = useCallback(
    async (finalScore: number, duration: number) => {
      if (submittedRef.current) return;
      submittedRef.current = true;
      setStandings((prev) => ({ ...prev, [me]: { userId: me, score: finalScore, finished: true } }));
      send({ type: "match:finish", matchId: config.matchId, userId: me, score: finalScore });

      // Party play earns exactly what a solo run of the same game earns -
      // same RPC, same anti-farming rules.
      const res = await submitScore(config.gameSlug, finalScore, duration);
      setResult(res);
      if (res.ok && res.credits_earned && profile) setCredits(profile.credits + res.credits_earned);
    },
    [config.gameSlug, config.matchId, me, profile, send, setCredits],
  );

  // Build the engine the moment the countdown ends.
  useEffect(() => {
    if (!started) return;
    const loader = ENGINE_LOADERS[config.engineId];
    if (!loader) {
      setStatus("This game can't be played in a party yet.");
      setLoading(false);
      return;
    }

    let disposed = false;
    startedAtRef.current = Date.now();

    void loader().then(({ default: factory }) => {
      const canvas = canvasRef.current;
      if (disposed || !canvas) return;

      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.getContext("2d")?.setTransform(dpr, 0, 0, dpr, 0, 0);

      handleRef.current = factory({
        canvas,
        width: w,
        height: h,
        reducedMotion: reduced,
        onStatus: setStatus,
        onScore: (s) => {
          setScore(s);
          setStandings((prev) => ({ ...prev, [me]: { userId: me, score: s, finished: prev[me]?.finished ?? false } }));
          const t = Date.now();
          if (!isVersus && t - lastBroadcast.current > SCORE_BROADCAST_MS) {
            lastBroadcast.current = t;
            send({ type: "match:score", matchId: config.matchId, userId: me, score: s });
          }
        },
        onGameOver: (s, d) => {
          void finishRun(s, d || Math.round((Date.now() - startedAtRef.current) / 1000));
        },
        // Head-to-head wiring. Its presence is what puts the engine into
        // online mode - no AI, no local pass-and-play.
        net: isVersus
          ? {
              seat: config.seats[me] ?? 1,
              opponentName: opponentId ? nameOf(opponentId) : "Opponent",
              send: (move) => send({ type: "match:move", matchId: config.matchId, from: me, move }),
              onResult: setOutcome,
            }
          : undefined,
      });
      setLoading(false);
    });

    return () => {
      disposed = true;
      handleRef.current?.destroy();
      handleRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, config.matchId]);

  // Opponent moves and everyone else's scores.
  useEffect(
    () =>
      subscribe((event) => {
        if ("matchId" in event && event.matchId !== config.matchId) return;
        if (event.type === "match:move" && event.from !== me) {
          handleRef.current?.applyRemoteMove?.(event.move);
        } else if (event.type === "match:score") {
          setStandings((prev) => ({
            ...prev,
            [event.userId]: {
              userId: event.userId,
              score: event.score,
              finished: prev[event.userId]?.finished ?? false,
            },
          }));
        } else if (event.type === "match:finish") {
          setStandings((prev) => ({
            ...prev,
            [event.userId]: { userId: event.userId, score: event.score, finished: true },
          }));
        }
      }),
    [subscribe, config.matchId, me],
  );

  const rows = config.players
    .map((id) => standings[id] ?? { userId: id, score: 0, finished: false })
    .sort((a, b) => b.score - a.score);
  const everyoneDone = rows.every((r) => r.finished);
  const iFinished = standings[me]?.finished ?? false;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
            {isVersus ? <Swords className="size-5" /> : <Trophy className="size-5" />}
          </span>
          <div>
            <h1 className="font-bold leading-tight">{config.title}</h1>
            <p className="text-xs text-muted-foreground">
              {isVersus ? `You vs ${opponentId ? nameOf(opponentId) : "opponent"}` : `Score race · ${config.players.length} players`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {!isVersus && (
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Score</p>
              <p className="text-xl font-bold tabular-nums">{formatNumber(score)}</p>
            </div>
          )}
          <Button variant="outline" size="sm" onClick={onExit}>
            <LogOut /> Lobby
          </Button>
        </div>
      </div>

      {opponentGone && !outcome && (
        <p className="flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-600 dark:text-amber-400">
          <WifiOff className="size-4" /> {opponentId ? nameOf(opponentId) : "Your opponent"} left the match.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
        <div
          className="game-stage relative mx-auto w-full select-none overflow-hidden rounded-2xl border border-border bg-card shadow-lg"
          style={{ maxWidth: `min(100%, ${w * 1.1}px)`, aspectRatio: `${w} / ${h}` }}
        >
          <canvas ref={canvasRef} width={w} height={h} className="block size-full touch-none object-contain" />

          {!started && (
            <div className="absolute inset-0 grid place-items-center bg-card/95 backdrop-blur-sm">
              <div className="text-center">
                <p className="text-6xl font-black tabular-nums text-primary">
                  {Math.max(1, Math.ceil(msLeft / 1000))}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">Get ready…</p>
              </div>
            </div>
          )}

          {started && loading && (
            <div className="absolute inset-0 grid place-items-center bg-card">
              <Loader2 className="size-8 animate-spin text-primary" />
            </div>
          )}

          {status && !outcome && (
            <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center">
              <span className="rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
                {status}
              </span>
            </div>
          )}

          {outcome && (
            <div className="absolute inset-0 grid place-items-center bg-black/70 p-6 text-center backdrop-blur-sm">
              <div>
                <p className="text-4xl font-black text-white">
                  {outcome === "win" ? "You win!" : outcome === "draw" ? "Draw" : "You lost"}
                </p>
                <p className="mt-1 text-sm text-white/70">
                  {result?.credits_earned
                    ? `+${result.credits_earned} credits · +${result.xp_earned ?? 0} XP`
                    : "No rewards for this one."}
                </p>
                <Button className="mt-4" onClick={onExit}>
                  Back to the lobby
                </Button>
              </div>
            </div>
          )}
        </div>

        <aside className="space-y-2 rounded-2xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-muted-foreground">
            {isVersus ? "Match" : everyoneDone ? "Final standings" : "Live standings"}
          </h2>
          <ul className="space-y-1">
            {rows.map((row, i) => {
              const name = nameOf(row.userId);
              const member = members.find((m) => m.user_id === row.userId);
              return (
                <li
                  key={row.userId}
                  className={`flex items-center gap-2 rounded-xl px-2 py-1.5 ${row.userId === me ? "bg-primary/5" : ""}`}
                >
                  <span className="w-4 text-center text-xs font-bold text-muted-foreground">
                    {row.finished && i === 0 && everyoneDone ? <Medal className="size-4 text-gold" /> : i + 1}
                  </span>
                  <UserAvatar src={member?.avatar_url} name={name} className="size-7" />
                  <span className="min-w-0 flex-1 truncate text-sm">{name}</span>
                  <span className="text-sm font-semibold tabular-nums">{formatNumber(row.score)}</span>
                </li>
              );
            })}
          </ul>
          {!isVersus && iFinished && !everyoneDone && (
            <p className="text-center text-xs text-muted-foreground">Waiting for the others to finish…</p>
          )}
          {!isVersus && everyoneDone && (
            <Button className="w-full" size="sm" onClick={onExit}>
              Back to the lobby
            </Button>
          )}
        </aside>
      </div>
    </div>
  );
}
