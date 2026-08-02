import { DynamicIcon } from "@/components/dynamic-icon";
import { cn } from "@/lib/utils";
import { Nameplate } from "@/components/profile/nameplate";
import { UserAvatar } from "@/components/ui/avatar";
import { ProfileEffects } from "@/components/profile/profile-effects";
import { ProfileBackdrop } from "@/components/profile/profile-backdrop";
import { ProfileFrame } from "@/components/profile/profile-frame";
import { ProfileEntrance } from "@/components/profile/profile-entrance";
import { CursorTrail } from "@/components/profile/cursor-trail";
import { ProfileMusic } from "@/components/profile/profile-music";
import { bannerBackground } from "@/components/profile/profile-theme";
import type { ShopItem } from "@/types";

/**
 * A large, representative live preview of a cosmetic, rendered as a mock
 * profile card with the item applied in context (banner, nameplate, frame,
 * effect, badge or theme). Routes through the same components the profile uses
 * so the preview is true to the equipped result.
 */
export function CosmeticPreview({ item }: { item: ShopItem }) {
  const colors = item.preview?.colors ?? ["#8b5cf6", "#ec4899"];
  const grad = `linear-gradient(135deg, ${colors[0]}, ${colors[colors.length - 1]})`;
  const icon = item.preview?.icon ?? "sparkles";
  const isBanner = item.kind === "banner" || item.kind === "profile_theme";
  const isFrame = item.kind === "avatar_frame";
  const isNameplate = item.kind === "nameplate";
  const isEffect = item.kind === "effect";
  const isProfileFrame = item.kind === "profile_frame";
  const isDecoration = item.kind === "decoration";
  const isEntrance = item.kind === "entrance";
  const isTrail = item.kind === "cursor_trail";
  const isTrack = item.kind === "track";

  // For banner/theme items, drive the real backdrop off a synthetic equipped map.
  const equipped: Record<string, string> | undefined = isBanner
    ? { [item.kind === "banner" ? "banner" : "profile_theme"]: item.slug }
    : undefined;
  const bannerBg = isBanner ? bannerBackground(equipped) : undefined;

  return (
    <>
    {/* A trail is only itself when it is following a real pointer, so the
        preview arms the actual cosmetic for as long as this page is open. */}
    {isTrail && <CursorTrail slug={item.slug} />}
    <ProfileEntrance slug={isEntrance ? item.slug : undefined}>
    <ProfileFrame slug={isProfileFrame ? item.slug : undefined}>
    <div className="mx-auto w-full max-w-sm overflow-hidden rounded-3xl border border-border bg-card shadow-xl">
      {/* Banner */}
      <div
        className="relative h-28"
        style={bannerBg ? { background: bannerBg } : { background: "color-mix(in oklch, var(--muted) 80%, transparent)" }}
      >
        {isBanner && <ProfileBackdrop equipped={equipped} />}
        {isEffect && <ProfileEffects slug={item.slug} />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
      </div>

      {/* Avatar */}
      <div className="-mt-10 px-5">
        {isFrame || isDecoration ? (
          <UserAvatar
            name="SamplePlayer"
            frame={isFrame ? item.slug : undefined}
            decoration={isDecoration ? item.slug : undefined}
            className="size-20 border-4 border-card"
          />
        ) : (
          <div className="inline-grid size-20 place-items-center rounded-full bg-card p-1">
            <div className="grid size-full place-items-center rounded-full border-4 border-card bg-gradient-to-br from-primary/30 to-accent/30">
              <DynamicIcon name="user" className="size-8 text-foreground/70" />
            </div>
          </div>
        )}
      </div>

      {/* Identity */}
      <div className="space-y-1.5 px-5 pb-5 pt-2">
        {isNameplate ? (
          <Nameplate slug={item.slug} className="text-lg font-bold">
            <DynamicIcon name={icon} className="size-4" /> SamplePlayer
          </Nameplate>
        ) : (
          <p
            className="text-lg font-bold"
            style={item.kind === "profile_theme" ? { color: colors[0] } : undefined}
          >
            SamplePlayer
          </p>
        )}

        {item.kind === "badge" && (
          <span
            className={cn(
              "relative inline-flex items-center gap-1 overflow-hidden rounded-full px-2 py-0.5 text-xs font-semibold text-white",
            )}
            style={{ background: grad }}
          >
            <span
              className="pointer-events-none absolute -inset-y-1 -left-1/3 w-1/3 motion-safe:animate-sheen"
              style={{ background: "linear-gradient(100deg, transparent, rgba(255,255,255,0.5), transparent)" }}
              aria-hidden
            />
            <DynamicIcon name={icon} className="relative size-3" />{" "}
            <span className="relative">{item.name}</span>
          </span>
        )}

        {isTrack && <ProfileMusic slug={item.slug} />}

        <p className="text-sm text-muted-foreground">Level 12 · 3,400 credits</p>
      </div>
    </div>
    </ProfileFrame>
    </ProfileEntrance>
    </>
  );
}
