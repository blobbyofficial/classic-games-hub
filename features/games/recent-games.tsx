"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { GameWithMeta } from "@/types";
const KEY = "cgh.recent.games.v1";
const LIMIT = 6;
function readRecent(): string[] {
  try {
    const raw: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
    if (!Array.isArray(raw)) return [];
    return [...new Set(raw.filter((x): x is string => typeof x === "string" && /^[a-z0-9-]{1,100}$/.test(x)))].slice(0,LIMIT);
  } catch { return []; }
}
export function RecordRecentGame({slug}:{slug:string}) {
  useEffect(() => {
    if (!/^[a-z0-9-]{1,100}$/.test(slug)) return;
    try { window.localStorage.setItem(KEY,JSON.stringify([slug,...readRecent().filter(x => x!==slug)].slice(0,LIMIT))); }
    catch { /* Storage unavailable: game still works. */ }
  },[slug]);
  return null;
}
export function RecentGamesStrip({games}:{games:GameWithMeta[]}) {
  const [recent,setRecent] = useState<string[]>([]);
  useEffect(()=>{setRecent(readRecent());},[]);
  const lookup = new Map(games.filter(g=>g.status==="published").map(g=>[g.slug,g]));
  const matches = recent.map(slug=>lookup.get(slug)).filter((g):g is GameWithMeta=>Boolean(g));
  if (!matches.length) return null;
  return <section aria-label="Recently viewed games" className="space-y-2">
    <h2 className="text-sm font-semibold">Recently viewed</h2>
    <div className="flex gap-2 overflow-x-auto pb-2">{matches.map(g=><Link key={g.id} href={`/games/${g.slug}`} className="min-h-11 shrink-0 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium hover:border-primary/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">{g.title}</Link>)}</div>
  </section>;
}
