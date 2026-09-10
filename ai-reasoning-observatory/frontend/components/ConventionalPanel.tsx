"use client";

import type { CSSProperties } from "react";

import dynamic from "next/dynamic";
import MetricBadge from "./MetricBadge";
import TokenRow from "./TokenRow";
import GeneratedOutputPanel from "./GeneratedOutputPanel";
import ContextCacheRow from "./ContextCacheRow";
import RagDisclosure from "./RagDisclosure";
import type { ObservatoryState } from "@/lib/useExecution";

const StateViewport = dynamic(() => import("./three/StateViewport"), { ssr: false });

const STAGES = ["Input", "Tokenize", "Inference", "Decode", "Response"];

function Pipeline({ status }: { status: ObservatoryState["status"] }) {
  const activeIndex =
    status === "idle" ? -1
    : status === "preparing" ? 1
    : status === "streaming" ? 3
    : status === "completed" ? 4
    : 2;

  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1">
      {STAGES.map((stage, i) => (
        <div key={stage} className="flex shrink-0 items-center gap-1">
          <span
            className={`rounded-full border px-2.5 py-0.5 text-[10px] whitespace-nowrap transition-colors duration-300 ${
              i === activeIndex
                ? "border-amber-400/70 bg-amber-400/20 text-amber-200 font-medium"
                : i < activeIndex
                ? "border-amber-600/30 bg-amber-600/8 text-amber-500/70"
                : "border-graphite-600 text-paper/25"
            }`}
          >
            {stage}
          </span>
          {i < STAGES.length - 1 && (
            <span className={`text-[10px] transition-colors ${i < activeIndex ? "text-amber-600/50" : "text-paper/15"}`}>
              →
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function providerLabel(state: ObservatoryState): string {
  return state.conventional.demoMode ? "demo mode" : (state.conventional.provider ?? "live");
}

export default function ConventionalPanel({
  state,
  elapsedMs,
}: {
  state: ObservatoryState;
  elapsedMs: number | null;
}) {
  const active = state.status === "running" || state.status === "streaming";

  return (
    <div
      className="glow-card flex h-full min-w-0 flex-col gap-3.5 rounded-xl border border-amber-500/20 bg-graphite-900/70 p-4 glow-amber"
      style={{ "--glow": "245,158,60" } as CSSProperties}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-lg italic text-amber-300">Conventional LLM</h2>
            {active && (
              <span className="flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-300">
                <span className="live-dot" />
                live
              </span>
            )}
          </div>
          {state.conventional.provider && (
            <span className="w-fit rounded-full border border-emerald-500/30 bg-emerald-500/8 px-2 py-0.5 text-[10px] uppercase tracking-wider text-emerald-400">
              {state.conventional.demoMode ? "demo" : state.conventional.provider}
            </span>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          {/* Live elapsed clock while running */}
          {elapsedMs !== null && active && (
            <div className="readout text-sm text-amber-300">
              {(elapsedMs / 1000).toFixed(1)}
              <span className="text-[10px] text-paper/40">s</span>
            </div>
          )}
          {/* Completed latency */}
          {state.conventional.latencyMs && !active && (
            <div className="flex items-center gap-1.5">
              <span className="readout text-sm text-paper/70">
                {state.conventional.latencyMs.value}
                <span className="text-[10px] text-paper/40">ms</span>
              </span>
              <MetricBadge label={state.conventional.latencyMs.label} />
            </div>
          )}
        </div>
      </div>

      <Pipeline status={state.status} />

      {/* Agentic RAG disclosure — what grounded the answer (Phase 2) */}
      <RagDisclosure rag={state.conventional.rag} />

      <StateViewport
        mode="conventional"
        tokenCount={
          (state.promptTokens?.tokens.length ?? 0) +
          state.conventional.outputText.split(/\s+/).filter(Boolean).length
        }
        latentSteps={[]}
      />

      <TokenRow
        tokens={state.promptTokens?.tokens ?? null}
        count={state.promptTokens?.count ?? null}
        accent="amber"
      />

      <GeneratedOutputPanel
        text={state.conventional.outputText}
        outputTokens={state.conventional.cache?.output_tokens ?? null}
        demoMode={state.conventional.demoMode}
        active={active}
      />

      <ContextCacheRow
        inputTokens={state.conventional.cache?.input_tokens ?? state.contextEstimate}
        outputTokens={state.conventional.cache?.output_tokens ?? null}
        kvCache={state.conventional.cache?.kv_cache ?? null}
      />

      {state.conventional.completed && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 animate-slide-up">
          <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-amber-200/80">
            ✓ What just happened
          </h3>
          <ul className="space-y-1.5 text-[11px] leading-relaxed text-paper/55">
            <li>
              <strong className="text-paper/75">The stream.</strong> Tokens arrived over the wire
              and were appended to the context — the bar sequence in the viewport only ever grows.
              That growing row is the context-window memory (KV cache): nothing is dropped, nothing
              compressed, the cost grows with every new token.
            </li>
            <li>
              <strong className="text-paper/75">Telemetry.</strong> Token counts above are the
              provider's own reported usage — the pre-inference estimate is superseded the moment
              real numbers arrive.
            </li>
            <li>
              <strong className="text-paper/75">Provider:</strong>{" "}
              <span className="readout text-emerald-400">{providerLabel(state)}</span>
              {" "}— latency{" "}
              {state.conventional.latencyMs ? (
                <>
                  <span className="readout">{state.conventional.latencyMs.value}</span>
                  {" ms · "}
                  <MetricBadge label={state.conventional.latencyMs.label} />
                </>
              ) : (
                "unavailable"
              )}
            </li>
          </ul>
        </div>
      )}

      <p className="mt-auto text-[11px] leading-relaxed text-paper/30">
        Only observable pipeline stages and provider-reported telemetry —
        no private chain-of-thought is claimed (FR-23).
      </p>
    </div>
  );
}
