"use client";

import { useState } from "react";
import type React from "react";

/**
 * TechGlowChip — a stack item that glows on hover and, when clicked,
 * expands to show exactly how this project used that language/library.
 * The usage notes are factual (one or two sentences per item) so the
 * claim is checkable — in keeping with the project's honesty-first rule.
 */

const ACCENTS: Record<string, string> = {
  amber: "245,158,60",
  cyan: "45,212,191",
  violet: "139,92,246",
  emerald: "34,197,94",
};

interface TechItem {
  name: string;
  accent: keyof typeof ACCENTS;
  usage: string;
}

const TECH: TechItem[] = [
  {
    name: "Next.js 14",
    accent: "amber",
    usage:
      "App Router hosts the homepage, About page and the /observatory tool as statically-served pages; next.config.js sets standalone output, security headers and disables the provider key from ever reaching the client bundle.",
  },
  {
    name: "TypeScript",
    accent: "cyan",
    usage:
      "Every component, hook and SSE event payload is typed — from ObservatoryEvent to the reducer actions in useExecution — so a malformed provider event fails at compile time, not live on stage.",
  },
  {
    name: "Tailwind CSS",
    accent: "violet",
    usage:
      "The whole instrument-panel design system (graphite/amber/cyan palette, glow rings, animations) is a Tailwind theme with a handful of custom keyframes in globals.css.",
  },
  {
    name: "React Three Fiber",
    accent: "cyan",
    usage:
      "Renders the two 3D views: a growing bar row for the conventional LLM's context, and the fixed-size latent 'chamber' whose particles activate from the real state norm — never random decoration.",
  },
  {
    name: "Recharts",
    accent: "amber",
    usage:
      "Draws the live memory-scaling area chart and the per-pass state-norm telemetry curves, fed only by real tokens and state_update events from the run.",
  },
  {
    name: "FastAPI",
    accent: "emerald",
    usage:
      "The Python backend: POST /api/execute orchestrates the LLM call and the BDH-CQ trace concurrently and streams one normalized SSE event stream; middleware adds rate limiting, body caps and security headers.",
  },
  {
    name: "Python",
    accent: "cyan",
    usage:
      "Runs everything server-side: the seeded recurrent-state simulator, the deterministic tokenizer, the RAG retrieval layer, the evaluation scorer and the provider fallback chain.",
  },
  {
    name: "Server-Sent Events",
    accent: "violet",
    usage:
      "One open HTTP connection pushes every event (tokenized, output_token, state_update, cache_update…) to the browser with seq + timestamps — which is also what makes Replay possible.",
  },
];

export default function TechGlowChip() {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
      {TECH.map((t) => {
        const accent = ACCENTS[t.accent];
        const isOpen = open === t.name;
        return (
          <button
            key={t.name}
            type="button"
            onClick={() => setOpen(isOpen ? null : t.name)}
            aria-expanded={isOpen}
            onPointerMove={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
              e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
            }}
            className="group relative overflow-hidden rounded-xl border border-graphite-600/80 bg-graphite-900/60 p-3 text-left transition-all duration-300 hover:-translate-y-0.5"
            style={{
              boxShadow: isOpen
                ? `0 0 0 1px rgba(${accent},0.35), 0 8px 32px -10px rgba(${accent},0.4)`
                : undefined,
              borderColor: isOpen ? `rgba(${accent},0.45)` : undefined,
            }}
          >
            {/* hover glow — tracks the cursor via CSS only */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              style={{
                background: `radial-gradient(160px circle at var(--mx, 50%) var(--my, 30%), rgba(${accent},0.14), transparent 70%)`,
              }}
            />
            <span
              className="relative block text-[13px] font-medium text-paper/80 transition-colors group-hover:text-paper"
              style={{ color: isOpen ? `rgb(${accent})` : undefined }}
            >
              {t.name}
            </span>
            <span className="relative mt-0.5 block text-[10px] text-paper/30 transition-colors group-hover:text-paper/45">
              {isOpen ? "click to close" : "how we used it →"}
            </span>
            {isOpen && (
              <span className="relative mt-2 block rounded-lg bg-graphite-950/70 p-2.5 text-[11px] leading-relaxed text-paper/60">
                {t.usage}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
