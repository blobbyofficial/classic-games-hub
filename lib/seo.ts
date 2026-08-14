import { SITE } from "@/lib/constants";
import type { Game } from "@/types";

/**
 * Structured data (JSON-LD) for the pages search engines actually rank.
 *
 * WHY THIS EXISTS: the site had none. Metadata tags describe a page; structured
 * data tells Google what the page *is*, and it is what makes a game page
 * eligible for a rich result rather than a blue link. For an arcade the
 * relevant type is `VideoGame`, and the field Google cares about most is
 * `offers` at price 0 - "free" is the word the searches we can realistically
 * win are built around.
 *
 * WHAT IS DELIBERATELY ABSENT: `WebSite.potentialAction` (the sitelinks
 * searchbox). It requires a URL template pointing at a real search endpoint and
 * this site has none - /games filters by category and nothing else. Declaring
 * one anyway is invalid markup, and invalid markup is worse than none: Google
 * drops the whole block rather than the bad field.
 *
 * Everything here is plain data. Rendering is `components/seo/json-ld.tsx`,
 * which is the only thing allowed to serialise it.
 */

type Json = Record<string, unknown>;

/** Strip undefined so optional fields vanish instead of serialising as null. */
function compact(obj: Json): Json {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== null));
}

function absolute(path: string): string {
  return path.startsWith("http") ? path : `${SITE.url}${path.startsWith("/") ? path : `/${path}`}`;
}

export function organizationJsonLd(): Json {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE.url}#organization`,
    name: SITE.name,
    url: SITE.url,
    description: SITE.description,
    logo: absolute("/icons/icon-512.png"),
    sameAs: [SITE.discord, SITE.founder],
  };
}

/**
 * The claim that this domain *is* "Classic Games Hub". Googling the name
 * currently returns something else, and an explicit WebSite/Organization pair
 * with a stable @id is the machine-readable half of fixing that - the other
 * half is Search Console and links, which no amount of markup replaces.
 */
export function websiteJsonLd(): Json {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE.url}#website`,
    name: SITE.name,
    alternateName: SITE.shortName,
    url: SITE.url,
    description: SITE.description,
    publisher: { "@id": `${SITE.url}#organization` },
    inLanguage: "en-GB",
  };
}

export function breadcrumbJsonLd(trail: { name: string; path: string }[]): Json {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((crumb, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: crumb.name,
      item: absolute(crumb.path),
    })),
  };
}

/**
 * One game. `aggregateRating` is included **only** when the game has been rated:
 * schema.org requires ratingValue to sit inside worst..best, and a game with no
 * ratings has no defensible value to put there. Emitting 0, or emitting the
 * block with ratingCount 0, is the kind of thing that gets a site's rich
 * results turned off rather than one field ignored.
 */
export function videoGameJsonLd(game: Game): Json {
  const rated = game.rating_count > 0;
  const rating = rated ? game.rating_sum / game.rating_count : 0;

  return compact({
    "@context": "https://schema.org",
    "@type": "VideoGame",
    "@id": `${SITE.url}/games/${game.slug}#game`,
    name: game.title,
    url: absolute(`/games/${game.slug}`),
    description: game.tagline ?? game.description ?? `Play ${game.title} free in your browser.`,
    image: game.thumbnail_url ? absolute(game.thumbnail_url) : undefined,
    genre: game.category,
    gamePlatform: "Web browser",
    operatingSystem: "Any",
    applicationCategory: "GameApplication",
    playMode: "SinglePlayer",
    inLanguage: "en-GB",
    publisher: { "@id": `${SITE.url}#organization` },
    // Free, no download, no install - the three things the long-tail queries
    // ("play snake online free no download") are actually asking about.
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "GBP",
      availability: "https://schema.org/InStock",
    },
    aggregateRating: rated
      ? {
          "@type": "AggregateRating",
          ratingValue: Number(rating.toFixed(2)),
          ratingCount: game.rating_count,
          bestRating: 5,
          worstRating: 1,
        }
      : undefined,
  });
}

/** The library as an ordered list, so /games can rank as a collection. */
export function gameListJsonLd(games: Pick<Game, "slug" | "title">[]): Json {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Games on ${SITE.name}`,
    numberOfItems: games.length,
    itemListElement: games.map((game, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: game.title,
      url: absolute(`/games/${game.slug}`),
    })),
  };
}
