import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { SITE } from "@/lib/constants";

/**
 * Site-wide social preview. Deliberately mirrors the actual dark arcade UI:
 * restrained violet accents, crisp typography, useful facts and a clear CTA.
 *
 * The animated brand GIF is rendered into the card (social scrapers generally
 * flatten Open Graph images to a single frame). Do not advertise the OG PNG
 * itself as animated: that is not supported consistently by share platforms.
 */
export const runtime = "nodejs";
export const alt =
  "Classic Games Hub — pick a game, start playing. 26 games in the library, free browser play, leaderboards and achievements.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function brandArtwork(): Promise<string | null> {
  try {
    // Read the existing asset from the repo instead of depending on an external
    // image host or a self-fetch that can fail during a deployment build.
    const bytes = await readFile(join(process.cwd(), "public", "animated-icon.gif"));
    return `data:image/gif;base64,${bytes.toString("base64")}`;
  } catch {
    try {
      const bytes = await readFile(join(process.cwd(), "public", "icon.svg"));
      return `data:image/svg+xml;base64,${bytes.toString("base64")}`;
    } catch {
      return null;
    }
  }
}

function MiniStat({ value, label }: { value: string; label: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "0 30px",
        borderLeft: "1px solid #323039",
      }}
    >
      <div style={{ display: "flex", fontSize: 31, fontWeight: 800, letterSpacing: -1.2, color: "#fafafa" }}>
        {value}
      </div>
      <div style={{ display: "flex", marginTop: 5, fontSize: 17, color: "#a9a5b3" }}>
        {label}
      </div>
    </div>
  );
}

export default async function OpengraphImage() {
  const artwork = await brandArtwork();

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          flexDirection: "column",
          position: "relative",
          overflow: "hidden",
          background: "#0c0b10",
          color: "#fafafa",
          fontFamily: "sans-serif",
        }}
      >
        {/* Subtle ambient lighting instead of the old full-card purple wash. */}
        <div
          style={{
            position: "absolute",
            top: -290,
            right: -150,
            width: 760,
            height: 760,
            borderRadius: 999,
            background: "radial-gradient(circle, rgba(120,75,255,0.18) 0%, rgba(120,75,255,0) 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: 5,
            background: "linear-gradient(90deg,#8b5cf6 0%,#a78bfa 48%,#22d3ee 100%)",
          }}
        />

        <div style={{ display: "flex", alignItems: "center", margin: "47px 66px 0", gap: 14 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 48,
              height: 48,
              borderRadius: 12,
              overflow: "hidden",
              border: "1px solid #39343f",
              background: "#000",
            }}
          >
            {artwork ? (
              <img src={artwork} width={48} height={48} style={{ width: 48, height: 48, objectFit: "contain" }} />
            ) : (
              <div style={{ display: "flex", width: 16, height: 16, borderRadius: 5, background: "#a78bfa" }} />
            )}
          </div>
          <div style={{ display: "flex", fontSize: 23, fontWeight: 800, letterSpacing: -0.7 }}>
            {SITE.name}
          </div>
          <div
            style={{
              display: "flex",
              marginLeft: "auto",
              padding: "10px 17px",
              border: "1px solid #38343e",
              borderRadius: 999,
              color: "#c3becd",
              fontSize: 17,
            }}
          >
            FREE BROWSER ARCADE
          </div>
        </div>

        <div style={{ display: "flex", flex: 1, alignItems: "center", padding: "12px 66px 20px", gap: 36 }}>
          <div style={{ display: "flex", flexDirection: "column", width: 700, flexShrink: 0 }}>
            <div style={{ display: "flex", fontSize: 19, fontWeight: 700, letterSpacing: 3.2, color: "#bca4ff" }}>
              YOUR NEXT HIGH SCORE STARTS HERE
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                marginTop: 16,
                fontSize: 76,
                fontWeight: 850,
                letterSpacing: -4.3,
                lineHeight: 1.02,
              }}
            >
              <div style={{ display: "flex" }}>Pick a game.</div>
              <div style={{ display: "flex", color: "#a78bfa" }}>Start playing.</div>
            </div>
            <div style={{ display: "flex", marginTop: 22, maxWidth: 675, fontSize: 25, color: "#c0bbc9", lineHeight: 1.35 }}>
              Classic favourites, achievements and leaderboards. All in your browser.
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                alignSelf: "flex-start",
                background: "#eee9ff",
                borderRadius: 13,
                color: "#1b102e",
                padding: "15px 23px",
                marginTop: 29,
                fontSize: 23,
                fontWeight: 800,
                gap: 15,
              }}
            >
              Play now <span style={{ fontSize: 27 }}>→</span>
            </div>
          </div>

          {/* The actual animated GIF, not a lookalike joystick illustration.
              next/og uses a single decoded frame for its PNG output. */}
          <div
            style={{
              display: "flex",
              position: "relative",
              width: 298,
              height: 298,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 42,
              border: "1px solid #37313f",
              background: "#000",
              boxShadow: "0 24px 80px rgba(90, 56, 178, 0.23)",
              overflow: "hidden",
              transform: "rotate(-5deg)",
            }}
          >
            {artwork ? (
              <img
                src={artwork}
                width={280}
                height={280}
                style={{ display: "flex", width: 280, height: 280, objectFit: "contain" }}
              />
            ) : (
              <div style={{ display: "flex", fontSize: 112, fontWeight: 900, color: "#a78bfa" }}>CG</div>
            )}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            height: 111,
            margin: "0 66px 29px",
            background: "#17151d",
            border: "1px solid #302c37",
            borderRadius: 18,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", padding: "0 32px", width: 272 }}>
            <div style={{ display: "flex", fontSize: 31, fontWeight: 800, letterSpacing: -1.2 }}>26</div>
            <div style={{ display: "flex", marginTop: 5, fontSize: 17, color: "#a9a5b3" }}>Games in the library</div>
          </div>
          <MiniStat value="100%" label="Free to play" />
          <MiniStat value="XP + rewards" label="Progress as you play" />
          <div style={{ display: "flex", marginLeft: "auto", paddingRight: 30, fontSize: 19, color: "#a78bfa", fontWeight: 700 }}>
            classic-games-hub.blobbyofficial.com
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
