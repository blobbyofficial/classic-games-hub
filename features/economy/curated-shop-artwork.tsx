import type { ShopItem } from "@/types";

/** Original, slug-specific vector catalogue artwork for the curated shop. */
const art: Record<string,{accent:string;secondary:string;shape:string}> = {
 "frame-neon-ring":{accent:"#42d8da",secondary:"#116f86",shape:"rings"},
 "frame-violet-pulse":{accent:"#b69aff",secondary:"#6040b6",shape:"pulse"},
 "badge-champion":{accent:"#f0bb66",secondary:"#895422",shape:"medal"},
 "banner-nebula":{accent:"#9c89ff",secondary:"#236891",shape:"galaxy"},
 "trail-comet":{accent:"#8ee9f2",secondary:"#437bcd",shape:"comet"},
 "deco-crown":{accent:"#eac17b",secondary:"#93612e",shape:"crown"},
 "deco-headphones":{accent:"#a8d2d3",secondary:"#477480",shape:"headphones"},
 "effect-matrix":{accent:"#8ee3a0",secondary:"#376957",shape:"matrix"},
 "effect-fireflies":{accent:"#edcf81",secondary:"#637a49",shape:"fireflies"},
 "entrance-glitch":{accent:"#f1a0ce",secondary:"#4faddb",shape:"glitch"},
 "nameplate-cyber":{accent:"#81d6ec",secondary:"#315879",shape:"nameplate"},
 "pframe-obsidian":{accent:"#afbac6",secondary:"#313a48",shape:"obsidian"},
 "pframe-prism":{accent:"#c7a7f5",secondary:"#5fbbd2",shape:"prism"},
 "theme-deep-space":{accent:"#92acf2",secondary:"#4f4695",shape:"space"},
 "track-neon-drift":{accent:"#ee9bba",secondary:"#426c9d",shape:"record"},
};

