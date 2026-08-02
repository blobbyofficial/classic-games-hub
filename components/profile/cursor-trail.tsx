"use client";

import { useEffect, useRef } from "react";

/**
 * The equipped `cursor_trail` cosmetic: particles that follow the pointer
 * while someone is looking at your profile (roadmap v1.5.0).
 *
 * One canvas rather than a swarm of DOM nodes - a trail spawns particles on
 * every pointer move, and thirty absolutely-positioned spans being created and
 * destroyed at that rate is exactly the kind of thing the v1.4.1 performance
 * pass was undoing. The canvas is fixed, pointer-events-none, and sits under
 * the navbar so it can never swallow a click or cover a menu.
 *
 * The loop only runs while there is something to draw: it stops itself once
 * the last particle dies and restarts on the next pointer move, so an idle
 * profile costs nothing.
 */

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
}

interface TrailStyle {
  colours: string[];
  /** Particles spawned per pointer move. */
  rate: number;
  size: [number, number];
  life: [number, number];
  /** Upward drift, in pixels per second. Negative rises. */
  gravity: number;
  shape: "spark" | "dot" | "bubble";
  /** Draws a connected line through recent positions instead of particles. */
  ribbon?: boolean;
}

const TRAILS: Record<string, TrailStyle> = {
  "trail-sparkle": {
    colours: ["#fbbf24", "#fde68a", "#fff7ed"],
    rate: 2,
    size: [1.5, 3.5],
    life: [0.45, 0.85],
    gravity: -18,
    shape: "spark",
  },
  "trail-comet": {
    colours: ["#22d3ee", "#7a3dff", "#a5f3fc"],
    rate: 3,
    size: [2, 5],
    life: [0.35, 0.7],
    gravity: 40,
    shape: "dot",
  },
  "trail-bubbles": {
    colours: ["#38bdf8", "#a5f3fc", "#e0f2fe"],
    rate: 1,
    size: [3, 8],
    life: [0.8, 1.5],
    gravity: -55,
    shape: "bubble",
  },
  "trail-ribbon": {
    colours: ["#f472b6", "#a855f7"],
    rate: 0,
    size: [0, 0],
    life: [0.35, 0.35],
    gravity: 0,
    shape: "dot",
    ribbon: true,
  },
};

export function hasCursorTrail(slug?: string | null): boolean {
  return Boolean(slug && slug in TRAILS);
}

export function CursorTrail({ slug, reduced }: { slug?: string | null; reduced?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const style = slug ? TRAILS[slug] : undefined;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !style) return;

    // The stored setting is one source of truth; the OS setting is the other,
    // and either one turning it off is enough.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let dpr = 1;
    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const particles: Particle[] = [];
    const ribbon: { x: number; y: number; t: number }[] = [];
    let raf = 0;
    let last = performance.now();
    const pick = () => style.colours[Math.floor(Math.random() * style.colours.length)];
    const colourOf: string[] = [];

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      if (style.ribbon) {
        // Drop points older than their lifetime, then stroke what is left as a
        // single tapering line.
        const cutoff = now - style.life[0] * 1000;
        while (ribbon.length && ribbon[0].t < cutoff) ribbon.shift();
        if (ribbon.length > 1) {
          for (let i = 1; i < ribbon.length; i++) {
            const p = (i / ribbon.length) ** 1.4;
            ctx.strokeStyle = i % 2 ? style.colours[0] : style.colours[1];
            ctx.globalAlpha = p * 0.8;
            ctx.lineWidth = 1 + p * 6;
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.moveTo(ribbon[i - 1].x, ribbon[i - 1].y);
            ctx.lineTo(ribbon[i].x, ribbon[i].y);
            ctx.stroke();
          }
          ctx.globalAlpha = 1;
        }
      } else {
        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i];
          p.life -= dt;
          if (p.life <= 0) {
            particles.splice(i, 1);
            colourOf.splice(i, 1);
            continue;
          }
          p.x += p.vx * dt;
          p.y += (p.vy + style.gravity) * dt;
          const a = Math.max(0, p.life / p.max);
          ctx.globalAlpha = style.shape === "bubble" ? a * 0.55 : a;
          ctx.fillStyle = colourOf[i];
          ctx.strokeStyle = colourOf[i];

          if (style.shape === "spark") {
            // A four-point star, which reads as a twinkle at this size where a
            // circle just reads as a dot.
            const s = p.size * (0.6 + a * 0.6);
            ctx.beginPath();
            ctx.moveTo(p.x, p.y - s * 2);
            ctx.lineTo(p.x + s * 0.5, p.y);
            ctx.lineTo(p.x, p.y + s * 2);
            ctx.lineTo(p.x - s * 0.5, p.y);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(p.x - s * 2, p.y);
            ctx.lineTo(p.x, p.y + s * 0.5);
            ctx.lineTo(p.x + s * 2, p.y);
            ctx.lineTo(p.x, p.y - s * 0.5);
            ctx.closePath();
            ctx.fill();
          } else if (style.shape === "bubble") {
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * (0.7 + (1 - a) * 0.6), 0, Math.PI * 2);
            ctx.stroke();
          } else {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * a, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.globalAlpha = 1;
      }

      if (particles.length === 0 && ribbon.length === 0) {
        raf = 0; // nothing left to draw; the next move restarts the loop
        return;
      }
      raf = requestAnimationFrame(frame);
    };

    const kick = () => {
      if (!raf) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };

    const onMove = (e: PointerEvent) => {
      if (style.ribbon) {
        ribbon.push({ x: e.clientX, y: e.clientY, t: performance.now() });
        if (ribbon.length > 40) ribbon.shift();
      } else {
        for (let i = 0; i < style.rate; i++) {
          const max = style.life[0] + Math.random() * (style.life[1] - style.life[0]);
          particles.push({
            x: e.clientX + (Math.random() - 0.5) * 8,
            y: e.clientY + (Math.random() - 0.5) * 8,
            vx: (Math.random() - 0.5) * 40,
            vy: (Math.random() - 0.5) * 40,
            life: max,
            max,
            size: style.size[0] + Math.random() * (style.size[1] - style.size[0]),
          });
          colourOf.push(pick());
        }
        // A fast drag across the page can otherwise queue hundreds of live
        // particles before the first of them expires.
        while (particles.length > 160) {
          particles.shift();
          colourOf.shift();
        }
      }
      kick();
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", resize);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [style]);

  if (!style || reduced) return null;

  return (
    <canvas
      ref={ref}
      aria-hidden
      data-decorative
      className="pointer-events-none fixed inset-0 z-30 motion-reduce:hidden"
    />
  );
}
