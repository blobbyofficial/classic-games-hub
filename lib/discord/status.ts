import "server-only";
import {
  getIncidentHistory,
  getReportTimeline,
  getStatusChoices,
  getStatusComponent,
  getStatusSummary,
} from "@/services/status";
import {
  COMPONENT_STATUS,
  INCIDENT_STATUS,
  INDICATOR,
  REPORT_PROBLEM_LABEL,
  REPORT_SIGNAL,
  formatDuration,
  formatUptime,
  type Incident,
} from "@/lib/status";
import { BUILD, EXPECTED_SCHEMA, SITE_CODENAME, SITE_VERSION, shortCommit, siteUrl } from "@/lib/version";
import { brandEmbed, errorEmbed } from "./embeds";
import type { Embed } from "./types";

/**
 * `/status [service]` - the status page, in Discord.
 *
 * Reads exactly the same RPCs the web page and the public API do, so there is
 * one definition of "is the shop up" rather than three that drift. The special
 * words - incidents, reports, versions - are the questions people ask that are
 * not about one particular service, and they are offered in the autocomplete
 * alongside the components so nobody has to know they exist.
 */

const STATUS_COLOUR: Record<string, number> = {
  none: 0x22c55e,
  minor: 0xeab308,
  major: 0xf97316,
  critical: 0xef4444,
  maintenance: 0x7a3dff,
};

const statusUrl = () => `${siteUrl()}/status`;

/** Discord renders a relative timestamp from a unix seconds value. */
const when = (iso: string) => `<t:${Math.floor(new Date(iso).getTime() / 1000)}:R>`;

const SPECIALS = [
  { value: "incidents", name: "Incidents - what has broken recently" },
  { value: "reports", name: "Reports - what players are reporting" },
  { value: "versions", name: "Versions - what is deployed right now" },
];

/**
 * Autocomplete choices: the live component list plus the special words,
 * filtered by whatever has been typed. Capped at Discord's limit of 25.
 */
export async function statusChoices(typed: string): Promise<{ name: string; value: string }[]> {
  const query = typed.trim().toLowerCase();
  const components = await getStatusChoices();

  const options = [
    { value: "all", name: "Everything - the whole status page" },
    ...components.map((c) => ({ value: c.slug, name: c.name })),
    ...SPECIALS,
  ];

  return options
    .filter((o) => !query || o.name.toLowerCase().includes(query) || o.value.includes(query))
    .slice(0, 25);
}

function incidentLine(incident: Incident): string {
  const state = INCIDENT_STATUS[incident.status].label;
  const parts = [`**INC-${incident.ref}** ${incident.title}`, `${state} · started ${when(incident.started_at)}`];
  if (incident.components.length > 0) {
    parts.push(incident.components.map((c) => c.name).join(", "));
  }
  return parts.join("\n");
}

/** The whole board, which is what a bare `/status` asks for. */
async function overall(): Promise<Embed[]> {
  const summary = await getStatusSummary();
  if (!summary) {
    return [errorEmbed("I cannot reach the status service - which probably means the site is having real problems.")];
  }

  const indicator = INDICATOR[summary.status.indicator];
  const board = summary.components
    .map((c) => `${COMPONENT_STATUS[c.status].emoji} **${c.name}** - ${COMPONENT_STATUS[c.status].label}`)
    .join("\n");

  const fields: NonNullable<Embed["fields"]> = [{ name: "Services", value: board || "Nothing configured." }];

  if (summary.incidents.length > 0) {
    fields.push({
      name: `Open ${summary.incidents.length === 1 ? "incident" : "incidents"}`,
      value: summary.incidents.slice(0, 3).map(incidentLine).join("\n\n"),
    });
  }

  if (summary.maintenance.length > 0) {
    fields.push({
      name: "Scheduled maintenance",
      value: summary.maintenance
        .slice(0, 2)
        .map((m) => `**${m.title}**\n${m.scheduled_for ? when(m.scheduled_for) : "Time to be confirmed"}`)
        .join("\n\n"),
    });
  }

  // Only mentioned when it is saying something: "no problems reported" on every
  // single invocation is noise that trains people to skip the line that matters.
  if (summary.reports.signal !== "none") {
    fields.push({
      name: "Player reports",
      value: `${REPORT_SIGNAL[summary.reports.signal].label} - ${summary.reports.last_hour} in the last hour, against a usual ${summary.reports.baseline} per window.`,
    });
  }

  return [
    brandEmbed({
      title: `${indicator.emoji} ${indicator.label}`,
      description: summary.incidents.length > 0 ? undefined : indicator.blurb,
      color: STATUS_COLOUR[summary.status.indicator],
      url: statusUrl(),
      fields,
      timestamp: summary.generated_at,
    }),
  ];
}

