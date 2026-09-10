"use client";

import { useEffect, useRef } from "react";

/**
 * CursorGlow — two jobs, one rAF loop:
 *
 * 1. The page-level spotlight that trails the cursor (Freebuff-style
 *    ambient glow), lerped so it feels liquid rather than glued.
 * 2. A single delegated pointermove listener that updates --mx/--my on
 *    every `.glow-card` element under the cursor — so ANY card anywhere
 *    in the app lights up its border and interior without each
 *    component needing its own handler. Uses event delegation so cards
 *    added dynamically (streaming chips, new panels) work too.
 *
 * Disabled for touch devices and reduced-motion users; the CSS :hover
 * fallback in globals.css still gives them a centered glow.
 */
export default function CursorGlow() {
  const dot = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(pointer: coarse)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    const target = { x: window.innerWidth / 2, y: window.innerHeight * 0.3 };
    const pos = { ...target };
    let lastX = -1;
    let lastY = -1;
    let tracked: HTMLElement | null = null;

    const onMove = (e: MouseEvent) => {
      target.x = e.clientX;
      target.y = e.clientY;

      // Delegate: find the glow-card under (or above) the cursor and
      // update its CSS vars. closest() also matches when the pointer is
      // over a child — and bubbles from text nodes' parents.
      const el = (e.target as HTMLElement | null)?.closest?.(".glow-card") as HTMLElement | null;
      if (el !== tracked && tracked) {
        tracked.style.setProperty("--glow-hot", "0");
      }
      tracked = el;
      if (el) {
        const rect = el.getBoundingClientRect();
        el.style.setProperty("--mx", `${e.clientX - rect.left}px`);
        el.style.setProperty("--my", `${e.clientY - rect.top}px`);
      }
    };

    const tick = () => {
      pos.x += (target.x - pos.x) * 0.11;
      pos.y += (target.y - pos.y) * 0.11;
      if (dot.current) {
        dot.current.style.transform = `translate3d(${pos.x - 260}px, ${pos.y - 260}px, 0)`;
      }
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div
        ref={dot}
        className="h-[520px] w-[520px] rounded-full will-change-transform"
        style={{
          background:
            "radial-gradient(circle, rgba(245,158,60,0.085) 0%, rgba(45,212,191,0.055) 38%, transparent 68%)",
        }}
      />
    </div>
  );
}
