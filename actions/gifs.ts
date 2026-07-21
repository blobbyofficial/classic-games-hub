"use server";

/**
 * Giphy-backed GIF search for the messaging composer. The API key stays
 * server-side (GIPHY_API_KEY); the client only ever receives a small list of
 * ready-to-send GIF URLs + preview thumbnails. Users pick from these results —
 * they never upload or paste their own image URLs.
 */

export interface GifResult {
  id: string;
  /** The URL sent as the message body and rendered inline. */
  url: string;
  /** A lightweight still/preview for the picker grid. */
  preview: string;
  width: number;
  height: number;
  title: string;
}

interface GiphyImage {
  url: string;
  width: string;
  height: string;
}
interface GiphyItem {
  id: string;
  title: string;
  images: {
    fixed_height: GiphyImage;
    fixed_width_small?: GiphyImage;
    preview_gif?: GiphyImage;
  };
}

const ENDPOINT = "https://api.giphy.com/v1/gifs";

export async function searchGifs(query: string): Promise<GifResult[]> {
  const key = process.env.GIPHY_API_KEY;
  if (!key) return []; // feature is a no-op until the key is configured

  const q = query.trim();
  const params = new URLSearchParams({
    api_key: key,
    limit: "24",
    rating: "pg-13",
    bundle: "messaging_non_clips",
  });
  if (q) params.set("q", q);
  const path = q ? "search" : "trending";

  try {
    const res = await fetch(`${ENDPOINT}/${path}?${params.toString()}`, {
      // GIF results are fine to cache briefly; keeps us well under rate limits.
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { data?: GiphyItem[] };
    return (json.data ?? []).map((g) => {
      const main = g.images.fixed_height;
      const preview = g.images.fixed_width_small ?? g.images.preview_gif ?? main;
      return {
        id: g.id,
        url: main.url.split("?")[0], // stable, param-free URL for the message body
        preview: preview.url,
        width: Number(main.width) || 200,
        height: Number(main.height) || 200,
        title: g.title || "GIF",
      };
    });
  } catch {
    return [];
  }
}