async function component(slug: string): Promise<Embed[]> {
  const detail = await getStatusComponent(slug);
  if (!detail) {
    return [errorEmbed(`I do not know a service called \`${slug}\`. Try \`/status\` on its own.`)];
  }

  const meta = COMPONENT_STATUS[detail.status];
  const open = detail.incidents.filter((i) => !i.resolved_at);

  const fields: NonNullable<Embed["fields"]> = [
    { name: "Status", value: `${meta.emoji} ${meta.label}`, inline: true },
    { name: "Uptime (24h)", value: formatUptime(detail.uptime_24h), inline: true },
    { name: "Uptime (90d)", value: formatUptime(detail.uptime_90d), inline: true },
  ];

  if (detail.latency_ms !== null) {
    fields.push({ name: "Last response", value: `${detail.latency_ms} ms`, inline: true });
  }
  if (detail.latency_avg_24h !== null) {
    fields.push({ name: "Average (24h)", value: `${detail.latency_avg_24h} ms`, inline: true });
  }
  if (detail.reports?.ok) {
    fields.push({ name: "Reports (1h)", value: String(detail.reports.last_hour), inline: true });
  }
  if (detail.pinned && detail.pinned_reason) {
    fields.push({ name: "Set manually by staff", value: detail.pinned_reason });
  }
  if (open.length > 0) {
    fields.push({ name: "Open incident", value: open.map(incidentLine).join("\n\n") });
  }

  return [
    brandEmbed({
      title: `${meta.emoji} ${detail.name}`,
      description: detail.description ?? undefined,
      color: STATUS_COLOUR[
        detail.status === "operational"
          ? "none"
          : detail.status === "major_outage"
            ? "critical"
            : detail.status === "partial_outage"
              ? "major"
              : detail.status === "under_maintenance"
                ? "maintenance"
                : "minor"
      ],
      url: statusUrl(),
      fields,
      timestamp: detail.generated_at,
    }),
  ];
}

async function incidents(): Promise<Embed[]> {
  const history = await getIncidentHistory(5);
  if (!history) return [errorEmbed("I cannot reach the status service right now.")];
  if (history.length === 0) {
    return [
      brandEmbed({
        title: "📋 No incidents recorded",
        description: "Nothing has been logged yet. Long may it continue.",
        url: statusUrl(),
        color: STATUS_COLOUR.none,
      }),
    ];
  }

  return [
    brandEmbed({
      title: "📋 Recent incidents",
      url: statusUrl(),
      fields: history.map((incident) => ({
        name: `${incident.resolved_at ? "✅" : "🔴"} INC-${incident.ref} · ${incident.title}`,
        value: [
          incident.resolved_at
            ? `Resolved ${when(incident.resolved_at)} · lasted ${formatDuration(incident.started_at, incident.resolved_at)}`
            : `${INCIDENT_STATUS[incident.status].label} · started ${when(incident.started_at)}`,
          incident.updates[0]?.body?.slice(0, 200) ?? "",
        ]
          .filter(Boolean)
          .join("\n"),
      })),
    }),
  ];
}

async function reports(): Promise<Embed[]> {
  const timeline = await getReportTimeline(null, 24);
  if (!timeline?.ok) return [errorEmbed("I cannot reach the status service right now.")];

  const signal = REPORT_SIGNAL[timeline.signal];
  const top = timeline.problems
    .slice(0, 5)
    .map((p) => `**${p.share}%** ${REPORT_PROBLEM_LABEL[p.problem] ?? p.problem}`)
    .join("\n");

  return [
    brandEmbed({
      title: `📣 ${signal.label}`,
      description: `${signal.blurb}\n\nReports are what players tell us is broken - they are counted, not verified.`,
      url: statusUrl(),
      color:
        timeline.signal === "spike"
          ? STATUS_COLOUR.critical
          : timeline.signal === "elevated"
            ? STATUS_COLOUR.minor
            : STATUS_COLOUR.none,
      fields: [
        { name: "Last hour", value: String(timeline.last_hour), inline: true },
        { name: "Last 24 hours", value: String(timeline.total), inline: true },
        { name: "Usual level", value: `${timeline.baseline} per ${timeline.window_minutes} min`, inline: true },
        ...(top ? [{ name: "Most reported", value: top }] : []),
      ],
      timestamp: timeline.generated_at,
    }),
  ];
}

async function versions(): Promise<Embed[]> {
  const summary = await getStatusSummary();
  const schema = summary?.schema_version ?? "unknown";
  const drift = schema !== "unknown" && schema !== EXPECTED_SCHEMA;

  return [
    brandEmbed({
      title: "🏷️ What is deployed",
      url: `${siteUrl()}/updates`,
      fields: [
        {
          name: "Site",
          value: `${SITE_VERSION}${SITE_CODENAME ? ` "${SITE_CODENAME}"` : ""}`,
          inline: true,
        },
        { name: "Build", value: shortCommit(BUILD.commit) ?? "local", inline: true },
        { name: "Environment", value: BUILD.environment, inline: true },
        {
          name: "Database schema",
          value: drift ? `${schema} ⚠️ (build expects ${EXPECTED_SCHEMA})` : schema,
          inline: true,
        },
        {
          name: "Gateway worker",
          value: summary?.bot?.online
            ? `Online${summary.bot.version ? ` · v${summary.bot.version}` : ""}`
            : "Offline",
          inline: true,
        },
      ],
    }),
  ];
}

/** Route the option to the right view. */
export async function handleStatus(service?: string): Promise<Embed[]> {
  const choice = (service ?? "").trim().toLowerCase();
  if (!choice || choice === "all" || choice === "everything" || choice === "site") return overall();
  if (choice === "incidents" || choice === "incident") return incidents();
  if (choice === "reports" || choice === "report") return reports();
  if (choice === "versions" || choice === "version") return versions();
  return component(choice);
}
