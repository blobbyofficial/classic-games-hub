import { ImageResponse } from "next/og";
import { SITE } from "@/lib/constants";

/**
 * Social share card (Open Graph / Twitter). Generated at build time - no
 * runtime cost - and automatically wired to <meta property="og:image"> by
 * the App Router.
 */

export const alt = `${SITE.name} - play the classics`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #151320 0%, #1d1830 55%, #2a1745 100%)",
          color: "#faf9fc",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 60,
            display: "flex",
            gap: 28,
            fontSize: 54,
            opacity: 0.9,
          }}
        >
          <span>🕹️</span>
          <span>🎮</span>
          <span>👾</span>
          <span>🏆</span>
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 92,
            fontWeight: 800,
            letterSpacing: -2,
            backgroundImage: "linear-gradient(90deg, #a78bfa, #7a3dff, #22d3ee)",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          Classic Games Hub
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 28,
            fontSize: 34,
            color: "#c4bfd4",
            textAlign: "center",
            maxWidth: 900,
          }}
        >
          23 classic games · credits &amp; XP · achievements · leaderboards · friends
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 52,
            display: "flex",
            fontSize: 26,
            color: "#8b85a0",
          }}
        >
          Free to play · no pay-to-win, ever
        </div>
      </div>
    ),
    { ...size },
  );
}
