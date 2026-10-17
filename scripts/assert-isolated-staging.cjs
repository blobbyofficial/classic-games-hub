/** Safety gate for opt-in tests that may access private account data.
 * Refuse production-looking endpoints even when the workflow checkbox was ticked.
 * Never print credential URLs or tokens to logs.
 */
const { URL } = require("node:url");

const LIVE_SUPABASE_REF = "isgqukmmhuzhpalbruwt";
const KNOWN_PRODUCTION_HOSTS = new Set([
  "classic-games-hub.blobbyofficial.com",
  "blobbyofficial.com",
  "www.blobbyofficial.com",
]);
function requireStagingUrl(input, kind) {
  if (typeof input !== "string" || !input.trim()) throw Error(`Missing ${kind} staging URL`);
  let url;
  try { url = new URL(input); } catch { throw Error(`Malformed ${kind} staging URL`); }
  const host = url.hostname.toLowerCase();
  if (!host || !["https:", "postgres:", "postgresql:"].includes(url.protocol)) {
    throw Error(`Unsupported ${kind} staging scheme`);
  }
  if (KNOWN_PRODUCTION_HOSTS.has(host) || host.includes(LIVE_SUPABASE_REF)) {
    throw Error("Refusing known production environment");
  }
  // An explicit marker is required because a generic Vercel preview or Supabase
  // pooler can still be connected to live production resources.
  return url;
}
function assertIsolatedEnvironment(config) {
  if (config.confirmed !== "yes") throw Error("Disposable staging confirmation required");
  const url = requireStagingUrl(config.url, config.kind);
  if (config.kind === "website" && url.protocol !== "https:") {
    throw Error("Staging website must use HTTPS");
  }
  if (config.kind === "database" && !["postgres:", "postgresql:"].includes(url.protocol)) {
    throw Error("Staging database must be a PostgreSQL connection URL");
  }
  // For pooled hosts the ref may appear in the database username.
  if (config.kind === "database" && decodeURIComponent(url.username).includes(LIVE_SUPABASE_REF)) {
    throw Error("Refusing production Supabase pooler connection");
  }
}
if (require.main === module) {
  try {
    assertIsolatedEnvironment({
      kind: process.env.STAGING_KIND,
      url: process.env.STAGING_TARGET_URL,
      confirmed: process.env.STAGING_ISOLATED_CONFIRMED,
    });
    console.log("Staging endpoint safety checks passed");
  } catch (err) {
    console.error("Staging endpoint safety checks failed:", err.message);
    process.exitCode = 1;
  }
}
module.exports = { requireStagingUrl, assertIsolatedEnvironment };
