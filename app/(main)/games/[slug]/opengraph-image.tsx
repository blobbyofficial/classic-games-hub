import { ImageResponse } from "next/og";
import { createPublicClient } from "@/lib/supabase/server";
import { OG, OG_SIZE, OG_GRADIENT_TEXT, imageData, monogram, ogNumber } from "@/lib/og";
import { SITE } from "@/lib/constants";

/**
 * The card a game link turns into when it is shared.
 *
 * Until now this was the raw thumbnail, straight from `openGraph.images` in the
 * page's metadata. That is a 1:1 image being cropped into a 1.91:1 slot by
 * whichever platform is rendering it, with no title, no context and no
 * indication it is playable in a browser. This puts the thumbnail in a frame
 * that fits, next to the things that make someone click: what it is, and how
 * many people are playing it.
 */

// Explicit because lib/og.ts uses Buffer to inline the thumbnail.
export const runtime = "nodejs";
export const alt = "Play free in your browser";
export const size = OG_SIZE;
export const contentType = "image/png";

const DIFFICULTY_LABEL: Record<string, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

export default async function GameCard({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = createPublicClient();

  const { data: game } = await supabase
    .from("games")
    .select("slug, title, tagline, description, category, difficulty, thumbnail_url, play_count, rating_sum, rating_count, status")
    .eq("slug", slug)
    .maybeSingle();

  if (!game) {
    return new ImageResponse(
      (
        <div style={fallbackStyle}>
          <div style={{ display: "flex", fontSize: 64, fontWeight: 800, ...OG_GRADIENT_TEXT }}>
            {SITE.name}
          </div>
          <div style={{ display: "flex", fontSize: 30, color: OG.inkMuted, marginTop: 16 }}>
            That game is not here
          </div>
        </div>
      ),
      { ...size },
    );
  }

  const thumb = await imageData(game.thumbnail_url);
  const rating = game.rating_count > 0 ? game.rating_sum / game.rating_count : 0;
  const blurb = game.tagline ?? game.description ?? `Play ${game.title} free in your browser.`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          gap: 56,
          background: OG.bg,
          color: OG.ink,
          fontFamily: "sans-serif",
          padding: 64,
        }}
      >
        {/* Thumbnail, squared off so nothing crops it awkwardly */}
        {thumb ? (
          <img
            src={thumb}
            width={380}
            height={380}
            style={{
              width: 380,
              height: 380,
              borderRadius: 28,
              border: `4px solid ${OG.border}`,
              objectFit: "cover",
              flexShrink: 0,
            }}
          />
        ) : (
          <div
            style={{
              width: 380,
              height: 380,
              borderRadius: 28,
              border: `4px solid ${OG.border}`,
              background: OG.surface,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 150,
              fontWeight: 800,
              color: OG.violet,
              flexShrink: 0,
            }}
          >
            {/* A letter, not an emoji: next/og ships no emoji font, so a 🕹️
                here renders as an empty box (or nothing at all). */}
            {monogram(game.title)}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div
            style={{
              display: "flex",
              fontSize: 22,
              letterSpacing: 3,
              color: OG.violet,
              textTransform: "uppercase",
            }}
          >
            {game.status === "coming_soon" ? "Coming soon" : "Play free in your browser"}
          </div>

          <div
            style={{
              display: "flex",
              fontSize: game.title.length > 16 ? 68 : 84,
              fontWeight: 800,
              letterSpacing: -3,
              lineHeight: 1.02,
              marginTop: 10,
            }}
          >
            {game.title}
          </div>

          <div
            style={{
              display: "flex",
              fontSize: 28,
              color: OG.inkMuted,
              marginTop: 16,
              lineHeight: 1.35,
              maxWidth: 640,
            }}
          >
            {blurb.length > 110 ? `${blurb.slice(0, 107)}...` : blurb}
          </div>

          {/* Facts worth having on a share card, and only the ones that exist */}
          <div style={{ display: "flex", gap: 12, marginTop: 30, flexWrap: "wrap" }}>
            <Pill text={game.category} />
            {DIFFICULTY_LABEL[game.difficulty] && <Pill text={DIFFICULTY_LABEL[game.difficulty]} />}
            {game.play_count > 0 && <Pill text={`${ogNumber(game.play_count)} plays`} />}
            {game.rating_count > 0 && (
              <Pill text={`Rated ${rating.toFixed(1)} / 5 (${ogNumber(game.rating_count)})`} gold />
            )}
          </div>

          <div
            style={{
              display: "flex",
              fontSize: 24,
              fontWeight: 700,
              marginTop: 34,
              ...OG_GRADIENT_TEXT,
            }}
          >
            {SITE.name}
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}

function Pill({ text, gold = false }: { text: string; gold?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        background: OG.surface,
        border: `1px solid ${OG.border}`,
        borderRadius: 999,
        padding: "10px 22px",
        fontSize: 24,
        color: gold ? OG.gold : OG.inkMuted,
        textTransform: "capitalize",
      }}
    >
      {text}
    </div>
  );
}

const fallbackStyle = {
  width: "100%",
  height: "100%",
  display: "flex",
  flexDirection: "column" as const,
  alignItems: "center",
  justifyContent: "center",
  background: OG.bg,
  color: OG.ink,
  fontFamily: "sans-serif",
};
