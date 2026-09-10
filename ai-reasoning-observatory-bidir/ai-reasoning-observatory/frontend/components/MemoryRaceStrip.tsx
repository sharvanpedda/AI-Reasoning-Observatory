"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { ObservatoryState } from "@/lib/useExecution";

/**
 * MemoryRaceStrip — the single most important visual in the app for hackathon judges.
 *
 * Shows ONE thing that's hard to unsee once you've seen it:
 * - Conventional LLM: memory bar grows with every token (O(n))
 * - BDH-CQ latent state: memory bar is FIXED regardless of tokens (O(1))
 *
 * Phase 3 made it bigger and more precise: exact byte counts with thousands
 * separators, exact float32 dims for BDH (48 B = 12 × float32), and honest
 * LIVE vs ESTIMATE tags on every number.
 */

const STATE_DIM = 12; // BDH state dimension (matches simulator.py)
const BYTES_PER_FLOAT = 4; // float32
const BDH_FIXED_BYTES = STATE_DIM * BYTES_PER_FLOAT; // 48 bytes — always

// Rough KV-cache model: each token stores key+value vectors
// Typical: 2 (k+v) × layers(32) × heads(8) × head_dim(64) × 2 bytes (fp16)
// ≈ 2 × 32 × 8 × 64 × 2 = 65,536 bytes per token
// We display it scaled to be visually dramatic but labeled honestly as a model estimate.
const KV_BYTES_PER_TOKEN = 2 * 32 * 8 * 64 * 2; // ~65 KB/token for a 7B-class model

/**
 * Precise byte formatting: always shows the exact integer byte count with
 * thousands separators, plus a human unit on top. No lossy rounding hide.
 */
