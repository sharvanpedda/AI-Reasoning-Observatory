"use client";

import type { RagInfo } from "@/lib/types";
import MetricBadge from "./MetricBadge";

/**
 * RagDisclosure — honest, always-visible notice of what the Agentic RAG
 * layer actually grounded the provider on. Nothing hidden: if the question
 * was classified "ai_memory" we show the retrieved passages used; if it was
 * general (no grounding) we say that plainly too.
 */
export default function RagDisclosure({ rag }: { rag: RagInfo | null }) {
  if (!rag) {
    return (
      <div className="rounded-lg border border-graphite-700 bg-graphite-950/40 px-3 py-2 text-[11px] text-paper/35">
        Agentic RAG · ground-truth disclosure appears once the run starts.
      </div>
    );
  }

  const hasSources = rag.sources.length > 0;

  return (
    <div className="rounded-lg border border-emerald-500/15 bg-emerald-500/5 px-3 py-2">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-300/90">
          Agentic RAG
        </span>
        <span className="rounded border border-graphite-600 bg-graphite-950/60 px-1.5 py-0.5 text-[10px] text-paper/50">
          {rag.mode === "ai_memory" ? "grounded" : "direct"}
        </span>
        {rag.injected_tokens && (
          <span className="flex items-center gap-1 text-[10px] text-paper/45">
            +<span className="readout text-paper/70">{rag.injected_tokens.value}</span>
            <span className="text-paper/30">injected</span>
            <MetricBadge label={rag.injected_tokens.label} />
          </span>
        )}
      </div>

      {hasSources ? (
        <ul className="mt-1.5 space-y-0.5">
          {rag.sources.map((s) => (
            <li key={s.id} className="flex items-center gap-1.5 text-[11px] text-paper/60">
              <span className="h-1 w-1 rounded-full bg-emerald-400/70" />
              <span className="text-emerald-200/70">{s.title}</span>
              <span className="readout text-[9px] text-paper/30">{s.id}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-[11px] text-paper/45">
          No curated passages matched — answered directly with clean formatting.
        </p>
      )}
    </div>
  );
}