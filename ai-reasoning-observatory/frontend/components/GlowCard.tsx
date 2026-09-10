"use client";

import { useRef, useState } from "react";
import type React from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

/**
 * GlowCard — the core "Freebuff feel" primitive.
 *
 * A card with:
 *  1. A border that lights up near the cursor (a radial gradient painted
 *     at the cursor position through the border mask — the classic
 *     Linear/Vercel-style trick — via CSS custom properties).
 *  2. A soft interior sheen that follows the cursor.
 *  3. An optional subtle 3D tilt toward the cursor (perspective rotateX/
 *     rotateY), which is what makes the page feel three-dimensional
 *     without WebGL.
 *
 * All effects are pointer-driven and cheap; disabled on touch and for
 * reduced-motion users.
 */
export default function GlowCard({
  children,
  className = "",
  accent = "245,158,60",
  tilt = true,
  glow = true,
}: {
  children: React.ReactNode;
  className?: string;
  /** RGB triplet string for the glow color, e.g. "45,212,191". */
  accent?: string;
  tilt?: boolean;
  glow?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [hot, setHot] = useState(false);

  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    el.style.setProperty("--mx", `${x}px`);
    el.style.setProperty("--my", `${y}px`);

    if (tilt) {
      const px = x / rect.width - 0.5;
      const py = y / rect.height - 0.5;
      el.style.transform = `perspective(900px) rotateX(${(-py * 4).toFixed(2)}deg) rotateY(${(px * 5).toFixed(2)}deg) translateZ(0)`;
    }
  };

  const onEnter = () => setHot(true);
  const onLeave = () => {
    setHot(false);
    const el = ref.current;
    if (el) el.style.transform = "";
  };

  return (
    <div
      ref={ref}
      onPointerMove={glow ? onMove : undefined}
      onPointerEnter={glow ? onEnter : undefined}
      onPointerLeave={glow ? onLeave : undefined}
      className={`group relative rounded-2xl border border-graphite-600/80 bg-graphite-900/60 transition-[border-color,box-shadow] duration-300 ${className}`}
      style={
        hot
          ? {
              borderColor: `rgba(${accent},0.45)`,
              boxShadow: `0 0 0 1px rgba(${accent},0.18), 0 8px 40px -12px rgba(${accent},0.28), inset 0 1px 0 rgba(255,255,255,0.04)`,
            }
          : undefined
      }
    >
      {/* Border-tracking light */}
      {glow && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-2xl transition-opacity duration-300"
          style={{
            opacity: hot ? 1 : 0,
            background: `radial-gradient(340px circle at var(--mx, 50%) var(--my, 50%), rgba(${accent},0.16), transparent 65%)`,
          }}
        />
      )}
      {/* Interior sheen */}
      {glow && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-2xl transition-opacity duration-300"
          style={{
            opacity: hot ? 1 : 0,
            background: `radial-gradient(180px circle at var(--mx, 50%) var(--my, 50%), rgba(${accent},0.07), transparent 70%)`,
          }}
        />
      )}
      <div className="relative">{children}</div>
    </div>
  );
}
