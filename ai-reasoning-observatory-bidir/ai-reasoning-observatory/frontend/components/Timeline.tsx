"use client";

import type { CSSProperties } from "react";
import type { ObservatoryEvent } from "@/lib/types";

const CHANNEL_COLOR: Record<string, { bg: string; text: string }> = {
  conventional: { bg: "bg-amber-400", text: "text-amber-300" },
  bdh_cq: { bg: "bg-cyan-400", text: "text-cyan-300" },
  system: { bg: "bg-paper/30", text: "text-paper/50" },
};

const EVENT_EMOJI: Record<string, string> = {
  prompt_received: "💬",
  tokenized: "🔤",
  context_prepared: "📦",
  rag_context: "📚",
  inference_started: "🚀",
  output_token: "⚡",
  state_update: "🔄",
  cache_update: "💾",
  inference_completed: "✅",
  evaluation_completed: "🎯",
  error: "❌",
  cancelled: "🚫",
  done: "🏁",
};

/** Format an event's real timestamp (epoch seconds → HH:MM:SS.mmm). */
function fmtTs(ts: number): string {
  const d = new Date(ts * 1000);
  const pad = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
}

/** Group consecutive output_token and state_update events so the timeline
 *  doesn't get flooded with hundreds of tiny dots during streaming. */
function groupEvents(events: ObservatoryEvent[]): ObservatoryEvent[] {
  const out: ObservatoryEvent[] = [];
  let lastType = "";
  let lastChannel = "";
  for (const ev of events) {
    const highFreq = ev.event_type === "output_token" || ev.event_type === "state_update";
    if (highFreq && ev.event_type === lastType && ev.channel === lastChannel) continue;
    out.push(ev);
    lastType = ev.event_type;
    lastChannel = ev.channel;
  }
  return out;
}

export default function Timeline({
  events,
  canReplay,
  onReplay,
  onReset,
}: {
  events: ObservatoryEvent[];
  canReplay: boolean;
  onReplay: () => void;
  onReset: () => void;
}) {
  const visible = groupEvents(events);

  return (
    <div
      className="glow-card rounded-xl border border-graphite-600 bg-graphite-900/70 p-4"
      style={{ "--glow": "233,230,222" } as CSSProperties}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-paper/50">
            Execution Timeline
          </h3>
          {events.length > 0 && (
            <span className="readout rounded-full border border-graphite-600 bg-graphite-950/60 px-2 py-0.5 text-[10px] text-paper/40">
              {events.length} events
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={onReplay}
            disabled={!canReplay}
            className="flex items-center gap-1.5 rounded-lg border border-graphite-600 px-3 py-1 text-xs text-paper/60 transition hover:border-paper/30 hover:text-paper disabled:cursor-not-allowed disabled:opacity-30"
            title="Re-emit this run's recorded events without calling the model again"
          >
            ▶ Replay
          </button>
          <button
            onClick={onReset}
            className="flex items-center gap-1.5 rounded-lg border border-graphite-600 px-3 py-1 text-xs text-paper/60 transition hover:border-paper/30 hover:text-paper"
          >
            ↺ Reset
          </button>
        </div>
      </div>

      {/* Dot timeline */}
      <div className="panel-scroll mb-2 flex max-h-14 flex-wrap items-center gap-1 overflow-y-auto">
        {visible.length === 0 && (
          <span className="text-xs text-paper/25">No events yet — submit a prompt to begin.</span>
        )}
        {visible.map((ev) => {
          const ch = CHANNEL_COLOR[ev.channel] ?? CHANNEL_COLOR.system;
          return (
            <span
              key={`${ev.run_id}-${ev.seq}`}
              className={`h-2.5 w-2.5 shrink-0 rounded-sm ${ch.bg} cursor-default transition-opacity hover:opacity-70`}
              title={`#${ev.seq} ${EVENT_EMOJI[ev.event_type] ?? ""} ${ev.event_type} (${ev.channel}) · ${fmtTs(ev.ts)}`}
            />
          );
        })}
      </div>

      {/* Last few events as readable text — with real timestamps (Phase 4) */}
      {visible.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {visible.slice(-6).map((ev) => {
            const ch = CHANNEL_COLOR[ev.channel] ?? CHANNEL_COLOR.system;
            return (
              <span
                key={`label-${ev.run_id}-${ev.seq}`}
                className={`readout flex items-center gap-1.5 rounded-full border border-graphite-700 bg-graphite-950/50 px-2 py-0.5 text-[10px] ${ch.text}`}
              >
                <span className="text-paper/35">{fmtTs(ev.ts)}</span>
                {EVENT_EMOJI[ev.event_type] ?? "·"} {ev.event_type.replace(/_/g, " ")}
              </span>
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div className="mt-2.5 flex gap-4 border-t border-graphite-700/40 pt-2">
        {Object.entries(CHANNEL_COLOR).map(([ch, c]) => (
          <span key={ch} className="flex items-center gap-1.5 text-[10px] text-paper/30">
            <span className={`h-2 w-2 rounded-sm ${c.bg}`} />
            {ch.replace("_", " ")}
          </span>
        ))}
      </div>
    </div>
  );
}
