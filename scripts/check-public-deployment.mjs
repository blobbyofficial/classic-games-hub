#!/usr/bin/env node
/**
 * Read-only public deployment evidence collector.
 * Usage: node scripts/check-public-deployment.mjs https://example.test
 * Does not fetch protected cron routes or require/reveal credentials.
 */
const origin = new URL(process.argv[2] || "https://classic-games-hub.blobbyofficial.com");
if (!["https:", "http:"].includes(origin.protocol)) throw Error("Expected HTTP origin");
const paths = ["/", "/games", "/roadmap", "/status", "/api/status"];
const report = { collected_at: new Date().toISOString(), origin: origin.origin, results: [] };
for (const path of paths) {
  const url = new URL(path, origin);
  const started = performance.now();
  try {
    const response = await fetch(url, {
      redirect: "manual",
      headers: { "cache-control": "no-cache", accept: path.startsWith("/api/") ? "application/json" : "text/html" },
      signal: AbortSignal.timeout(12000),
    });
    const body = await response.text();
    const row = {
      path,
      status: response.status,
      duration_ms: Math.round(performance.now() - started),
      content_type: response.headers.get("content-type"),
      cache: response.headers.get("x-vercel-cache"),
      age: response.headers.get("age"),
      etag: response.headers.get("etag"),
      vercel_id: response.headers.get("x-vercel-id"),
      redirect: response.headers.get("location"),
      bytes: Buffer.byteLength(body),
    };
    report.results.push(row);
  } catch (error) {
    report.results.push({ path, error: String(error), duration_ms: Math.round(performance.now() - started) });
  }
}
console.log(JSON.stringify(report, null, 2));
if (report.results.some(x => x.error || x.status !== 200)) process.exitCode = 1;
