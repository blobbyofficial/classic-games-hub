import { Code2 } from "lucide-react";

/**
 * The API, documented on the page it describes.
 *
 * Worth the space: a status API nobody can find is a status API nobody uses,
 * and the people most likely to want it - someone wiring up a dashboard, or
 * checking whether it is us or them - are already here.
 */
const ENDPOINTS: { method: string; path: string; what: string }[] = [
  { method: "GET", path: "/api/status", what: "Everything: components, incidents, maintenance, report signal." },
  { method: "GET", path: "/api/status/components", what: "Just the components and their current status." },
  { method: "GET", path: "/api/status/components/{slug}", what: "One component, with 90 days of uptime." },
  { method: "GET", path: "/api/status/incidents", what: "Incident history. `?active=1` for open ones only." },
  { method: "GET", path: "/api/status/uptime?component={slug}", what: "Daily uptime series for a component." },
  { method: "GET", path: "/api/status/reports", what: "Player reports as 15-minute buckets, with the baseline." },
  { method: "POST", path: "/api/status/reports", what: "Submit a report. Rate limited per connection." },
  { method: "GET", path: "/api/status/badge?component={slug}", what: "An SVG badge to embed anywhere." },
];

export function ApiCard() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <Code2 className="size-4 text-primary" />
        <h2 className="text-sm font-semibold">Status API</h2>
      </div>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Everything on this page is available as JSON, with CORS open to anyone and no key required.
        Add <code className="rounded bg-muted px-1 py-0.5 text-xs">?format=statuspage</code> to the
        summary for a Statuspage-compatible document that existing tools already understand.
      </p>

      <ul className="mt-3 divide-y divide-border/60 text-sm">
        {ENDPOINTS.map((endpoint) => (
          <li key={endpoint.method + endpoint.path} className="py-2">
            <p className="flex items-baseline gap-2">
              <span
                className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold ${
                  endpoint.method === "POST" ? "bg-warning/15 text-warning" : "bg-success/15 text-success"
                }`}
              >
                {endpoint.method}
              </span>
              <code className="min-w-0 break-all font-mono text-xs">{endpoint.path}</code>
            </p>
            <p className="mt-0.5 pl-1 text-xs text-muted-foreground">{endpoint.what}</p>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-xs text-muted-foreground">
        The Discord bot reads the same endpoints - try <code className="font-mono">/status</code> in
        the server.
      </p>
    </div>
  );
}
