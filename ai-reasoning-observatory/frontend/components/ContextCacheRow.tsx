import MetricBadge from "./MetricBadge";
import type { Metric } from "@/lib/types";

function Cell({
  label,
  metric,
  unit,
  icon,
}: {
  label: string;
  metric: Metric | null | undefined;
  unit?: string;
  icon?: string;
}) {
  return (
    <div className="rounded-xl border border-graphite-700 bg-graphite-950/50 p-2.5">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wide text-paper/35">
          {icon && <span className="mr-1">{icon}</span>}
          {label}
        </span>
        {metric && <MetricBadge label={metric.label} />}
      </div>
      <div className="readout text-sm font-medium text-paper/85">
        {metric && metric.value !== null && metric.value !== undefined ? (
          <>
            {metric.value}
            {unit && <span className="ml-1 text-[10px] text-paper/35">{unit}</span>}
          </>
        ) : (
          <span className="text-xs text-paper/30">{metric?.note || "Not exposed by provider"}</span>
        )}
      </div>
    </div>
  );
}

export default function ContextCacheRow({
  inputTokens,
  outputTokens,
  kvCache,
}: {
  inputTokens: Metric | null;
  outputTokens: Metric | null;
  kvCache: Metric | null;
}) {
  return (
    <div>
      <h3 className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-paper/35">
        Context / Cache
      </h3>
      <div className="grid grid-cols-3 gap-2">
        <Cell label="Input" metric={inputTokens} unit="tok" icon="📥" />
        <Cell label="Output" metric={outputTokens} unit="tok" icon="📤" />
        <Cell label="KV Cache" metric={kvCache} icon="💾" />
      </div>
    </div>
  );
}
