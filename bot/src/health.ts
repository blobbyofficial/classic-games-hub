import { createServer } from "node:http";
import type { Client } from "discord.js";
import { config } from "./config.js";

/**
 * Tiny health/keep-alive server.
 *
 * Free hosts (Render, Koyeb, Fly, Railway…) expect a web process to listen on
 * $PORT, and several of them idle a service out unless something hits it. This
 * exposes `GET /` and `GET /health` with the gateway status, so:
 *
 *   * the host's health check passes and the container stays up, and
 *   * an uptime pinger (UptimeRobot, cron-job.org, BetterStack - all free) can
 *     poke it every few minutes to stop the free instance sleeping, which is
 *     what keeps the bot showing **Online** in Discord.
 *
 * Set SELF_URL to this service's public URL and the worker will also ping
 * itself, which is enough on hosts that only sleep on *inbound* inactivity.
 */
export function startHealthServer(client: Client): void {
  const port = config.port;
  if (!port) return;

  const server = createServer((req, res) => {
    const ready = client.isReady();
    const body = {
      ok: ready,
      status: ready ? "online" : "connecting",
      bot: client.user?.tag ?? null,
      guilds: client.guilds.cache.size,
      /** Gateway round-trip in ms (-1 until the first heartbeat). */
      ping: Math.round(client.ws.ping),
      uptime_seconds: Math.round(process.uptime()),
      started_at: new Date(Date.now() - process.uptime() * 1000).toISOString(),
    };
    res.writeHead(ready ? 200 : 503, { "content-type": "application/json" });
    res.end(JSON.stringify(body));
    void req;
  });

  server.on("error", (err) => console.error("[health] server error:", err.message));
  server.listen(port, () => console.log(`🩺 Health server listening on :${port}`));

  if (config.selfUrl) {
    const ping = () => {
      fetch(`${config.selfUrl.replace(/\/$/, "")}/health`).catch(() => undefined);
    };
    setInterval(ping, 4 * 60_000); // just inside the usual 5-minute idle window
  }
}
