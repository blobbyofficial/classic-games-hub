/**
 * What is actually deployed, for the versions panel on /status and the
 * `/status versions` command in Discord.
 *
 * Four numbers that can all disagree with each other, which is exactly why the
 * page shows them side by side:
 *
 *   - the release, from the update log (what we tell people is live)
 *   - the commit, from Vercel's build environment (what is really live)
 *   - the schema, read back from the database at request time
 *   - the bot's own version, reported by its heartbeat
 *
 * Migrations are applied to Supabase separately from deploys, so the app and
 * the schema drift apart routinely - `EXPECTED_SCHEMA` is what this build was
 * written against, and /status compares it with what the database reports.
 */

import { RELEASES } from "./update-log";

/** The newest shipped release. RELEASES is newest-first by construction. */
export const SITE_VERSION = RELEASES[0]?.version ?? "unversioned";
export const SITE_CODENAME = RELEASES[0]?.codename ?? null;
export const SITE_RELEASED = RELEASES[0]?.date ?? null;

/**
 * The highest migration in `database/migrations` at the time of this build.
 *
 * Hand-maintained: bump it in the same commit that adds a migration. Reading
 * the directory instead would work on the server and break the moment any of
 * this is imported into a client component, and a number that is one edit per
 * migration is cheaper than a build step that only exists to count files.
 */
export const EXPECTED_SCHEMA = "0072";

/** Vercel's build-time git metadata. Absent in local development. */
export const BUILD = {
  commit: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
  ref: process.env.VERCEL_GIT_COMMIT_REF ?? null,
  message: process.env.VERCEL_GIT_COMMIT_MESSAGE ?? null,
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
  region: process.env.VERCEL_REGION ?? null,
} as const;

export const shortCommit = (sha: string | null | undefined) => (sha ? sha.slice(0, 7) : null);

export const siteUrl = () =>
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://classic-games-hub.blobbyofficial.com";
