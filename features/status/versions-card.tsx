import Link from "next/link";
import { AlertTriangle, Bot, Database, GitCommitHorizontal, Tag } from "lucide-react";
import { BUILD, EXPECTED_SCHEMA, SITE_CODENAME, SITE_RELEASED, SITE_VERSION, shortCommit } from "@/lib/version";
import { REPO_URL } from "@/lib/update-log";
import { timeAgo } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { StatusSummary } from "@/lib/status";

/**
 * What is actually running.
 *
 * Four versions that can disagree, shown together because the disagreement is
 * the useful part: migrations are applied to Supabase separately from deploys,
 * so "the schema is on 0070 and this build expects 0071" is a real state that
 * used to be invisible and is now a line on a public page.
 */
export function VersionsCard({ summary, schema }: { summary: StatusSummary; schema: string | null }) {
  const schemaVersion = schema ?? summary.schema_version;
  const schemaBehind = schemaVersion !== null && schemaVersion !== EXPECTED_SCHEMA;
  const commit = shortCommit(BUILD.commit);

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="text-sm font-semibold text-muted-foreground">Versions</h2>

      <dl className="mt-3 space-y-3 text-sm">
        <Row icon={Tag} label="Site">
          <Link href="/updates" className="font-medium hover:text-primary">
            {SITE_VERSION}
          </Link>
          {SITE_CODENAME && <span className="text-muted-foreground"> &ldquo;{SITE_CODENAME}&rdquo;</span>}
          {SITE_RELEASED && <span className="block text-xs text-muted-foreground">{SITE_RELEASED}</span>}
        </Row>

        <Row icon={GitCommitHorizontal} label="Build">
          {commit ? (
            <a
              href={`${REPO_URL}/commit/${BUILD.commit}`}
              target="_blank"
              rel="noreferrer"
              className="font-mono font-medium hover:text-primary"
            >
              {commit}
            </a>
          ) : (
            <span className="text-muted-foreground">Local</span>
          )}
          <span className="block text-xs text-muted-foreground">
            {BUILD.ref ? `${BUILD.ref} · ` : ""}
            {BUILD.environment}
          </span>
        </Row>

        <Row icon={Database} label="Schema">
          <span className={cn("font-mono font-medium", schemaBehind && "text-warning")}>
            {schemaVersion ?? "unknown"}
          </span>
          {schemaBehind && (
            <span className="mt-0.5 flex items-start gap-1 text-xs text-warning">
              <AlertTriangle className="mt-0.5 size-3 shrink-0" />
              This build expects {EXPECTED_SCHEMA} - a migration is not applied yet.
            </span>
          )}
        </Row>

        <Row icon={Bot} label="Discord worker">
          {summary.bot?.online ? (
            <span className="font-medium text-success">
              Online{summary.bot.version ? ` · v${summary.bot.version}` : ""}
            </span>
          ) : (
            <span className="font-medium text-muted-foreground">Offline</span>
          )}
          <span className="block text-xs text-muted-foreground">
            {summary.bot?.last_seen ? `Last heartbeat ${timeAgo(summary.bot.last_seen)}` : "No heartbeat recorded"}
          </span>
        </Row>
      </dl>
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-border/60 pb-3 last:border-0 last:pb-0">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <dt className="w-28 shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 flex-1 text-right sm:text-left">{children}</dd>
    </div>
  );
}
