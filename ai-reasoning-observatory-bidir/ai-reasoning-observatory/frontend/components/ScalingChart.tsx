"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CSSProperties } from "react";
import type { ObservatoryState } from "@/lib/useExecution";

/**
 * ScalingChart — real-time memory divergence of the CURRENT run.
 *
 * v3 change: no more static theoretical token grid (1K/2K/4K/.../128K).
 * The chart is driven entirely by the ACTUAL tokens of the run as it
 * streams: the conventional line grows as tokens arrive (KV-cache memory,
 * a labeled model estimate of bytes-per-token), while the BDH-CQ line stays
 * flat at 48 bytes. The x-axis shows the real token count of this run —
 * nothing is invented.
 *
 * The only model-derived number is the bytes-per-token factor used to turn
 * the real token count into a memory figure, and that stays labeled
 * "estimated".
 */

const BDH_BYTES = 48; // 12 × float32 — exact, from the paper
const KV_BYTES_PER_TOKEN_7B = 2 * 32 * 32 * 128 * 2; // ~512 KB/token (7B class)
const MAX_POINTS = 200; // cap resolution so a very long run stays smooth

function formatBytes(bytes: number, decimals = 1): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(decimals)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(decimals)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(decimals)} GB`;
}

const TOOLTIP_STYLE = {
  contentStyle: {
    background: "#0e1215",
    border: "1px solid #282d31",
    fontSize: 12,
    borderRadius: 8,
    padding: "8px 12px",
  },
  labelStyle: { color: "#e9e6de88", marginBottom: 4 },
};

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const conv = payload.find((p: any) => p.dataKey === "conventional_mb")?.value ?? 0;
  const bdh = BDH_BYTES / (1024 * 1024);
  const ratio = conv > 0 ? Math.round(conv / bdh) : 0;
  const tokens = payload[0]?.payload?.tokens ?? 0;

  return (
    <div style={TOOLTIP_STYLE.contentStyle}>
      <div style={TOOLTIP_STYLE.labelStyle}>
        {tokens >= 1000 ? `${(tokens / 1000).toFixed(1)}K` : tokens} tokens in this run
      </div>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-amber-400" />
          <span className="text-[11px] text-paper/70">Conventional KV-cache:</span>
          <span className="readout text-[11px] font-bold text-amber-300">
            {formatBytes(conv * 1024 * 1024)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-cyan-400" />
          <span className="text-[11px] text-paper/70">BDH-CQ state:</span>
          <span className="readout text-[11px] font-bold text-cyan-300">48 B</span>
        </div>
        {ratio > 0 && (
          <div className="mt-1.5 rounded border border-amber-500/20 bg-amber-500/8 px-2 py-1 text-[11px]">
            <span className="text-paper/50">Conventional uses </span>
            <span className="readout font-bold text-amber-300">
              {ratio.toLocaleString()}×
            </span>
            <span className="text-paper/50"> more memory</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ScalingChart({ state }: { state: ObservatoryState }) {
  // ── Real tokens from the ACTUAL run ────────────────────────────────
  const liveInputTokens = Number(
    state.conventional.cache?.input_tokens?.value ??
    state.contextEstimate?.value ??
    state.promptTokens?.count.value ??
    0
  );
  // Prefer the provider's live output-token count when the provider has
  // reported it; otherwise count the streamed output_token events so the
  // curve grows in real time even before a usage update arrives.
  const liveOutputFromEvents = state.events.filter(
    (e) => e.event_type === "output_token" && e.channel === "conventional"
  ).length;
  const liveOutputTokens = Number(
    state.conventional.cache?.output_tokens?.value ?? liveOutputFromEvents ?? 0
  );
  const liveTotalTokens = liveInputTokens + liveOutputTokens;
  const hasLive =
    liveTotalTokens > 0 &&
    (state.status === "streaming" || state.status === "completed");

  // ── Build the series from 0..liveTotalTokens (real tokens only) ─────
  const makePoint = (t: number) => ({
    tokens: t,
    label:
      t === liveTotalTokens && hasLive
        ? `${t >= 1000 ? `${(t / 1000).toFixed(1)}K` : t} ← you are here`
        : t >= 1000 ? `${(t / 1000).toFixed(1)}K` : `${t}`,
    conventional_mb: (t * KV_BYTES_PER_TOKEN_7B) / (1024 * 1024),
    bdh_mb: BDH_BYTES / (1024 * 1024),
    isLivePoint: t === liveTotalTokens && hasLive,
  });

  const data: any[] = [];
  const step = Math.max(1, Math.ceil(liveTotalTokens / MAX_POINTS));
  for (let i = 0; i < liveTotalTokens; i += step) {
    data.push(makePoint(i));
  }
  // Ensure the final point lands exactly on the current run's token count.
  if (data.length === 0 || data[data.length - 1].tokens !== liveTotalTokens) {
    data.push(makePoint(liveTotalTokens));
  }

  const liveKvBytes = liveTotalTokens * KV_BYTES_PER_TOKEN_7B;
  const liveRatio = liveKvBytes > 0 ? Math.round(liveKvBytes / BDH_BYTES) : 0;

  return (
    <div
      className="glow-card rounded-xl border border-graphite-600 bg-graphite-900/70 p-5 shadow-lg"
      style={{ "--glow": "245,158,60" } as CSSProperties}
    >
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h2 className="font-display text-lg italic text-paper/90">
            Memory scaling — the number that doesn't lie
          </h2>
          <p className="mt-0.5 text-[11px] text-paper/40">
            <span className="text-paper/50">Real tokens from this run:</span>{" "}
            as the conventional LLM streams, its KV-cache memory grows; BDH-CQ
            stays at 48 bytes — forever.{" "}
            <span className="text-paper/25">
              (bytes-per-token is a 7B-class model estimate: 2 × 32 layers × 32
              heads × 128 dim × fp16)
            </span>
          </p>
        </div>
      </div>

      {/* The chart — driven by real run tokens */}
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
            <defs>
              <linearGradient id="convGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e3c" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#f59e3c" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="bdhGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4fd1c9" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#4fd1c9" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2427" />
            <XAxis
              dataKey="label"
              tick={{ fill: "#e9e6de50", fontSize: 10 }}
              label={{ value: "Tokens in this run (real)", position: "insideBottom", offset: -2, fill: "#e9e6de30", fontSize: 10 }}
            />
            <YAxis
              tick={{ fill: "#e9e6de50", fontSize: 10 }}
              tickFormatter={(v) => v >= 1024 ? `${(v / 1024).toFixed(0)}GB` : `${v}MB`}
              label={{ value: "Memory (MB)", angle: -90, position: "insideLeft", offset: 12, fill: "#e9e6de30", fontSize: 10 }}
            />
            <Tooltip content={<CustomTooltip />} />
            {/* Live reference line — where this run currently sits */}
            {hasLive && (
              <ReferenceLine
                x={data.find((d) => d.isLivePoint)?.label}
                stroke="#22d3ee"
                strokeWidth={2}
                strokeDasharray="4 3"
                label={{
                  value: `← ${liveTotalTokens >= 1000 ? `${(liveTotalTokens / 1000).toFixed(1)}K` : liveTotalTokens} tokens`,
                  position: "insideTopRight",
                  fill: "#22d3ee",
                  fontSize: 11,
                }}
              />
            )}
            <Area
              type="monotone"
              dataKey="conventional_mb"
              stroke="#f59e3c"
              strokeWidth={2.5}
              fill="url(#convGrad)"
              name="Conventional KV-cache"
            />
            <Area
              type="monotone"
              dataKey="bdh_mb"
              stroke="#4fd1c9"
              strokeWidth={2.5}
              fill="url(#bdhGrad)"
              name="BDH-CQ state"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom stat strip — from the current run's real tokens */}
      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
        {hasLive ? (
          <>
            <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/8 p-3 text-center">
              <div className="readout text-xl font-bold text-cyan-300">
                {liveTotalTokens >= 1000 ? `${(liveTotalTokens / 1000).toFixed(1)}K` : liveTotalTokens}
              </div>
              <div className="text-[10px] text-paper/40">
                tokens in this run <span className="text-cyan-400/60">live</span>
              </div>
            </div>
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-center">
              <div className="readout text-xl font-bold text-amber-300">
                {formatBytes(liveKvBytes)}
              </div>
              <div className="text-[10px] text-paper/40">
                KV-cache needed <span className="text-amber-400/60">estimated</span>
              </div>
            </div>
            <div className="flex items-center justify-center">
              <div className="text-center">
                <div className="readout text-2xl font-black text-paper/80">
                  {liveRatio.toLocaleString()}×
                </div>
                <div className="text-[10px] text-paper/35">more memory</div>
              </div>
            </div>
            <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3 text-center">
              <div className="readout text-xl font-bold text-cyan-300">48 B</div>
              <div className="text-[10px] text-paper/40">BDH-CQ — always</div>
            </div>
          </>
        ) : (
          <>
            <div className="rounded-xl border border-graphite-600 bg-graphite-900/50 p-3 text-center">
              <div className="readout text-lg text-paper/30">—</div>
              <div className="text-[10px] text-paper/30">run a prompt to see live data</div>
            </div>
            <div className="rounded-xl border border-graphite-600 bg-graphite-900/50 p-3 text-center">
              <div className="readout text-lg text-paper/30">—</div>
              <div className="text-[10px] text-paper/30">conventional KV-cache</div>
            </div>
            <div className="flex items-center justify-center">
              <div className="text-center">
                <div className="readout text-2xl font-black text-paper/30">—</div>
                <div className="text-[10px] text-paper/25">ratio</div>
              </div>
            </div>
            <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3 text-center">
              <div className="readout text-xl font-bold text-cyan-300">48 B</div>
              <div className="text-[10px] text-paper/40">BDH-CQ — always</div>
            </div>
          </>
        )}
      </div>

      <p className="mt-2 text-center text-[10px] text-paper/20">
        {hasLive
          ? "Chart shows only this run's real tokens, growing live · current position marked with a dashed cyan line · memory figure is a labeled estimate"
          : "Chart fills with real tokens the moment you run a prompt · no theoretical token counts"}
      </p>
    </div>
  );
}
