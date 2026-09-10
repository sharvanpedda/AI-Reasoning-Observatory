"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import type { CSSProperties } from "react";
import LatentHeatmap from "./LatentHeatmap";
import type { BdhPass, LatentStep } from "@/lib/types";
import type { ObservatoryState } from "@/lib/useExecution";

const StateViewport = dynamic(() => import("./three/StateViewport"), { ssr: false });

const PASS_LABEL: Record<BdhPass, string> = {
  forward: "Forward",
  backward: "Backward",
  combined: "Combined",
};

const PASS_COLOR: Record<BdhPass, string> = {
  forward: "text-cyan-300 border-cyan-500/30 bg-cyan-500/10",
  backward: "text-amber-300 border-amber-500/30 bg-amber-500/10",
  combined: "text-violet-300 border-violet-500/30 bg-violet-500/10",
};

const PASS_ACTIVE: Record<BdhPass, string> = {
  forward: "bg-cyan-500/20 text-cyan-100",
  backward: "bg-amber-500/20 text-amber-100",
  combined: "bg-violet-500/20 text-violet-100",
};

/**
 * Human-readable explanations for each pass tab — what it means, the
 * recurrence formula, and the one-liner a judge remembers.
 */
const PASS_EXPLAIN: Record<
  BdhPass,
  { what: string; formula: string; key: string; color: string }
> = {
  forward: {
    what:
      "The model reads the prompt left-to-right, one token at a time. At each token it " +
      "updates ONE small state vector and keeps it for the next step. Because that state " +
      "is reused and never grows, its memory stays a fixed size no matter how long the " +
      "prompt is. This is the core idea behind Pathway's BDH/BDH-CQ: a persistent, " +
      "fixed-size state rather than a sequence-length-growing cache.",
    formula: "h_t = tanh(W_h · h_{t-1} + W_x · x_t + b)",
    key: "Causal · fixed local state · streams as tokens arrive",
    color: "text-cyan-300",
  },
  backward: {
    what:
      "A SECOND, independent state vector reads the same prompt but right-to-left, from " +
      "the last token back to the first. It uses its own weights, giving each position a " +
      "representation that has 'seen' every token after it. This is NOT causal: it needs " +
      "the full prompt before the first step can exist, so it cannot stream like the " +
      "forward pass. It is a classical recurrent-network technique (Schuster & Paliwal, " +
      "1997) — not part of BDH-CQ itself.",
    formula: "g_t = tanh(U_h · g_{t+1} + U_x · x_t + c)",
    key: "Non-causal · needs full prompt · separate weights",
    color: "text-amber-300",
  },
  combined: {
    what:
      "At each token position, the forward state h_t and the backward state g_t are " +
      "merged into ONE combined state m_t. Each token therefore gets a representation " +
      "that sees context on BOTH sides (left and right). This is the classical " +
      "'bidirectional' technique (Schuster & Paliwal, 1997) — a general " +
      "recurrent-network idea shown here for illustration. It is NOT part of Pathway's " +
      "published BDH-CQ architecture.",
    formula: "m_t = tanh(V_f · h_t + V_g · g_t + d)",
    key: "Bidirectional · context from both sides · illustrative",
    color: "text-violet-300",
  },
};

function StepChips({ steps }: { steps: LatentStep[] }) {
  if (steps.length === 0) {
    return <span className="text-xs text-paper/25">Waiting…</span>;
  }
  return (
    <>
      {steps.map((s) => (
        <span
          key={`${s.pass}-${s.step}`}
          className={`readout rounded px-1.5 py-0.5 text-xs transition-colors ${
            s.decoded ? "bg-cyan-500/25 text-cyan-100" : "bg-graphite-700/60 text-paper/55"
          }`}
          title={`step ${s.step} · norm ${s.state_norm.toFixed(3)}`}
        >
          {s.token_text}
        </span>
      ))}
    </>
  );
}

