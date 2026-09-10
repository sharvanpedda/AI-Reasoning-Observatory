"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ObservatoryState } from "@/lib/useExecution";
import type { View } from "./ViewToggle";

const TOOLTIP_STYLE = {
  contentStyle: { background: "#0e1215", border: "1px solid #282d31", fontSize: 12, borderRadius: 8 },
  labelStyle: { color: "#e9e6de88" },
  itemStyle: { color: "#e9e6de" },
};

export default function TelemetryCharts({
  state,
  elapsedMs,
  view,
}: {
  state: ObservatoryState;
  elapsedMs: number | null;
  view: View;
}) {
  const inputTokens = Number(state.conventional.cache?.input_tokens?.value ?? state.contextEstimate?.value ?? 0);
  const outputTokens = Number(state.conventional.cache?.output_tokens?.value ?? 0);
  const latencyMs = Number(state.conventional.latencyMs?.value ?? 0);

  const barData = [
    { name: "Input tokens", value: inputTokens, fill: "#f59e3c" },
    { name: "Output tokens", value: outputTokens, fill: "#fb923c" },
    { name: "Latency (ms)", value: latencyMs, fill: "#fbbf24" },
  ];

  // BDH state norm evolution — all three passes
  const maxStep = Math.max(
    state.bdh.forwardSteps.length,
    state.bdh.backwardSteps.length,
    state.bdh.combinedSteps.length,
    1
  );
  const stateData = Array.from({ length: maxStep }, (_, step) => ({
    step,
    forward: state.bdh.forwardSteps[step]?.state_norm ?? null,
    backward: state.bdh.backwardSteps[step]?.state_norm ?? null,
    combined: state.bdh.combinedSteps[step]?.state_norm ?? null,
  }));

  // Tokens/sec derived from elapsed time
  const tokensPerSec =
    elapsedMs && elapsedMs > 500 && outputTokens > 0
      ? parseFloat((outputTokens / (elapsedMs / 1000)).toFixed(2))
      : null;

  return (
    <div className="space-y-4">
      <h3 className="font-display text-lg italic text-paper/80">
        {view === "conventional" ? "Conventional telemetry" : "BDH-CQ telemetry"}{" "}
        <span className="font-sans text-sm not-italic text-paper/35">
          — {view === "conventional" ? "live · estimated" : "computed locally from real tokens"}
        </span>
      </h3>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {view === "conventional" ? (
          <>
            {/* Conventional metrics bar chart */}
            <div className="rounded-xl border border-graphite-600 bg-graphite-900/70 p-4">
              <div className="mb-1 text-xs uppercase tracking-wide text-paper/40">
                Conventional · token &amp; latency
              </div>
              <div className="mb-1 text-[10px] text-paper/25">
                {state.conventional.cache?.input_tokens?.label ?? "estimated"} measurement
              </div>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e2427" />
                    <XAxis dataKey="name" tick={{ fill: "#e9e6de50", fontSize: 9 }} />
                    <YAxis tick={{ fill: "#e9e6de50", fontSize: 10 }} />
                    <Tooltip {...TOOLTIP_STYLE} />
                    {barData.map((entry, i) => (
                      <Bar key={i} dataKey="value" fill={entry.fill} radius={[4, 4, 0, 0]} maxBarSize={36} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Conventional summary */}
            <div className="flex flex-col gap-3">
              {/* Throughput */}
              <div className="rounded-xl border border-graphite-600 bg-graphite-900/70 p-4">
                <div className="mb-1 text-xs uppercase tracking-wide text-paper/40">Throughput</div>
                {tokensPerSec !== null ? (
                  <div>
                    <div className="readout text-2xl text-amber-300">{tokensPerSec}</div>
                    <div className="text-[11px] text-paper/40">tokens / second · live</div>
                  </div>
                ) : (
                  <div className="readout text-2xl text-paper/20">—</div>
                )}
              </div>

              {/* Input vs output */}
              <div className="rounded-xl border border-graphite-600 bg-graphite-900/70 p-4">
                <div className="mb-2 text-xs uppercase tracking-wide text-paper/40">Token breakdown</div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="readout text-lg text-amber-300">{inputTokens || "—"}</div>
                    <div className="text-[10px] text-paper/35">input</div>
                  </div>
                  <div>
                    <div className="readout text-lg text-orange-300">{outputTokens || "—"}</div>
                    <div className="text-[10px] text-paper/35">output</div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* BDH state norm line chart */}
            <div className="rounded-xl border border-graphite-600 bg-graphite-900/70 p-4">
              <div className="mb-1 text-xs uppercase tracking-wide text-paper/40">
                BDH-CQ · state norm (forward / backward / combined)
              </div>
              <div className="mb-1 text-[10px] text-paper/25">proxy — computed locally from real tokens</div>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stateData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e2427" />
                    <XAxis dataKey="step" tick={{ fill: "#e9e6de50", fontSize: 10 }} />
                    <YAxis tick={{ fill: "#e9e6de50", fontSize: 10 }} domain={["auto", "auto"]} />
                    <Tooltip {...TOOLTIP_STYLE} />
                    <Line type="monotone" dataKey="forward" stroke="#4fd1c9" dot={false} strokeWidth={2} connectNulls />
                    <Line type="monotone" dataKey="backward" stroke="#fb923c" dot={false} strokeWidth={2} connectNulls />
                    <Line type="monotone" dataKey="combined" stroke="#c084fc" dot={false} strokeWidth={2} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 flex gap-3 text-[10px] text-paper/35">
                <span className="flex items-center gap-1">
                  <span className="h-1 w-3 rounded-full bg-[#4fd1c9]" /> forward
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-1 w-3 rounded-full bg-[#fb923c]" /> backward
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-1 w-3 rounded-full bg-[#c084fc]" /> combined
                </span>
              </div>
            </div>

            {/* BDH summary */}
            <div className="flex flex-col gap-3">
              <div className="rounded-xl border border-graphite-600 bg-graphite-900/70 p-4">
                <div className="mb-2 text-xs uppercase tracking-wide text-paper/40">State updates</div>
                <div className="grid grid-cols-3 gap-1.5">
                  {(["forward", "backward", "combined"] as const).map((p, i) => {
                    const counts = [state.bdh.forwardSteps.length, state.bdh.backwardSteps.length, state.bdh.combinedSteps.length];
                    const colors = ["text-cyan-300", "text-amber-300", "text-violet-300"];
                    return (
                      <div key={p}>
                        <div className={`readout text-base ${colors[i]}`}>{counts[i]}</div>
                        <div className="text-[10px] text-paper/30">{p.slice(0, 3)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
