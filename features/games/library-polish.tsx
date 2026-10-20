"use client";
import { useEffect, useState } from "react";
/** Safely highlight the first title match without interpreting the query as HTML. */
export function HighlightMatch({ text, query }: { text: string; query?: string }) {
  const term = query?.trim();
  if (!term) return <>{text}</>;
  const index = text.toLocaleLowerCase().indexOf(term.toLocaleLowerCase());
  if (index < 0) return <>{text}</>;
  return <>{text.slice(0,index)}<mark className="rounded-sm bg-primary/20 text-inherit">{text.slice(index,index+term.length)}</mark>{text.slice(index+term.length)}</>;
}
/** Off until scrolled far enough; respects system and account reduced-motion preferences. */
export function LibraryBackToTop() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    let raf = 0;
    const update = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => { raf=0;setVisible(window.scrollY > 700); });
    };
    update(); window.addEventListener("scroll",update,{passive:true});
    return () => { window.removeEventListener("scroll",update);if(raf)window.cancelAnimationFrame(raf); };
  },[]);
  if (!visible) return null;
  return <button type="button" aria-label="Back to top of the page" onClick={() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset.reducedMotion === "true";
    window.scrollTo({top:0,behavior:reduced?"auto":"smooth"});
  }} className="fixed bottom-24 right-4 z-30 rounded-full border border-border bg-card px-4 py-3 text-sm font-semibold shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring lg:bottom-5">↑ Back to top</button>;
}
