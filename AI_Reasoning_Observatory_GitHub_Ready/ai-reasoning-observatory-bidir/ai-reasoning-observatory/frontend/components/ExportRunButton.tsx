"use client";

import { useState } from "react";
import type { ObservatoryState } from "@/lib/useExecution";

/**
 * ExportRunButton — one-click reproducibility for judges.
 *
 * Downloads the entire run — prompt, run_id, every SSE event with its
 * timestamp and channel, the provider-reported telemetry, and the
 * evaluation verdicts — as a JSON file. Anyone can re-verify every
 * number shown in the UI offline, and re-running the same prompt shows
 * the latent trace reproduces exactly (deterministic seeds).
 */

function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function ExportRunButton({ state }: { state: ObservatoryState }) {
  const [copied, setCopied] = useState(false);

  const disabled = state.events.length === 0;

  function exportRun() {
    const payload = {
      exported_at: new Date().toISOString(),
      run_id: state.runId,
      prompt: state.prompt,
      status: state.status,
      prompt_tokens_estimated: state.promptTokens?.count ?? null,
      telemetry: {
        input_tokens: state.conventional.cache?.input_tokens ?? null,
        output_tokens: state.conventional.cache?.output_tokens ?? null,
        kv_cache: state.conventional.cache?.kv_cache ?? null,
        latency_ms: state.conventional.latencyMs ?? null,
        provider: state.conventional.provider,
        demo_mode: state.conventional.demoMode,
      },
      bdh: {
        state_dim: 12,
        state_bytes: 48,
        forward_steps: state.bdh.forwardSteps.length,
        backward_steps: state.bdh.backwardSteps.length,
        combined_steps: state.bdh.combinedSteps.length,
        final_norms: {
          forward: state.bdh.forwardSteps.at(-1)?.state_norm ?? null,
          backward: state.bdh.backwardSteps.at(-1)?.state_norm ?? null,
          combined: state.bdh.combinedSteps.at(-1)?.state_norm ?? null,
        },
      },
      evaluation: state.evaluation,
      events: state.events,
    };
    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    downloadJson(payload, `observatory-run-${stamp}.json`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={exportRun}
      disabled={disabled}
      title="Download the full run — every event, timestamp and metric — as JSON"
      className="flex items-center gap-1.5 rounded-lg border border-graphite-600 px-3 py-1 text-xs text-paper/60 transition hover:border-emerald-400/40 hover:text-emerald-200 disabled:cursor-not-allowed disabled:opacity-30"
    >
      {copied ? "✓ exported" : "⬇ Export run (JSON)"}
    </button>
  );
}
