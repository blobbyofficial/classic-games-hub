import { DynamicIcon } from "@/components/dynamic-icon";
import { cn } from "@/lib/utils";
import type { ShopItem } from "@/types";

/**
 * A large, representative live preview of a cosmetic, rendered as a mock
 * profile card with the item applied in context (banner, nameplate, frame,
 * effect, badge or theme). Presentational only.
 */
export function CosmeticPreview({ item }: { item: ShopItem }) {
  const colors = item.preview?.colors ?? ["#8b5cf6", "#ec4899"];
  const grad = `linear-gradient(135deg, ${colors[0]}, ${colors[colors.length - 1]})`;
  const icon = item.preview?.icon ?? "sparkles";
  const isBanner = item.kind === "banner" || item.kind === "profile_theme";
  const isFrame = item.kind === "avatar_frame";
  const isNameplate = item.kind === "nameplate";
  const isEffect = item.kind === "effect";

  return (
    <div className="mx-auto w-full max-w-sm overflow-hidden rounded-3xl border border-border bg-card shadow-xl">
      {/* Banner */}
      <div
        className="relative h-28"
        style={isBanner ? { background: grad } : { background: "color-mix(in oklch, var(--muted) 80%, transparent)" }}
      >
        {isEffect && <EffectOverlay colors={colors} />}
      </div>

      {/* Avatar */}
      <div className="-mt-10 px-5">
        <div
          className={cn("inline-grid size-20 place-items-center rounded-full p-1", isFrame ? "" : "bg-card")}
          style={isFrame ? { background: grad } : undefined}
        >
          <div className="grid size-full place-items-center rounded-full border-4 border-card bg-gradient-to-br from-primary/30 to-accent/30">
            <DynamicIcon name="user" className="size-8 text-foreground/70" />
          </div>
        </div>
      </div>

      {/* Identity */}
      <div className="space-y-1.5 px-5 pb-5 pt-2">
        {isNameplate ? (
          <span
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-lg font-bold text-white shadow-sm"
            style={{ background: grad }}
          >
            <DynamicIcon name={icon} className="size-4" /> SamplePlayer
          </span>
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
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold text-white"
            style={{ background: grad }}
          >
            <DynamicIcon name={icon} className="size-3" /> {item.name}
          </span>
        )}

        <p className="text-sm text-muted-foreground">Level 12 · 3,400 credits</p>
      </div>
    </div>
  );
}

/** A soft, always-on animated overlay standing in for a profile effect. */
function EffectOverlay({ colors }: { colors: string[] }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <span
        className="absolute -left-6 top-2 size-16 rounded-full opacity-60 blur-xl motion-safe:animate-pulse"
        style={{ background: colors[0] }}
      />
      <span
        className="absolute right-4 top-6 size-10 rounded-full opacity-70 blur-lg motion-safe:animate-bounce"
        style={{ background: colors[colors.length - 1] }}
      />
      <span
        className="absolute bottom-2 left-1/2 size-8 rounded-full opacity-50 blur-md motion-safe:animate-ping"
        style={{ background: colors[Math.floor(colors.length / 2)] }}
      />
    </div>
  );
}
