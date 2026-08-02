import type { MetadataRoute } from "next";
import { SITE } from "@/lib/constants";

/** robots.txt - allow public crawling, keep private surfaces out, point to the sitemap. */
export default function robots(): MetadataRoute.Robots {
  const base = SITE.url.replace(/\/$/, "");
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/settings", "/messages", "/notifications", "/inventory", "/auth/", "/api/"],
    },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
