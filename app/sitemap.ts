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
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/games`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/leaderboards`, lastModified: now, changeFrequency: "hourly", priority: 0.7 },
    { url: `${base}/shop`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/achievements`, lastModified: now, changeFrequency: "weekly", priority: 0.5 },
    { url: `${base}/login`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${base}/register`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
  ];

  let gameRoutes: MetadataRoute.Sitemap = [];
  try {
    const games = await getPublishedGames();
    gameRoutes = games.map((g) => ({
      url: `${base}/games/${g.slug}`,
      lastModified: g.updated_at ? new Date(g.updated_at) : now,
      changeFrequency: "weekly",
      priority: 0.8,
    }));
  } catch {
    // If the database is unreachable at request time, still return static routes.
  }

  return [...staticRoutes, ...gameRoutes];
}
