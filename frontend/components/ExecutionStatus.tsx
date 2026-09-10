"use client";

import type { ExecutionStatus } from "@/lib/types";

const STATUS_CONFIG: Record<
  ExecutionStatus,
  { label: string; dotColor: string; textColor: string; borderColor: string; bgColor: string; pulse?: boolean }
> = {
  idle: {
    label: "Idle",
    dotColor: "bg-paper/30",
    textColor: "text-paper/40",
    borderColor: "border-graphite-600",
    bgColor: "bg-graphite-900/60",
  },
  preparing: {
    label: "Preparing…",
    dotColor: "bg-amber-400",
    textColor: "text-amber-300",
    borderColor: "border-amber-500/30",
    bgColor: "bg-amber-500/8",
    pulse: true,
  },
  running: {
    label: "Running",
    dotColor: "bg-emerald-400",
    textColor: "text-emerald-300",
    borderColor: "border-emerald-500/30",
    bgColor: "bg-emerald-500/8",
    pulse: true,
  },
  streaming: {
    label: "Streaming",
    dotColor: "bg-sky-400",
    textColor: "text-sky-300",
    borderColor: "border-sky-500/30",
    bgColor: "bg-sky-500/8",
    pulse: true,
  },
  completed: {
    label: "Completed",
    dotColor: "bg-emerald-500",
    textColor: "text-emerald-400",
    borderColor: "border-emerald-600/30",
    bgColor: "bg-emerald-500/8",
  },
  error: {
    label: "Error",
    dotColor: "bg-red-500",
    textColor: "text-red-400",
    borderColor: "border-red-500/30",
    bgColor: "bg-red-500/8",
  },
  cancelled: {
    label: "Cancelled",
    dotColor: "bg-paper/30",
    textColor: "text-paper/50",
    borderColor: "border-graphite-600",
    bgColor: "bg-graphite-900/60",
  },
};

export default function ExecutionStatusBadge({ status }: { status: ExecutionStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.idle;
  return (
    <div
      className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${cfg.borderColor} ${cfg.bgColor}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${cfg.dotColor} ${cfg.pulse ? "animate-pulse-glow" : ""}`}
      />
      <span className={`readout ${cfg.textColor}`}>{cfg.label}</span>
    </div>
  );
}
