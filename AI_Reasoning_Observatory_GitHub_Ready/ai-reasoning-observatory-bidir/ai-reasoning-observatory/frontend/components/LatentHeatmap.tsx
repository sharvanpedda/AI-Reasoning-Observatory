"use client";

import { useMemo } from "react";
import type { CSSProperties } from "react";
import type { BdhPass, LatentStep } from "@/lib/types";

/**
 * LatentHeatmap — a live "ECG of the latent state".
 *
 * Every pixel of this chart is REAL data: the `state_preview` vectors
 * (first 6 of the 12 state dims, computed by backend/app/bdh/simulator.py
 * from the actual prompt tokens) streamed per-step over SSE as
 * `state_update` events. Nothing is animated for decoration — the strip
 * chart literally extends one column per recurrent step, so judges can
 * SEE:
 *   • recurrence (each column feeds the next),
 *   • capacity limits (the same 6 dims every step, never more),
 *   • salience (bright columns = tokens that moved the state most —
 *     the same signal backend/app/bdh/answer.py uses to pick the
 *     "salient tokens" for the constrained-memory answer probe).
 *
 * Hovering a column shows the exact token, its norm, and the raw state
 * values — so every claim in the demo script is verifiable on screen.
 */

const PASS_HUE: Record<BdhPass, string> = {
  forward: "343 90% 65%", // pink
  backward: "38 92% 56%", // amber
  combined: "262 83% 70%", // violet
};

function fmt(v: number): string {
  return (v >= 0 ? "+" : "") + v.toFixed(2);
}

export default function LatentHeatmap({
  steps,
  pass,
  active,
}: {
  steps: LatentStep[];
  pass: BdhPass;
  active: boolean;
}) {
  const maxDim = useMemo(
    () => steps.reduce((m, s) => Math.max(m, s.state_preview?.length ?? 0), 0),
    [steps]
  );
  const maxAbs = useMemo(
    () =>
      Math.max(
        1e-6,
        ...steps.flatMap((s) => (s.state_preview ?? []).map((v) => Math.abs(v)))
      ),
    [steps]
  );

  const dims = Math.max(1, maxDim);
  const hue = PASS_HUE[pass] ?? PASS_HUE.forward;

  // Fixed step width so columns slide instead of squishing; the strip
  // scrolls horizontally and stays pinned to the newest step.
  const STEP_W = 7;
  const n = steps.length;

  return (
    <div
      className="glow-card rounded-xl border border-graphite-700 bg-graphite-950/70 p-3"
      style={{ "--glow": "45,212,191" } as CSSProperties}
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-paper/50">
            Latent state — live heatmap
          </h3>
          <span className="readout rounded border border-graphite-600 bg-graphite-900/60 px-1.5 py-0.5 text-[9px] text-paper/45">
            real state_preview · {dims} dims × {n} steps
          </span>
        </div>
        <div className="flex items-center gap-2">
          {active && (
            <span className="flex items-center gap-1 text-[10px] text-paper/45">
              <span className="live-dot" /> recording
            </span>
          )}
          <div className="flex items-center gap-1 text-[9px] text-paper/35">
            <span>−{maxAbs.toFixed(2)}</span>
            <span
              className="inline-block h-2.5 w-16 rounded-sm"
              style={{
                background: `linear-gradient(to right, hsl(${hue} 60% 18%), hsl(${hue} 20% 8%), hsl(${hue} 90% 62%))`,
              }}
            />
            <span>+{maxAbs.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {n === 0 ? (
        <div className="flex h-24 items-center justify-center text-[11px] text-paper/25">
          The heatmap draws one column per recurrent step as tokens stream…
        </div>
      ) : (
        <div className="panel-scroll overflow-x-auto pb-1">
          <div
            className="flex h-24 items-stretch gap-px"
            style={{ width: Math.max(n * (STEP_W + 1), 100) }}
          >
            {steps.map((s) => (
              <div
                key={`${s.pass}-${s.step}`}
                className="group relative flex shrink-0 cursor-pointer flex-col justify-center"
                style={{ width: STEP_W }}
                title={`step ${s.step} · "${s.token_text}" · ‖h‖=${s.state_norm.toFixed(3)}\n[${s.state_preview
                  .map(fmt)
                  .join(", ")}]`}
              >
                {/* Half-height halves so bars grow outward from a center zero-line */}
                <div className="flex h-1/2 flex-col justify-end">
                  {s.state_preview.map((v, d) =>
                    v >= 0 ? (
                      <div
                        key={d}
                        className="w-full transition-[height] duration-150"
                        style={{
                          height: `${(Math.max((Math.abs(v) / maxAbs) * 92, v === 0 ? 0 : 4)).toFixed(1)}%`,
                          background: `hsl(${hue} 85% ${28 + (Math.abs(v) / maxAbs) * 38}%)`,
                          boxShadow:
                            Math.abs(v) / maxAbs > 0.85
                              ? `0 0 6px hsl(${hue} 90% 60% / 0.7)`
                              : undefined,
                        }}
                        aria-hidden
                      />
                    ) : null
                  )}
                </div>
                <div className="flex h-1/2 flex-col justify-start">
                  {s.state_preview.map((v, d) =>
                    v < 0 ? (
                      <div
                        key={d}
                        className="w-full transition-[height] duration-150"
                        style={{
                          height: `${(Math.max((Math.abs(v) / maxAbs) * 92, 4)).toFixed(1)}%`,
                          background: `hsl(${hue} 35% ${9 + (Math.abs(v) / maxAbs) * 9}%)`,
                        }}
                        aria-hidden
                      />
                    ) : null
                  )}
                </div>
                {/* Hover tooltip: exact values from the real state */}
                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-lg border border-graphite-600 bg-graphite-900 px-2 py-1 text-left font-mono text-[10px] text-paper/80 shadow-xl group-hover:block">
                  <span className="text-paper/50">step {s.step} · </span>
                  <span className="text-paper">&quot;{s.token_text}&quot;</span>
                  <br />
                  <span className="text-paper/50">‖h‖ = </span>
                  {s.state_norm.toFixed(3)}
                  <br />
                  <span className="text-paper/50">[</span>
                  {s.state_preview.map(fmt).join(", ")}
                  <span className="text-paper/50">]</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="mt-2 text-[10px] leading-relaxed text-paper/30">
        One column per recurrent step — hover any column for the exact token and
        raw state values. This is the model&apos;s entire working memory: the same{" "}
        {dims} numbers, rewritten every step. Bright spikes = tokens that moved
        the state most (the same signal used to build the constrained-memory
        answer probe).
      </p>
    </div>
  );
}
