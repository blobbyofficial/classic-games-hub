/**
 * Cut a GitHub Release for every shipped version that does not have one.
 *
 * lib/update-log.ts is already the most structured record in the project -
 * every release with its codename, its scope, its groups of changes, its
 * commits and its pull requests. GitHub had none of it: no releases, no tags,
 * and version numbers in the changelog that resolved to nothing you could
 * click. This closes that gap without adding a second place to maintain the
 * data, because it reads the same file /updates renders from.
 *
 * Idempotent by design: it lists what already exists and creates only the
 * difference, so it is safe on every push to main. It never edits or deletes a
 * release - if the update log is corrected after the fact, the release notes
 * are updated by hand or the release is removed and re-run.
 *
 * Usage:
 *   npx tsx scripts/sync-releases.ts            # create missing releases
 *   npx tsx scripts/sync-releases.ts --dry-run  # print what it would create
 *
 * Needs GITHUB_TOKEN (contents: write) and GITHUB_REPOSITORY in the env.
 */

import { execFileSync } from "node:child_process";
import { RELEASES, REPO_URL, type UpdateRelease } from "../lib/update-log";

const DRY_RUN = process.argv.includes("--dry-run");
const TOKEN = process.env.GITHUB_TOKEN;
const REPO = process.env.GITHUB_REPOSITORY ?? REPO_URL.replace("https://github.com/", "");
const API = `https://api.github.com/repos/${REPO}`;

function api(path: string, init?: RequestInit) {
  return fetch(`${API}${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${TOKEN}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
}

/** Every tag name GitHub already has a release for. */
async function existingTags(): Promise<Set<string>> {
  const tags = new Set<string>();
  for (let page = 1; ; page++) {
    const res = await api(`/releases?per_page=100&page=${page}`);
    if (!res.ok) throw new Error(`Listing releases failed: ${res.status} ${await res.text()}`);
    const batch = (await res.json()) as Array<{ tag_name: string }>;
    batch.forEach((r) => tags.add(r.tag_name));
    if (batch.length < 100) return tags;
  }
}

/**
 * The commit a release's tag should point at.
 *
 * `commits` is newest-first, so its first entry is where the release finished.
 * The shas in the update log are abbreviated; a tag needs a full one, and
 * rev-parse is also the check that the sha still exists in this history. If it
 * does not - a rebased or squashed branch - the release is tagged at whatever
 * the workflow checked out instead, which is wrong by a few commits and much
 * better than not existing.
 */
function resolveCommit(release: UpdateRelease, fallback: string): string {
  const short = release.commits[0];
  if (!short) return fallback;
  try {
    return execFileSync("git", ["rev-parse", `${short}^{commit}`], {
      encoding: "utf8",
      // git writes its "ambiguous argument" complaint to stderr, and the miss
      // is expected here - the catch below is the handling.
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    console.warn(`  ! ${short} not in this history - tagging at HEAD instead`);
    return fallback;
  }
}

/**
 * A shallow clone resolves almost no historical sha, which would silently tag
 * every release at HEAD and produce 30 releases pointing at one commit. Better
 * to stop: the workflow checks out with fetch-depth 0 precisely so this cannot
 * happen, and hitting it means something is misconfigured.
 */
function assertFullHistory() {
  const shallow =
    execFileSync("git", ["rev-parse", "--is-shallow-repository"], { encoding: "utf8" }).trim() ===
    "true";
  if (!shallow) return;
  const message =
    "Refusing to run against a shallow clone - release tags would all land on HEAD.\n" +
    "  Check out with fetch-depth: 0, or run `git fetch --unshallow` first.";
  if (!DRY_RUN) throw new Error(message);
  console.warn(`! ${message}\n`);
}

/** The release notes, rebuilt from the same structure /updates renders. */
function notes(release: UpdateRelease): string {
  const lines: string[] = [];

  lines.push(release.summary, "");

  if (release.formerly) {
    lines.push(`> Published as ${release.formerly} before renumbering.`, "");
  }

  for (const group of release.groups) {
    lines.push(`### ${group.heading}`, "");
    if (group.blurb) lines.push(group.blurb, "");
    for (const item of group.items) {
      const title = item.dropped ? `~~${item.title}~~` : `**${item.title}**`;
      lines.push(`- ${title} — ${item.description}`);
    }
    lines.push("");
  }

  lines.push("### Why these are one release", "", release.scope, "");

  if (release.prs?.length) {
    lines.push(
      `**Pull requests:** ${release.prs.map((n) => `#${n}`).join(", ")}`,
      "",
    );
  }

  if (release.commits.length) {
    lines.push(
      `**Commits:** ${release.commits.map((sha) => `[\`${sha}\`](${REPO_URL}/commit/${sha})`).join(", ")}`,
      "",
    );
  }

  lines.push(`Full notes: ${REPO_URL.replace("github.com", "classic-games-hub.blobbyofficial.com")}`);
  lines.push("", `_Generated from \`lib/update-log.ts\` by \`scripts/sync-releases.ts\`._`);

  return lines.join("\n");
}

async function main() {
  assertFullHistory();

  const head = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();

  // A dry run is for checking the notes render, and should still say something
  // useful without a usable token - so a failed listing degrades to "assume
  // nothing exists" rather than taking the whole run down.
  let have = new Set<string>();
  try {
    if (TOKEN) have = await existingTags();
    else if (!DRY_RUN) throw new Error("GITHUB_TOKEN is required (or pass --dry-run).");
  } catch (error) {
    if (!DRY_RUN) throw error;
    console.warn(`! Could not list existing releases (${(error as Error).message.split("\n")[0]}).`);
    console.warn("  Continuing as though none exist.\n");
  }

  // Oldest first, so the release list reads in the order things happened.
  const missing = [...RELEASES].reverse().filter((r) => !have.has(r.version));

  if (missing.length === 0) {
    console.log(`Nothing to do - all ${RELEASES.length} releases already exist.`);
    return;
  }

  console.log(`${missing.length} release(s) to create:`);

  for (const release of missing) {
    const target = resolveCommit(release, head);
    const name = `${release.version} "${release.codename}"`;

    if (DRY_RUN) {
      console.log(`  would create ${name} at ${target.slice(0, 7)}`);
      continue;
    }

    const res = await api("/releases", {
      method: "POST",
      body: JSON.stringify({
        tag_name: release.version,
        target_commitish: target,
        name,
        body: notes(release),
        draft: false,
        // The newest release is the only one that should be "Latest", and
        // creating oldest-first means each one takes that title from the last.
        make_latest: "true",
      }),
    });

    if (!res.ok) {
      throw new Error(`Creating ${release.version} failed: ${res.status} ${await res.text()}`);
    }
    console.log(`  created ${name} at ${target.slice(0, 7)}`);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
