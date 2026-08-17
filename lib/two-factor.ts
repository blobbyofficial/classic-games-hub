import { createHash, randomInt } from "node:crypto";

/**
 * Recovery-code mechanics for two-factor authentication. Server-only: it pulls
 * in node:crypto, and a recovery code should never be generated anywhere the
 * browser can influence the randomness.
 *
 * The database stores hashes (see database/migrations/0076_two_factor_recovery.sql),
 * so a code exists in plaintext exactly once - in the response that shows it to
 * the person it belongs to.
 */

/** How many codes a set holds. The migration caps a set at 32. */
export const RECOVERY_CODE_COUNT = 10;

/**
 * Crockford's alphabet minus the letters people mistype from a screenshot:
 * no I/L/O/U, no 0/1. A code gets read aloud or copied by hand often enough
 * that ambiguity is a real failure mode.
 */
const ALPHABET = "ABCDEFGHJKMNPQRSTVWXYZ23456789";
const GROUP = 5;
const GROUPS = 2;

/** One `XXXXX-XXXXX` code. ~49 bits of entropy, which is plenty for single use. */
function generateRecoveryCode(): string {
  const groups: string[] = [];
  for (let g = 0; g < GROUPS; g++) {
    let out = "";
    // randomInt over the alphabet length rather than a byte modulo, so every
    // character is uniformly likely.
    for (let i = 0; i < GROUP; i++) out += ALPHABET[randomInt(ALPHABET.length)];
    groups.push(out);
  }
  return groups.join("-");
}

/** A fresh set of codes, in the form they are shown to the user. */
export function generateRecoveryCodes(count = RECOVERY_CODE_COUNT): string[] {
  const codes = new Set<string>();
  while (codes.size < count) codes.add(generateRecoveryCode());
  return [...codes];
}

/**
 * Fold away everything that is presentation rather than code: case, the
 * grouping dash, and whatever whitespace a paste brought with it. Typing
 * `abcde fghij` has to work.
 */
export function normaliseRecoveryCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** Hex sha-256 of the normalised code - the only form the database ever sees. */
export function hashRecoveryCode(input: string): string {
  return createHash("sha256").update(normaliseRecoveryCode(input)).digest("hex");
}
