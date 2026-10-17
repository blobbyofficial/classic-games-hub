/**
 * Read-only, public GitHub activity feed for /updates.
 * This is repository history, not evidence of deployment or a release.
 */
export interface RepositoryChange {
  sha: string;
  subject: string;
  date: string;
  url: string;
  kind: "plan" | "code" | "maintenance";
}

function kindOf(subject: string): RepositoryChange["kind"] {
  if (/^(?:docs\(roadmap\)|roadmap:|roadmap\b)/i.test(subject)) return "plan";
  if (/^(?:docs\b|chore\b|ci\b|test\b|build\b|Merge\b|Update package-lock)/i.test(subject))
    return "maintenance";
  return "code";
}

interface GitHubCommit {
  sha?: string;
  html_url?: string;
  commit?: { message?: string; committer?: { date?: string }; author?: { date?: string } };
}

export async function getRecentRepositoryActivity(): Promise<RepositoryChange[] | null> {
  try {
    const response = await fetch(
      "https://api.github.com/repos/blobbyofficial/classic-games-hub/commits?sha=main&per_page=100",
      {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "classic-games-hub-updates",
        },
        next: { revalidate: 3600 },
      },
    );
    if (!response.ok) return null;
    const payload: unknown = await response.json();
    if (!Array.isArray(payload)) return null;
    return (payload as GitHubCommit[])
      .filter((item) => /^[0-9a-f]{40}$/i.test(item.sha ?? "") && item.commit?.message)
      .map((item) => {
        const sha = item.sha!;
        const subject = item.commit!.message!.split("\n")[0];
        return {
          sha,
          subject,
          date: item.commit?.committer?.date ?? item.commit?.author?.date ?? "",
          url: `https://github.com/blobbyofficial/classic-games-hub/commit/${sha}`,
          kind: kindOf(subject),
        };
      });
  } catch {
    return null;
  }
}