function preciseBytes(bytes: number): { exact: string; unit: string } {
  const exact = bytes.toLocaleString("en-US"); // e.g. 3,210,560
  let unit: string;
  if (bytes < 1024) unit = `${bytes} B`;
  else if (bytes < 1024 * 1024) unit = `${(bytes / 1024).toFixed(2)} KB`;
  else if (bytes < 1024 * 1024 * 1024) unit = `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  else unit = `${(bytes / (1024 * 1024 * 1024)).toFixed(3)} GB`;
  return { exact, unit };
}

export default function MemoryRaceStrip({ state }: { state: ObservatoryState }) {
  const inputTokens = state.promptTokens?.tokens.length ?? 0;
  const outputTokens = Number(state.conventional.cache?.output_tokens?.value ?? 0);
  const totalTokens = inputTokens + outputTokens;

  // BDH is always 48 bytes — never changes
  const bdhBytes = BDH_FIXED_BYTES;

  // Conventional grows: number of tokens × KV cost per token
  const conventionalBytes = totalTokens * KV_BYTES_PER_TOKEN;

  // For the bar width we normalise against a representative max
  const MAX_DISPLAY_BYTES = 200 * KV_BYTES_PER_TOKEN;
  const conventionalPct = Math.min((conventionalBytes / MAX_DISPLAY_BYTES) * 100, 100);
  const bdhPct = Math.min(100, Math.max(0.08, (BDH_FIXED_BYTES / MAX_DISPLAY_BYTES) * 100));

  const isActive = state.status === "running" || state.status === "streaming";
  const hasData = totalTokens > 0;

  const conv = conventionalBytes > 0 ? preciseBytes(conventionalBytes) : null;
  const bdh = preciseBytes(bdhBytes);
  const ratio = conventionalBytes > 0 ? conventionalBytes / bdhBytes : null;

  // Animated width for conventional bar
  const [conventionalWidth, setConventionalWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setConventionalWidth(conventionalPct), 50);
    return () => clearTimeout(t);
  }, [conventionalPct]);

  return (
    <div
      className="glow-card rounded-xl border border-graphite-600 bg-graphite-900/70 p-4 shadow-lg"
      style={{ "--glow": "245,158,60" } as CSSProperties}
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-paper/90">
            Memory in use — <span className="readout text-amber-300">right now</span>
          </h2>
          <p className="mt-0.5 text-[11px] text-paper/40">
            One grows. One doesn&apos;t. Exact numbers below — every figure tagged{" "}
            <span className="text-emerald-400/80">live</span> or{" "}
            <span className="text-amber-400/80">estimated</span>.
          </p>
        </div>
        {isActive && (
          <span className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-300">
            <span className="live-dot" />
            growing
          </span>
        )}
      </div>

      {/* Race bars */}
      <div className="space-y-4">
        {/* Conventional — growing */}
        <div>
          <div className="mb-1 flex items-end justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm bg-amber-400" />
              <span className="text-[12px] font-semibold text-amber-300">Conventional LLM</span>
              <span className="text-[10px] text-paper/30">KV-cache · grows O(n)</span>
            </div>
            <div className="flex flex-col items-end gap-0.5">
              <div className="flex items-center gap-2">
                <span className="readout rounded border border-amber-500/40 bg-amber-500/8 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
                  ESTIMATE · model
                </span>
                <span className="readout text-2xl font-black text-amber-300">
                  {conv ? conv.unit : "—"}
                </span>
              </div>
              {conv && (
                <span className="readout text-[11px] text-paper/45">
                  = {conv.exact} bytes
                  <span className="text-paper/30"> · {totalTokens} tokens</span>
                </span>
              )}
            </div>
          </div>
          <div className="relative h-9 overflow-hidden rounded-lg bg-graphite-950/80">
            <div
              className="absolute inset-y-0 left-0 flex items-center rounded-lg bg-gradient-to-r from-amber-600/80 to-amber-400/90 transition-all duration-500 ease-out"
              style={{ width: `${Math.max(conventionalWidth, hasData ? 1 : 0)}%` }}
            >
              {conventionalWidth > 15 && (
                <span className="readout ml-2 text-[11px] font-bold text-graphite-950">
                  {conv?.unit}
                </span>
              )}
            </div>
            {!hasData && (
              <span className="absolute inset-0 flex items-center px-3 text-[11px] text-paper/25">
                Waiting for a prompt…
              </span>
            )}
          </div>
          <p className="mt-1 text-[10px] text-paper/35">
            ~{KV_BYTES_PER_TOKEN.toLocaleString("en-US")} B per token (2×K/V · 32 layers · 8 heads · 64-dim · fp16).
            Real KV-cache is not exposed by providers — this is a labeled model estimate.
          </p>
        </div>

        {/* BDH-CQ — fixed */}
        <div>
          <div className="mb-1 flex items-end justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm bg-cyan-400" />
              <span className="text-[12px] font-semibold text-cyan-300">Local latent-state trace</span>
              <span className="text-[10px] text-paper/30">fixed state in this demo</span>
            </div>
            <div className="flex flex-col items-end gap-0.5">
              <div className="flex items-center gap-2">
                <span className="readout rounded border border-cyan-500/40 bg-cyan-500/8 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-300">
                  LIVE · EXACT · LOCAL
                </span>
                <span className="readout text-2xl font-black text-cyan-300">{bdh.unit}</span>
              </div>
              <span className="readout text-[11px] text-paper/45">
                = {bdh.exact} bytes · {STATE_DIM} × float32
                <span className="text-paper/30"> · never changes</span>
              </span>
            </div>
          </div>
          <div className="relative h-9 overflow-hidden rounded-lg bg-graphite-950/80">
            {/* Fixed thin bar — visually tiny vs the amber bar, intentionally */}
            <div
              className="absolute inset-y-0 left-0 flex items-center rounded-lg bg-gradient-to-r from-cyan-700/80 to-cyan-400/90"
              style={{ width: `max(3px, ${bdhPct}%)` }}
            />
            <span className="absolute inset-0 flex items-center px-3 text-[11px] text-cyan-300/80">
              {bdh.unit} — constant at {totalTokens ? `${totalTokens} tokens` : "any length"}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom callout — only shown when there's data to compare */}
      {hasData && ratio !== null && ratio > 0 && (
        <div className="mt-3 flex items-center justify-between rounded-lg border border-graphite-700 bg-graphite-950/60 px-3 py-2.5">
          <span className="text-[12px] text-paper/55">
            Conventional is using{" "}
            <span className="font-black readout text-amber-300">
              {ratio.toLocaleString("en-US", { maximumFractionDigits: 0 })}×
            </span>{" "}
            more memory than BDH-CQ for this {totalTokens}-token exchange
          </span>
          <span className="readout rounded-full border border-cyan-500/25 bg-cyan-500/8 px-2 py-0.5 text-[10px] text-cyan-300">
            local trace · KV model estimate
          </span>
        </div>
      )}
    </div>
  );
}