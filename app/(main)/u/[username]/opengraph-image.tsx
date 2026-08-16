import { ImageResponse } from "next/og";
import { createPublicClient } from "@/lib/supabase/server";
import { OG, OG_SIZE, OG_GRADIENT_TEXT, imageData, monogram, ogNumber } from "@/lib/og";
import { levelProgress } from "@/lib/utils";
import { SITE } from "@/lib/constants";
import type { ProfileStats } from "@/types";

/**
 * The card a profile link turns into when someone pastes it into Discord.
 *
 * This is the share surface that matters most on the site: profiles are what
 * people send each other. A generic site card there wastes every one of those
 * posts, so this one carries the things a player would actually want shown off
 * - their name, their level and how far into it they are, and four numbers.
 *
 * Read through the anon client on purpose (see createPublicClient): the card is
 * identical for everybody, so it should be cacheable rather than rendered per
 * viewer, and it must never pick up the session of whoever triggered it.
 */

// Explicit because lib/og.ts uses Buffer to inline the avatar.
export const runtime = "nodejs";
export const alt = "Player profile";
export const size = OG_SIZE;
export const contentType = "image/png";

const STAT_LABELS: Array<{ key: keyof ProfileStats; label: string }> = [
  { key: "total_plays", label: "Games played" },
  { key: "games_played", label: "Different games" },
  { key: "achievements", label: "Achievements" },
  { key: "friends", label: "Friends" },
];

export default async function ProfileCard({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const supabase = createPublicClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, bio, level, xp")
    .eq("username", username)
    .maybeSingle();

  // A card for a profile that is not there is still better than a 500 - the
  // crawler gets a valid image and the link simply looks unremarkable.
  if (!profile) {
    return new ImageResponse(
      (
        <div style={fallbackStyle}>
          <div style={{ display: "flex", fontSize: 64, fontWeight: 800, ...OG_GRADIENT_TEXT }}>
            {SITE.name}
          </div>
          <div style={{ display: "flex", fontSize: 30, color: OG.inkMuted, marginTop: 16 }}>
            No player called @{username}
          </div>
        </div>
      ),
      { ...size },
    );
  }

  const { data: statsData } = await supabase.rpc("profile_stats", { p_user: profile.id });
  const stats = (statsData as unknown as ProfileStats | null) ?? {
    total_plays: 0,
    games_played: 0,
    achievements: 0,
    friends: 0,
    best_game: null,
  };

  const name = profile.display_name ?? profile.username;
  const avatar = await imageData(profile.avatar_url);
  const { percent, current, needed } = levelProgress(profile.xp, profile.level);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: OG.bg,
          color: OG.ink,
          fontFamily: "sans-serif",
          padding: 64,
        }}
      >
        {/* Identity */}
        <div style={{ display: "flex", alignItems: "center", gap: 36 }}>
          {avatar ? (
            <img
              src={avatar}
              width={180}
              height={180}
              style={{
                width: 180,
                height: 180,
                borderRadius: 90,
                border: `4px solid ${OG.violet}`,
                objectFit: "cover",
              }}
            />
          ) : (
            <div
              style={{
                width: 180,
                height: 180,
                borderRadius: 90,
                border: `4px solid ${OG.violet}`,
                background: OG.surface,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 84,
                fontWeight: 800,
                color: OG.violet,
              }}
            >
              {monogram(name)}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <div
              style={{
                display: "flex",
                fontSize: name.length > 18 ? 54 : 68,
                fontWeight: 800,
                letterSpacing: -2,
                lineHeight: 1.05,
              }}
            >
              {name}
            </div>
            <div style={{ display: "flex", fontSize: 30, color: OG.inkFaint, marginTop: 6 }}>
              @{profile.username}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: OG.surface,
              border: `1px solid ${OG.border}`,
              borderRadius: 20,
              padding: "18px 30px",
            }}
          >
            <div style={{ display: "flex", fontSize: 18, color: OG.inkFaint, letterSpacing: 2 }}>
              LEVEL
            </div>
            <div style={{ display: "flex", fontSize: 66, fontWeight: 800, ...OG_GRADIENT_TEXT }}>
              {profile.level}
            </div>
          </div>
        </div>

        {/* Progress toward the next level */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 22, color: OG.inkFaint }}>
            <span>Progress to level {profile.level + 1}</span>
            <span>
              {ogNumber(current)} / {ogNumber(needed)} XP
            </span>
          </div>
          <div
            style={{
              display: "flex",
              width: "100%",
              height: 18,
              borderRadius: 9,
              background: "rgba(255,255,255,0.08)",
            }}
          >
            <div
              style={{
                display: "flex",
                width: `${Math.max(percent, 2)}%`,
                height: "100%",
                borderRadius: 9,
                backgroundImage: `linear-gradient(90deg, ${OG.violet}, ${OG.cyan})`,
              }}
            />
          </div>
        </div>

        {/* Four numbers */}
        <div style={{ display: "flex", gap: 16 }}>
          {STAT_LABELS.map(({ key, label }) => (
            <div
              key={key}
              style={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
                background: OG.surface,
                border: `1px solid ${OG.border}`,
                borderRadius: 16,
                padding: "18px 22px",
              }}
            >
              <div style={{ display: "flex", fontSize: 40, fontWeight: 750 }}>
                {ogNumber(Number(stats[key] ?? 0))}
              </div>
              <div style={{ display: "flex", fontSize: 20, color: OG.inkFaint, marginTop: 2 }}>
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* Footer: best game if there is one, wordmark either way */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 24,
            color: OG.inkFaint,
          }}
        >
          <div style={{ display: "flex" }}>
            {stats.best_game
              ? `Best at ${stats.best_game.title} - ${ogNumber(stats.best_game.score)}`
              : "Free to play - no pay-to-win, ever"}
          </div>
          <div style={{ display: "flex", fontWeight: 700, ...OG_GRADIENT_TEXT }}>{SITE.name}</div>
        </div>
      </div>
    ),
    { ...size },
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
