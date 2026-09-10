"use client";

import type { EvaluationInfo } from "@/lib/types";

/**
 * EvaluationPanel — Phase 4. Shows both answers' correctness with an honest,
 * method-labeled score. The caveat is always visible: only a `known_answer`
 * score is a factual verdict; `reference_overlap` and `structural` are
 * clearly labeled proxies.
 */

const METHOD_LABEL: Record<string, string> = {
  known_answer: "verifiable objective check",
  reference_overlap: "topical-grounding proxy",
  structural: "report-completeness (not factual)",
};

function ScoreCell({
  title,
  color,
  score,
  method,
  label,
  note,
}: {
  title: string;
  color: "amber" | "cyan";
  score: number;
  method: string;
  label: string;
  note: string;
}) {
  const pct = Math.round(score * 100);
  const bar = color === "amber" ? "bg-amber-400" : "bg-cyan-400";
  const text = color === "amber" ? "text-amber-300" : "text-cyan-300";

  return (
    <div className="flex h-full flex-col gap-2 rounded-xl border border-graphite-600 bg-graphite-900/60 p-4">
      <div className="flex items-center justify-between">
        <h3 className={`font-display text-sm italic ${text}`}>{title}</h3>
        <span className="readout rounded border border-graphite-600 bg-graphite-950/60 px-1.5 py-0.5 text-[10px] text-paper/50">
          {METHOD_LABEL[method] ?? method}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <span className={`readout text-3xl font-black ${text}`}>{pct}%</span>
        <span className="rounded border border-graphite-600 bg-graphite-950/50 px-2 py-0.5 text-[11px] text-paper/60">
          {label}
        </span>
      </div>

      <div className="h-2.5 overflow-hidden rounded-full bg-graphite-950/80">
        <div
          className={`h-full rounded-full ${bar} transition-all duration-700`}
          style={{ width: `${Math.max(2, Math.min(100, pct))}%` }}
        />
      </div>

      <p className="text-[11px] leading-relaxed text-paper/45">{note}</p>
    </div>
  );
}

export default function EvaluationPanel({ evaluation }: { evaluation: EvaluationInfo | null }) {
  if (!evaluation) return null;

  return (
    <section className="mt-6 animate-slide-up">
      <div className="mb-1 flex items-center gap-3">
        <h2 className="font-display text-xl italic text-paper">
          Did they answer correctly?{" "}
          <span className="text-paper/30">— honest, method-labeled scores</span>
        </h2>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
        <ScoreCell
          title="Conventional LLM"
          color="amber"
          score={evaluation.conventional.score}
          method={evaluation.conventional.method}
          label={evaluation.conventional.label}
          note={evaluation.conventional.note}
        />
        <ScoreCell
          title="BDH-CQ latent state"
          color="cyan"
          score={evaluation.bdh.score}
          method={evaluation.bdh.method}
          label={evaluation.bdh.label}
          note={evaluation.bdh.note}
        />
      </div>

      <div className="mt-3 rounded-xl border border-graphite-700 bg-graphite-950/60 px-4 py-3">
        <span className="text-[11px] leading-relaxed text-paper/40">
          <span className="font-semibold text-paper/60">⚠ How to read this: </span>
          {evaluation.caveat}
        </span>
      </div>
    </section>
  );
}