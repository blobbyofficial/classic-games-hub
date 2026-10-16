"use server";

/**
 * Server-side GIPHY search for the messaging composer.
 * The API key never leaves the server. Results are treated as untrusted input.
 *
 * Production note: apply per-user/IP rate limiting at the application edge or
 * within this action using the project's shared limiter. Server actions are
 * callable endpoints, even when their UI is restricted.
 */
export interface GifResult {
  id: string;
  url: string;
  preview: string;
  width: number;
  height: number;
  title: string;
}

const ENDPOINT = "https://api.giphy.com/v1/gifs";
const LIMIT = 24;
const MAX_QUERY_LENGTH = 100;
const MAX_RESPONSE_BYTES = 1_000_000;
const REQUEST_TIMEOUT_MS = 5_000;
const ALLOWED_HOSTS = new Set(["media.giphy.com", "i.giphy.com"]);

function gifUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || !ALLOWED_HOSTS.has(url.hostname)) return null;
    if (url.username || url.password || url.port) return null;
    // Preserve the supplied URL: stripping its query could break CDN delivery.
    return url.toString();
  } catch {
    return null;
  }
}

function dimension(value: unknown): number | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const number = Number(value);
  return Number.isInteger(number) && number > 0 && number <= 10_000 ? number : null;
}

function parseGif(value: unknown): GifResult | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const item = value as Record<string, unknown>;
  if (typeof item.id !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(item.id)) return null;
  if (typeof item.images !== "object" || item.images === null || Array.isArray(item.images)) return null;
  const images = item.images as Record<string, unknown>;
  const main = images.fixed_height;
  if (typeof main !== "object" || main === null || Array.isArray(main)) return null;
  const mainImage = main as Record<string, unknown>;
  const url = gifUrl(mainImage.url);
  const width = dimension(mainImage.width);
  const height = dimension(mainImage.height);
  if (!url || width === null || height === null) return null;

  let preview = url;
  for (const variant of [images.fixed_width_small, images.preview_gif]) {
    if (typeof variant !== "object" || variant === null || Array.isArray(variant)) continue;
    const candidate = gifUrl((variant as Record<string, unknown>).url);
    if (candidate) {
      preview = candidate;
      break;
    }
  }
  return {
    id: item.id,
    url,
    preview,
    width,
    height,
    title: typeof item.title === "string" ? item.title.slice(0, 200) || "GIF" : "GIF",
  };
}

export async function searchGifs(query: string): Promise<GifResult[]> {
  const key = process.env.GIPHY_API_KEY;
  if (!key || typeof query !== "string") return [];

  const q = query.trim();
  if (q.length > MAX_QUERY_LENGTH) return [];

  const params = new URLSearchParams({
    api_key: key,
    limit: String(LIMIT),
    rating: "pg-13",
    bundle: "messaging_non_clips",
  });
  if (q) params.set("q", q);

  try {
    const response = await fetch(`${ENDPOINT}/${q ? "search" : "trending"}?${params}`, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) return [];

    const contentLength = response.headers.get("content-length");
    if (contentLength !== null && Number(contentLength) > MAX_RESPONSE_BYTES) return [];

    // Enforce an actual byte cap even when Content-Length is absent or inaccurate.
    if (!response.body) return [];
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > MAX_RESPONSE_BYTES) {
          await reader.cancel();
          return [];
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }

    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    const json: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (typeof json !== "object" || json === null || Array.isArray(json)) return [];
    const data = (json as Record<string, unknown>).data;
    if (!Array.isArray(data)) return [];
    return data.slice(0, LIMIT).flatMap((item): GifResult[] => {
      const result = parseGif(item);
      return result ? [result] : [];
    });
  } catch {
    // Search failure should never prevent the user from writing a message.
    return [];
  }
}