function Motif({kind,a,b}:{kind:string;a:string;b:string}) {
 switch(kind) {
  case "rings": return <><circle cx="80" cy="69" r="39" fill="none" stroke={a} strokeWidth="8"/><circle cx="80" cy="69" r="29" fill="none" stroke={b} strokeWidth="2" strokeDasharray="3 6"/><circle cx="80" cy="69" r="23" fill="#252d33"/><path d="M48 42L56 34M112 42l-8-8" stroke="#fff" opacity=".65" strokeWidth="3"/></>;
  case "pulse": return <><circle cx="80" cy="68" r="38" fill="none" stroke={b} strokeWidth="9"/><circle cx="80" cy="68" r="35" fill="none" stroke={a} strokeWidth="3"/><path d="M38 69h20l8-13 9 29 9-35 10 19h27" fill="none" stroke={a} strokeWidth="4" strokeLinecap="round"/></>;
  case "medal":return <><path d="M58 27l13 25h19l13-25" fill={b}/><circle cx="80" cy="76" r="30" fill={b} stroke={a} strokeWidth="5"/><path d="M80 56l6 13 15 2-11 11 3 15-13-7-13 7 3-15-11-11 15-2z" fill={a}/></>;
  case "galaxy":return <><rect x="29" y="29" width="102" height="76" rx="6" fill="#171d38" stroke={a} strokeWidth="2"/><ellipse cx="80" cy="67" rx="40" ry="15" transform="rotate(-28 80 67)" fill="none" stroke={a} strokeWidth="7" opacity=".65"/><circle cx="80" cy="67" r="15" fill={b}/><circle cx="80" cy="67" r="6" fill="#e4d1e8"/><g fill="#f1e6cf"><circle cx="43" cy="42" r="2"/><circle cx="116" cy="89" r="2"/><circle cx="104" cy="39" r="1.5"/></g></>;
  case "comet":return <><path d="M23 93Q60 30 109 55M23 107Q65 47 108 66M35 110Q71 78 109 72" stroke={b} strokeWidth="4" fill="none" opacity=".7"/><path d="M110 43l9 14 18 4-13 11-1 17-14-10-16 5 5-16-9-13 18-1z" fill={a}/></>;
  case "crown":return <><path d="M31 52l11 21 14-35 24 27 24-27 14 35 11-21-7 51H38z" fill={b} stroke={a} strokeWidth="4" strokeLinejoin="round"/><path d="M43 93h74" stroke={a} strokeWidth="6"/><circle cx="80" cy="80" r="6" fill={a}/></>;
  case "headphones":return <><path d="M40 81V65a40 40 0 0 1 80 0v16" fill="none" stroke={a} strokeWidth="9" strokeLinecap="round"/><rect x="32" y="73" width="20" height="34" rx="7" fill={b} stroke={a} strokeWidth="3"/><rect x="108" y="73" width="20" height="34" rx="7" fill={b} stroke={a} strokeWidth="3"/></>;
  case "matrix":return <><g stroke={a} strokeWidth="3" opacity=".8"><path d="M47 35v55m18-48v67m19-78v61m20-40v59m17-77v60"/></g><g fill={a}><rect x="44" y="52" width="6" height="12"/><rect x="62" y="85" width="6" height="12"/><rect x="81" y="56" width="6" height="12"/><rect x="101" y="70" width="6" height="12"/><rect x="118" y="43" width="6" height="12"/></g></>;
  case "fireflies":return <><path d="M25 98Q55 52 86 87T137 39" stroke={b} strokeWidth="2" fill="none" strokeDasharray="4 7"/><g fill={a}><circle cx="42" cy="60" r="7"/><circle cx="89" cy="83" r="5"/><circle cx="118" cy="46" r="8"/><circle cx="65" cy="39" r="3"/></g><g fill="#fff5c4" opacity=".45"><circle cx="42" cy="60" r="12"/><circle cx="118" cy="46" r="14"/></g></>;
  case "glitch":return <><path d="M51 37h63v62H51z" fill="none" stroke={a} strokeWidth="6"/><path d="M37 49h48M69 71h65M42 94h53" stroke={b} strokeWidth="9"/><path d="M65 30v20m31 39v22" stroke="#ebd8c0" strokeWidth="3"/></>;
  case "nameplate":return <><path d="M22 50l12-13h94l10 13v41l-10 12H34L22 91z" fill="#172b34" stroke={a} strokeWidth="3"/><path d="M34 58h92m-92 26h92" stroke={b} strokeWidth="2"/><text x="80" y="78" textAnchor="middle" fontSize="15" fontWeight="700" fill={a}>PLAYER 01</text></>;
  case "obsidian":return <><rect x="33" y="23" width="94" height="95" rx="6" stroke={a} strokeWidth="7" fill="#1e252d"/><rect x="44" y="34" width="72" height="72" rx="3" stroke={b} strokeWidth="2" fill="#121920"/><circle cx="80" cy="60" r="12" fill="#525e6c"/><path d="M55 91q25-36 50 0" fill="#525e6c"/><path d="M39 30h18M103 111h16" stroke="#fff" opacity=".6" strokeWidth="2"/></>;
  case "prism":return <><path d="M80 20l43 74-43 27-43-27z" fill="#262a45" stroke={a} strokeWidth="4"/><path d="M80 20v101M37 94l43-19 43 19" stroke={b} strokeWidth="3"/><path d="M80 20L37 94l43-19 43 19z" fill={a} opacity=".35"/></>;
  case "space":return <><circle cx="81" cy="67" r="39" fill="#27224c" stroke={b} strokeWidth="3"/><path d="M32 83c25-32 58-44 99-39" stroke={a} strokeWidth="5" fill="none"/><g fill="#eee7d7"><circle cx="63" cy="55" r="2"/><circle cx="112" cy="74" r="3"/><circle cx="93" cy="38" r="2"/><circle cx="49" cy="93" r="2"/></g></>;
  case "record":return <><rect x="35" y="22" width="91" height="93" rx="4" fill="#282735" stroke={a} strokeWidth="3"/><circle cx="81" cy="68" r="36" fill="#10191f" stroke={b} strokeWidth="3"/><circle cx="81" cy="68" r="18" fill={b}/><circle cx="81" cy="68" r="4" fill="#eee6d6"/><path d="M49 67a32 32 0 0 1 25-30" fill="none" stroke={a} strokeWidth="2"/></>;
  default:return null;
 }
}

export function CuratedShopArtwork({item}:{item:ShopItem}) {
 const design=art[item.slug];
 if(!design)return null;
 return <div className="relative grid h-full w-full place-items-center overflow-hidden bg-[#151b20]" aria-hidden="true">
  <svg viewBox="0 0 160 138" className="h-full max-h-40 w-auto max-w-full" role="presentation">
   <rect x="11" y="10" width="138" height="118" rx="6" fill="#1d252b" stroke="#42494b" strokeWidth="1"/>
   <path d="M17 116h126" stroke={design.secondary} strokeWidth="1" opacity=".5"/>
   <Motif kind={design.shape} a={design.accent} b={design.secondary}/>
  </svg>
  <div className="pointer-events-none absolute left-3 bottom-2 max-w-[78%] truncate text-[10px] font-semibold tracking-[.12em] text-[#d8d5cd] uppercase">{item.name}</div>
 </div>;
}
