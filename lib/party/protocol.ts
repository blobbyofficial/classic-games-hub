/**
 * The wire protocol a party speaks while it is together.
 *
 * Membership lives in Postgres (0044_parties); everything that happens *during*
 * a match is ephemeral and rides on a Supabase Realtime broadcast channel named
 * after the party id. Nothing about a match in progress is persisted — only the
 * final score, and only through the ordinary `submit_score` path every
 * single-player run already uses.
 *
 * The channel name is the party's UUID, which only members ever see (the
 * `parties` row is RLS-locked to members, and the id is not in any URL). This
 * mirrors how DM threads already broadcast typing/reactions on
 * `conversation:<id>`.
 */

import type { GameMove, Seat } from "@/types";

export const partyChannel = (partyId: string) => `party:${partyId}`;

/**
 * Games that can be played as a true head-to-head match: two players, one
 * shared board, alternating turns. Their engines accept a `net` context and
 * implement `applyRemoteMove`.
 *
 * Everything else in the library is single-player by nature, so a party plays
 * those as a *race* instead — same game, same moment, live scoreboard.
 */
export const HEAD_TO_HEAD = new Set(["tictactoe", "connect4", "reversi"]);

export type MatchMode = "versus" | "race";

export function modeFor(engineId: string, playerCount: number): MatchMode {
  return HEAD_TO_HEAD.has(engineId) && playerCount === 2 ? "versus" : "race";
}

/** How long everyone stares at the countdown before a match begins. */
export const COUNTDOWN_MS = 3200;

export interface MatchConfig {
  matchId: string;
  gameSlug: string;
  engineId: string;
  title: string;
  mode: MatchMode;
  /** Everyone taking part, in display order. */
  players: string[];
  /** userId → seat. Versus matches only; seat 1 moves first. */
  seats: Record<string, Seat>;
  /** Epoch ms when play starts — the countdown ends at the same instant for all. */
  startAt: number;
}

/**
 * Broadcast events. `roster` is a nudge rather than a payload: the sender has
 * changed something in Postgres, so everyone else should re-read `party_state`
 * rather than trust a copy that travelled over the wire.
 */
export type PartyEvent =
  | { type: "roster" }
  | { type: "match:start"; config: MatchConfig }
  | { type: "match:move"; matchId: string; from: string; move: GameMove }
  | { type: "match:score"; matchId: string; userId: string; score: number }
  | { type: "match:finish"; matchId: string; userId: string; score: number }
  | { type: "match:end"; matchId: string };

export const PARTY_EVENT = "party" as const;

/** Live standing for one player in a race. */
export interface RaceEntry {
  userId: string;
  score: number;
  finished: boolean;
}
