const CONFIG: Record<
  string,
  { text: string; dot: string; border: string; bg: string }
> = {
  live: {
    text: "text-emerald-400",
    dot: "bg-emerald-400",
    border: "border-emerald-500/25",
    bg: "bg-emerald-500/8",
  },
  estimated: {
    text: "text-paper/50",
    dot: "bg-paper/30",
    border: "border-paper/15",
    bg: "bg-graphite-950/40",
  },
  unavailable: {
    text: "text-paper/30",
    dot: "bg-paper/15",
    border: "border-paper/10",
    bg: "bg-graphite-950/30",
  },
  published: {
    text: "text-cyan-300",
    dot: "bg-cyan-400",
    border: "border-cyan-500/25",
    bg: "bg-cyan-500/8",
  },
};

export default function MetricBadge({ label }: { label: string }) {
  const cfg = CONFIG[label?.toLowerCase()] ?? CONFIG.estimated;
  return (
    <span
      className={`readout flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] uppercase tracking-wider ${cfg.text} ${cfg.border} ${cfg.bg}`}
    >
      <span className={`h-1 w-1 rounded-full ${cfg.dot}`} />
      {label}
    </span>
  );
}
