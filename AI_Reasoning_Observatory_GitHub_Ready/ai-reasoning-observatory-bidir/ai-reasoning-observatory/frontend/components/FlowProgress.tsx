"use client";

import type { FlowPhase } from "@/lib/useFlowPhase";
import { PHASE_META } from "@/lib/useFlowPhase";

/**
 * FlowProgress — a horizontal progress bar that shows the sequential
 * flow of the observatory run. Each phase is a node connected by a line.
 *
 * - Future phases: dim, locked
 * - Active phase: glowing amber, caption shown
 * - Completed phases: green checkmark
 *
 * Sticky at the top of the viewport so the user always sees progress.
 */

const ACCENT = {
  done: {
    node: "border-emerald-500 bg-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.3)]",
    line: "bg-emerald-500",
    text: "text-emerald-300",
  },
  active: {
    node: "border-amber-400 bg-amber-500/20 shadow-[0_0_12px_rgba(245,158,60,0.5)]",
    line: "bg-graphite-600",
    text: "text-amber-300",
  },
  future: {
    node: "border-graphite-600 bg-graphite-950/60",
    line: "bg-graphite-700/50",
    text: "text-paper/30",
  },
};

export default function FlowProgress({
  phase,
  isActive,
  isComplete,
}: {
  phase: FlowPhase;
  isActive: boolean;
  isComplete: boolean;
}) {
  // Don't show when idle
  if (phase === 0 && !isActive && !isComplete) return null;

  return (
    <div className="sticky top-14 z-30 mb-6 animate-fade-in pt-2">
      <div className="rounded-xl border border-graphite-600 bg-graphite-950/95 p-3 shadow-lg backdrop-blur-md">
        {/* Phase nodes */}
        <div className="flex items-center gap-0">
          {PHASE_META.map((meta, i) => {
            const n = i + 1;
            const isDone = isComplete || n < phase;
            const isCurrent = n === phase && !isComplete;
            const isFuture = n > phase && !isComplete;
            const accent = isDone ? ACCENT.done : isCurrent ? ACCENT.active : ACCENT.future;

            return (
              <div key={meta.id} className="flex flex-1 items-center last:flex-none">
                {/* Node */}
                <button
                  onClick={() => {
                    const el = document.getElementById(meta.sectionId);
                    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className={`group flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all ${accent.node} ${accent.text}`}
                >
                  {isDone ? (
                    <span className="text-emerald-400">✓</span>
                  ) : (
                    <span className="readout text-[10px]">{n}</span>
                  )}
                  <span className="hidden sm:inline">{meta.label}</span>
                </button>

                {/* Connector line */}
                {i < PHASE_META.length - 1 && (
                  <div className="mx-1 h-px flex-1">
                    <div
                      className={`h-px transition-all duration-700 ${
                        isDone ? ACCENT.done.line : ACCENT.future.line
                      }`}
                      style={{ width: isDone ? "100%" : isCurrent ? "30%" : "0%" }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Caption for the active phase */}
        {phase > 0 && !isComplete && (
          <p className="mt-2 border-t border-graphite-700/60 pt-2 text-[12px] leading-relaxed text-paper/55">
            <span className="font-semibold text-amber-300/80">
              Step {phase}:
            </span>{" "}
            {PHASE_META[phase - 1].caption}
          </p>
        )}

        {/* Completion message */}
        {isComplete && (
          <p className="mt-2 border-t border-graphite-700/60 pt-2 text-[12px] leading-relaxed text-emerald-300/70">
            ✓ Run complete — all sections have been filled with live data.
          </p>
        )}
      </div>
    </div>
  );
}
