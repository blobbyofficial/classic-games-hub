import type { MetadataRoute } from "next";
import { getPublishedGames } from "@/services/games";
import { SITE } from "@/lib/constants";

// Regenerate the sitemap at most once an hour.
export const revalidate = 3600;

/**
 * Public sitemap for Google Search Console and other crawlers. Lists the
 * indexable marketing/library pages plus every published game. Auth-gated
 * routes (settings, messages, admin, …) are intentionally omitted.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = SITE.url.replace(/\/$/, "");

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/games`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/leaderboards`, changeFrequency: "hourly", priority: 0.7 },
    { url: `${base}/shop`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/achievements`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${base}/roadmap`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${base}/updates`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${base}/status`, changeFrequency: "daily", priority: 0.3 },
    { url: `${base}/legal/terms`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${base}/legal/privacy`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${base}/legal/cookies`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${base}/login`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${base}/register`, changeFrequency: "monthly", priority: 0.4 },
  ];

  let gameRoutes: MetadataRoute.Sitemap = [];
  try {
    const games = await getPublishedGames();
    gameRoutes = games.map((g) => ({
      url: `${base}/games/${g.slug}`,
      ...(g.updated_at && !Number.isNaN(Date.parse(g.updated_at)) ? { lastModified: new Date(g.updated_at) } : {}),
      changeFrequency: "weekly",
      priority: 0.8,
    }));
  } catch {
    // If the database is unreachable at request time, still return static routes.
  }

  return [...staticRoutes, ...gameRoutes];
}
