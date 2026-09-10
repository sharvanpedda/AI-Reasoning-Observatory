"use client";

interface Row {
  attribute: string;
  conventional: string;
  bdh: string;
  icon?: string;
}

const ROWS: Row[] = [
  {
    attribute: "Memory model",
    icon: "🧠",
    conventional:
      "Context window — grows with every token. KV-cache size is not exposed by the provider (we never invent a number).",
    bdh: "Fixed-size local latent state in this observatory — 12 dimensions regardless of prompt length. The state vector changes; its allocated size does not.",
  },
  {
    attribute: "Per-token update",
    icon: "⚙️",
    conventional: "Attention can access prior context through the implementation's key/value representation; exact compute and cache behavior depends on the model/runtime.",
    bdh: "A local recurrent state update per token — forward, plus clearly-labeled classical backward/combined passes used for exploration.",
  },
  {
    attribute: "Causality",
    icon: "⏱️",
    conventional: "Fully causal — each output token is produced before the rest of the answer exists.",
    bdh: "Forward pass is causal and streams token-by-token. Backward & combined are non-causal — they need the full prompt before their first step.",
  },
  {
    attribute: "Reproducibility",
    icon: "🔁",
    conventional: "Live provider — output can differ run to run. What you see is real, not manufactured.",
    bdh: "Fully deterministic local trace — the same prompt replays the identical trajectory, step for step.",
  },
  {
    attribute: "Telemetry source",
    icon: "📊",
    conventional: "Provider-reported token counts (live) once inference starts; estimate beforehand.",
    bdh: "Computed locally and exactly: state norm per step and the 12-dim vector used by this trace.",
  },
  {
    attribute: "Failure isolation",
    icon: "⚡",
    conventional:
      "Provider chain falls over in priority order, then clearly-labeled Demo Mode — never a dead page.",
    bdh: "Pure local computation — nothing external to fail; works even if every provider is down.",
  },
  {
    attribute: "The key insight",
    icon: "💡",
    conventional: "O(n) memory that is always complete — remembers everything, at a cost that grows linearly.",
    bdh: "Fixed-size state in this trace — demonstrates the memory/computation trade-off without claiming it is the official BDH-CQ runtime.",
  },
];

export default function ComparisonTable() {
  return (
    <section className="mt-8">
      <div className="mb-1 flex items-center gap-3">
        <h2 className="font-display text-xl italic text-paper">
          Side by side{" "}
          <span className="text-paper/30">— same prompt, two architectures</span>
        </h2>
      </div>
      <p className="mb-4 text-xs leading-relaxed text-paper/40">
        Everything below is observable in the two panels above — no invented claims.
      </p>
      <div className="overflow-x-auto rounded-xl border border-graphite-600 shadow-lg">
        <table className="w-full border-collapse text-left text-[11px] leading-relaxed">
          <thead>
            <tr className="border-b border-graphite-600">
              <th className="w-[12%] bg-graphite-950/60 px-4 py-3 text-[10px] uppercase tracking-wide text-paper/35">
                Attribute
              </th>
              <th className="w-[44%] border-l border-graphite-600 bg-amber-500/8 px-4 py-3 font-display text-sm italic text-amber-300">
                ← Conventional LLM
              </th>
              <th className="w-[44%] border-l border-graphite-600 bg-cyan-500/8 px-4 py-3 font-display text-sm italic text-cyan-300">
                BDH-CQ-inspired trace →
              </th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row, i) => (
              <tr
                key={row.attribute}
                className="border-b border-graphite-700/40 last:border-b-0 hover:bg-paper/[0.02] transition-colors"
              >
                <td className="bg-graphite-950/30 px-4 py-3 font-medium text-paper/60">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-base">{row.icon}</span>
                    <span className="text-[10px] uppercase tracking-wide">{row.attribute}</span>
                  </div>
                </td>
                <td className="border-l border-graphite-600 bg-amber-500/[0.03] px-4 py-3 text-paper/55 hover:text-paper/70 transition-colors">
                  {row.conventional}
                </td>
                <td className="border-l border-graphite-600 bg-cyan-500/[0.03] px-4 py-3 text-paper/55 hover:text-paper/70 transition-colors">
                  {row.bdh}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
