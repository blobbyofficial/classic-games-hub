"use client";

import { track } from "@vercel/analytics";
import { CONSENT_COOKIE, parseConsent } from "@/lib/consent";

/**
 * Custom product events, on top of the pageviews Vercel collects on its own.
 *
 * Pageviews answer "did anyone open Snake". They cannot answer the questions
 * this site is actually built around: how many runs get finished, what the shop
 * converts at, which difficulty people give up on, whether parties fill. That
 * is what these are for, and the set is deliberately small - every event here
 * is one somebody has a reason to look at.
 *
 * CONSENT: `<Analytics />` is only mounted once analytics consent exists (see
 * components/providers/consent-provider.tsx), which already makes `track()` a
 * no-op without it. The cookie is re-checked here anyway, because "it happens
 * not to do anything" and "it is not allowed to do anything" should not be the
 * same line of defence for something that has a legal meaning.
 *
 * Properties are scalars only, which is Vercel's own constraint. Nothing
 * identifying goes in one: slugs, difficulties and prices, never a username or
 * a user id.
 */

type EventProps = Record<string, string | number | boolean | null>;

function allowed(): boolean {
  if (typeof document === "undefined") return false;
  const raw = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${CONSENT_COOKIE}=`))
    ?.split("=")
    .slice(1)
    .join("=");
  return parseConsent(raw)?.analytics === true;
}

function send(name: string, props?: EventProps) {
  if (!allowed()) return;
  try {
    track(name, props);
  } catch {
    // Analytics must never be able to break a game ending or a purchase
    // completing. If it throws, it is the only thing that fails.
  }
}

/** A run began. Paired with `gameEnd` to give a completion rate per game. */
export const gameStart = (slug: string, difficulty: string) =>
  send("game_start", { slug, difficulty });

/**
 * A run ended. `duration` is seconds and `score` is the final score, so the
 * abandoned-in-the-first-ten-seconds case is separable from a real attempt.
 */
export const gameEnd = (
  slug: string,
  difficulty: string,
  score: number,
  duration: number,
  authed: boolean,
) => send("game_end", { slug, difficulty, score, duration, authed });

/** Something was bought from the shop. `price` is in credits. */
export const purchase = (slug: string, price: number, rarity: string) =>
  send("purchase", { slug, price, rarity });

/** Someone joined or created a party - `created` separates the two. */
export const partyJoin = (created: boolean, gameSlug: string | null) =>
  send("party_join", { created, game: gameSlug });

// NO level_up EVENT YET, deliberately. Nothing on the web client is told that a
// level changed: `submit_score` returns xp_earned but not the level it landed
// on, and ScoreResult has no field for it. Adding a helper here with no honest
// call site would just be dead code. When submit_score starts returning the new
// level, this is the file it gets added to.
