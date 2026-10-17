import { DynamicIcon } from "@/components/dynamic-icon";
import { CuratedShopArtwork } from "./curated-shop-artwork";
import type { ShopItem } from "@/types";

/**
 * One illustrated product photograph language for the store: dark museum-style
 * backing, a physical object silhouette and item-specific pigments and symbol.
 * No generic multicolour gradient tiles; all colours come from the item record.
 */
const CURATED_SLUGS = new Set([
  "frame-neon-ring","frame-violet-pulse","badge-champion","banner-nebula",
  "trail-comet","deco-crown","deco-headphones","effect-matrix",
  "effect-fireflies","entrance-glitch","nameplate-cyber","pframe-obsidian",
  "pframe-prism","theme-deep-space","track-neon-drift",
]);

export function ShopArtwork({ item }: { item: ShopItem }) {
  if (CURATED_SLUGS.has(item.slug)) return <CuratedShopArtwork item={item} />;
  const pigments = item.preview?.colors ?? ["#9a8a6f", "#39423f"];
  const first = pigments[0] ?? "#9a8a6f";
  const second = pigments[1] ?? "#39423f";
  const icon = item.preview?.icon ?? "sparkles";
  const circular = item.kind === "avatar_frame" || item.kind === "decoration";
  const profile = item.kind === "profile_frame";
  const panel = ["profile_theme", "banner", "effect"].includes(item.kind);
  const plate = item.kind === "nameplate" || item.kind === "badge";
  const music = item.kind === "track";
  const motion = item.kind === "entrance" || item.kind === "cursor_trail";
  const boost = item.kind === "xp_boost" || item.kind === "credit_boost";
  const outerLabel = item.kind.replaceAll("_", " ").toUpperCase();
  return (
    <div
      className="relative isolate flex h-full min-h-32 w-full items-center justify-center overflow-hidden bg-[#151a1b] p-5 text-[#f2eadb]"
      style={{ "--item-ink": first, "--item-shadow": second } as React.CSSProperties}
      aria-hidden="true"
    >
      <div className="pointer-events-none absolute inset-3 border border-white/[0.08]" />
      <div className="pointer-events-none absolute left-5 top-4 text-[9px] font-semibold tracking-[0.18em] text-white/45">
        ARCADE / COLLECTION
      </div>
      <div className="pointer-events-none absolute bottom-4 right-5 max-w-[65%] truncate text-right font-mono text-[9px] tracking-[0.12em] text-white/45">
        {outerLabel}
      </div>

      {circular ? (
        <div className="relative grid size-[88px] place-items-center rounded-full border-[7px] bg-[#212627] shadow-[0_12px_26px_#0008]"
          style={{ borderColor: first, outline: `2px solid ${second}`, outlineOffset: "4px" }}>
          <div className="grid size-[58px] place-items-center rounded-full bg-[#11181a]">
            <DynamicIcon name={item.kind === "decoration" ? icon : "user-round"} className="size-8" style={{ color: second }} />
          </div>
        </div>
      ) : profile ? (
        <div className="relative flex h-[91px] w-[120px] flex-col overflow-hidden rounded-[7px] border-[5px] bg-[#202729] shadow-[0_10px_26px_#0009]"
          style={{ borderColor: first, boxShadow: `0 0 0 2px ${second}, 0 10px 25px #0008` }}>
          <div className="h-8" style={{ background: `linear-gradient(120deg, ${second}, #252a2c)` }} />
          <div className="flex items-center gap-2 px-3 pt-2"><div className="size-6 rounded-full" style={{ backgroundColor:first }}/><div className="h-1.5 w-11 rounded-full bg-white/30" /></div>
        </div>
      ) : panel ? (
        <div className="relative h-[86px] w-[150px] overflow-hidden rounded-md border border-white/20 shadow-[0_12px_25px_#0009]"
          style={{ background: `linear-gradient(130deg, ${first}, ${second})` }}>
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          <div className="absolute bottom-2 left-3 text-white/90"><DynamicIcon name={icon} className="size-7" /></div>
          <div className="absolute bottom-2 right-3 h-0.5 w-9 bg-white/50" />
        </div>
      ) : plate ? (
        <div className="flex min-h-12 min-w-32 items-center justify-center gap-2 rounded border-2 bg-[#22282a] px-4 py-2 shadow-[0_12px_24px_#0008]"
          style={{ borderColor:first }}>
          <DynamicIcon name={icon} className="size-6" style={{ color:first }} />
          <span className="max-w-24 truncate text-xs font-bold tracking-tight text-white">{item.name}</span>
        </div>
      ) : music ? (
        <div className="relative grid size-[92px] place-items-center rounded-md border-4 bg-[#202628] shadow-[0_12px_26px_#0009]"
          style={{ borderColor:first }}>
          <div className="grid size-14 place-items-center rounded-full border-[9px] border-[#111618]" style={{ backgroundColor:second }}>
            <div className="size-3 rounded-full bg-[#e7ddd0]" />
          </div>
        </div>
      ) : motion ? (
        <div className="relative flex items-center gap-2">
          {[0,1,2].map((i) => <span key={i} className="size-4 rounded-full" style={{ backgroundColor:i===2?first:second, opacity:(i+1)/3 }} />)}
          <DynamicIcon name={icon} className="ml-2 size-10" style={{ color:first }} />
        </div>
      ) : boost ? (
        <div className="relative grid size-20 place-items-center rounded-xl border-2 bg-[#212626] shadow-[0_12px_24px_#0008]" style={{ borderColor:first }}>
          <DynamicIcon name={item.kind === "xp_boost" ? "zap" : "coins"} className="size-10" style={{color:first}} />
        </div>
      ) : (
        <div className="grid size-20 place-items-center rounded-lg border-2 bg-[#22282a]" style={{borderColor:first}}>
          <DynamicIcon name={icon} className="size-9" style={{color:first}} />
        </div>
      )}
    </div>
  );
}
