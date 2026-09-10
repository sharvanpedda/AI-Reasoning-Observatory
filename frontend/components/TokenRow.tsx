import MetricBadge from "./MetricBadge";
import type { Metric } from "@/lib/types";

export default function TokenRow({
  tokens,
  count,
  accent,
}: {
  tokens: string[] | null;
  count: Metric | null;
  accent: "amber" | "cyan";
}) {
  const chipClass =
    accent === "amber"
      ? "border-amber-500/20 bg-amber-500/10 text-amber-200"
      : "border-cyan-500/20 bg-cyan-500/10 text-cyan-200";

  return (
    <div>
      <div className="mb-1.5 flex items-center gap-2">
        <h3 className="text-[11px] font-medium uppercase tracking-wide text-paper/40">
          Prompt Tokens
        </h3>
        {count && <MetricBadge label={count.label} />}
        {count && (
          <span className="readout text-xs text-paper/50">
            {count.value}
            <span className="ml-0.5 text-[10px] text-paper/30"> tokens</span>
          </span>
        )}
      </div>
      <div className="panel-scroll flex max-h-20 flex-wrap gap-1 overflow-y-auto rounded-xl border border-graphite-700 bg-graphite-950/50 p-2">
        {tokens && tokens.length > 0 ? (
          tokens.map((t, i) => (
            <span
              key={i}
              className={`readout rounded border px-1.5 py-0.5 text-[11px] ${chipClass}`}
            >
              {t}
            </span>
          ))
        ) : (
          <span className="text-[11px] text-paper/25">
            Tokens will appear here after you submit a prompt…
          </span>
        )}
      </div>
    </div>
  );
}