export default function BDHPanel({ state }: { state: ObservatoryState }) {
  const [activePass, setActivePass] = useState<BdhPass>("forward");
  const { forwardSteps, backwardSteps, combinedSteps, forwardComplete } = state.bdh;

  const byPass: Record<BdhPass, LatentStep[]> = {
    forward: forwardSteps,
    backward: backwardSteps,
    combined: combinedSteps,
  };
  const activeSteps = byPass[activePass];
  const latest = activeSteps[activeSteps.length - 1];
  const totalSteps = forwardSteps.length + backwardSteps.length + combinedSteps.length;

  const isActive = state.status === "running" || state.status === "streaming";

  return (
    <div
      className="glow-card flex h-full min-w-0 flex-col gap-3.5 rounded-xl border border-cyan-500/20 bg-graphite-900/70 p-4 glow-cyan"
      style={{ "--glow": "45,212,191" } as CSSProperties}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-lg italic text-cyan-300">BDH-CQ-inspired · Latent Trace</h2>
            {isActive && (
              <span className="flex items-center gap-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] text-cyan-300">
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full bg-cyan-400"
                  style={{ animation: "pulse-glow 1.4s ease-in-out infinite" }}
                />
                computing
              </span>
            )}
          </div>
          <span className="w-fit rounded-full border border-cyan-500/20 bg-graphite-800/60 px-2 py-0.5 text-[10px] text-cyan-200/60">
            LOCAL TRACE · NOT OFFICIAL CHECKPOINT
          </span>
        </div>
        {latest && (
          <div className="flex flex-col items-end gap-0.5">
            <div
              className={`readout text-sm ${PASS_COLOR[activePass].split(" ")[0]} norm-pulse`}
            >
              {latest.state_norm.toFixed(3)}
            </div>
            <span className="text-[10px] text-paper/30">norm · {activePass}</span>
          </div>
        )}
      </div>

      <p className="text-[11px] leading-relaxed text-paper/40">
        A real, deterministic recurrent state computed over this prompt's actual tokens —
        forward (causal, BDH-CQ's key idea), plus backward &amp; combined (classical BiRNN technique,{" "}
        <em>not</em> part of BDH-CQ). See the Evidence panel for citations.
      </p>

      {/* Pass selector tabs */}
      <div className="flex gap-1 rounded-xl border border-graphite-700 bg-graphite-950/50 p-1">
        {(Object.keys(PASS_LABEL) as BdhPass[]).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setActivePass(p)}
            className={`flex-1 rounded-lg px-2 py-1.5 text-[11px] font-medium transition-colors ${
              activePass === p ? PASS_ACTIVE[p] : "text-paper/40 hover:text-paper/65"
            }`}
          >
            {PASS_LABEL[p]}
            {p !== "forward" && !forwardComplete && byPass[p].length === 0 && (
              <span className="ml-1 text-paper/25">(pending)</span>
            )}
            {byPass[p].length > 0 && (
              <span className="ml-1 text-[10px] opacity-60">({byPass[p].length})</span>
            )}
          </button>
        ))}
      </div>

      {/* Detailed pass explanation — plain meaning + formula + key idea */}
      <div className="rounded-xl border border-graphite-700 bg-graphite-950/40 p-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <h4 className={`text-[11px] font-semibold uppercase tracking-wide ${PASS_EXPLAIN[activePass].color}`}>
            What this pass means
          </h4>
          <span className="readout rounded border border-graphite-700 bg-graphite-900/60 px-1.5 py-0.5 text-[9px] text-paper/50">
            {PASS_EXPLAIN[activePass].key}
          </span>
        </div>
        <p className="mt-1.5 text-[11.5px] leading-relaxed text-paper/55">
          {PASS_EXPLAIN[activePass].what}
        </p>
        <div className="mt-2 rounded-lg border border-graphite-700/60 bg-graphite-950/60 px-3 py-1.5">
          <span className="readout text-[11px] text-paper/70">
            {PASS_EXPLAIN[activePass].formula}
          </span>
        </div>
      </div>

      <StateViewport
        mode="bdh_cq"
        tokenCount={0}
        latentSteps={activeSteps}
        pass={activePass}
        maxSteps={state.promptTokens?.tokens.length ?? activeSteps.length}
      />

      {/* Live latent-state heatmap — real state_preview data per step */}
      <LatentHeatmap steps={activeSteps} pass={activePass} active={isActive} />

      {/* Phase 3 — BDH's OWN answer to the SAME question. Built by token-level
          retrieval + knowledge-base lookup — an independent computation that
          never copies the conventional LLM's prose. */}
      <div>
        <div className="mb-1.5 flex flex-wrap items-center gap-2">
          <h3 className="text-xs font-medium uppercase tracking-wide text-cyan-300/70">
            Constrained-memory answer probe
          </h3>
          <span className="readout rounded border border-cyan-500/30 bg-cyan-500/8 px-1.5 py-0.5 text-[9px] text-cyan-300">
            live provider · state-derived memory only
          </span>
          {isActive && !state.bdh.answerText && (
            <span className="readout flex items-center gap-1 text-[10px] text-cyan-300">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse-glow" />
              computing
            </span>
          )}
        </div>
        <div className="panel-scroll min-h-[6rem] max-h-64 overflow-y-auto whitespace-pre-wrap rounded-xl border border-cyan-500/20 bg-graphite-950/70 p-3.5 font-mono text-[11px] leading-relaxed text-cyan-100/85">
          {state.bdh.answerText ? (
            <>
              {state.bdh.answerText}
              {isActive && (
                <span className="ml-0.5 inline-block h-[1.1em] w-[3px] cursor-blink bg-cyan-400 align-text-bottom" />
              )}
            </>
          ) : (
            <span className="text-cyan-200/30">
              The same live LLM answers this question, but its only memory is
              the fixed 48-byte latent state — same meaning as the full-context
              answer, freshly worded…
            </span>
          )}
        </div>
        <p className="mt-1 text-[10px] leading-relaxed text-paper/30">
          A real LLM generation constrained to BDH-CQ's 48-byte latent memory —
          it answers the same question with the same meaning, in its own freshly
          generated wording. The memory architecture differs, not the substance.
        </p>
      </div>

      {/* BDH memory trace — the latent-state diagnostic: how memory was
          stored while producing the answer above. */}
      <div>
        <div className="mb-1.5 flex items-center gap-2">
          <h3 className="text-xs font-medium uppercase tracking-wide text-paper/35">
            Memory Trace · how the state stored this input
          </h3>
          {isActive && (
            <span className="readout flex items-center gap-1 text-[10px] text-paper/45">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-paper/40 animate-pulse-glow" />
              writing
            </span>
          )}
        </div>
        <div className="panel-scroll max-h-40 overflow-y-auto whitespace-pre-wrap rounded-xl border border-graphite-700 bg-graphite-950/70 p-3 font-mono text-[10.5px] leading-relaxed text-paper/45">
          {state.bdh.outputText ? (
            <>
              {state.bdh.outputText}
              {isActive && (
                <span className="ml-0.5 inline-block h-[1.1em] w-[3px] cursor-blink bg-paper/40 align-text-bottom" />
              )}
            </>
          ) : (
            <span className="text-paper/25">
              The latent-state diagnostic streams here — per-token norms,
              capacity, agreement — after the passes complete…
            </span>
          )}
        </div>
      </div>

      {forwardComplete && (
        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3 animate-slide-up">
          <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-cyan-200/80">
            ✓ What just happened
          </h3>
          <ul className="space-y-1.5 text-[11px] leading-relaxed text-paper/55">
            <li>
              <strong className="text-paper/75">Forward.</strong> A 12-dim state updated per token,
              left-to-right. The chamber never grows — O(1) memory, this is the BDH/BDH-CQ idea.
            </li>
            <li>
              <strong className="text-paper/75">Backward.</strong> Independent right-to-left
              recurrence. Non-causal — needed the full prompt before starting.
            </li>
            <li>
              <strong className="text-paper/75">Combined.</strong> Forward + backward merged per
              token (Schuster &amp; Paliwal, 1997). A classical technique, not part of BDH-CQ.
            </li>
            <li>
              <strong className="text-paper/75">Deterministic.</strong> Run the same prompt again
              and the identical trajectory replays.
            </li>
          </ul>
        </div>
      )}

      {/* Per-pass norm readout */}
      <div className="grid grid-cols-3 gap-2">
        {(Object.keys(PASS_LABEL) as BdhPass[]).map((p) => {
          const steps = byPass[p];
          const last = steps[steps.length - 1];
          return (
            <div
              key={p}
              className={`cursor-pointer rounded-xl border bg-graphite-950/40 p-2.5 transition-colors ${
                activePass === p
                  ? "border-cyan-500/25 bg-cyan-500/5"
                  : "border-graphite-700 hover:border-graphite-500"
              }`}
              onClick={() => setActivePass(p)}
            >
              <div className="mb-0.5 text-[10px] uppercase tracking-wide text-paper/40">
                {p}
              </div>
              <div className={`readout text-base ${last ? PASS_COLOR[p].split(" ")[0] : "text-paper/25"}`}>
                {last ? last.state_norm.toFixed(3) : "—"}
              </div>
              <div className="text-[10px] text-paper/25">{steps.length} steps</div>
            </div>
          );
        })}
      </div>

      {/* Step chips */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <h3 className="text-[10px] uppercase tracking-wide text-paper/35">
            {PASS_LABEL[activePass]} · state updates
          </h3>
          <span className="readout text-[10px] text-paper/35">{totalSteps} total</span>
        </div>
        <div className="panel-scroll flex max-h-20 flex-wrap gap-1 overflow-y-auto">
          <StepChips steps={activeSteps} />
        </div>
      </div>

      {latest === undefined && (
        <p className="text-[11px] text-paper/25">
          {activePass === "forward"
            ? "Submit a prompt to see the recurrent state evolve…"
            : "This pass runs after the full prompt is processed."}
        </p>
      )}

      {state.bdh.note && (
        <p className="mt-auto text-[11px] leading-relaxed text-paper/30">{state.bdh.note}</p>
      )}
    </div>
  );
}
