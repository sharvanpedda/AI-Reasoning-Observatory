"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import BDHPanel from "@/components/BDHPanel";
import ComparisonTable from "@/components/ComparisonTable";
import ContextStressTest from "@/components/ContextStressTest";
import ExportRunButton from "@/components/ExportRunButton";
import ConventionalPanel from "@/components/ConventionalPanel";
import ErrorBanner from "@/components/ErrorBanner";
import EvidencePanel from "@/components/EvidencePanel";
import ExecutionStatusBadge from "@/components/ExecutionStatus";
import FlowProgress from "@/components/FlowProgress";
import MemoryRaceStrip from "@/components/MemoryRaceStrip";
import PathwayAchievementPanel from "@/components/PathwayAchievementPanel";
import PromptBar from "@/components/PromptBar";
import ScalingChart from "@/components/ScalingChart";
import SectionGate from "@/components/SectionGate";
import TelemetryCharts from "@/components/TelemetryCharts";
import Timeline from "@/components/Timeline";
import TheoryComparison from "@/components/TheoryComparison";
import ViewToggle, { type View } from "@/components/ViewToggle";
import { useExecution } from "@/lib/useExecution";
import { useFlowPhase } from "@/lib/useFlowPhase";

/** Live elapsed clock */
function useElapsedMs(status: string): number | null {
  const [elapsed, setElapsed] = useState<number | null>(null);
  const startRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (status === "running" || status === "streaming" || status === "preparing") {
      if (startRef.current === null) {
        startRef.current = Date.now();
        setElapsed(0);
        timerRef.current = setInterval(() => {
          setElapsed(Date.now() - startRef.current!);
        }, 100);
      }
    } else if (status === "completed" || status === "error" || status === "cancelled") {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    } else if (status === "idle") {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      startRef.current = null;
      setElapsed(null);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [status]);

  return elapsed;
}

const PRESET_PROMPTS = [
  "Objective check: what is 27 × 43? Explain briefly.",
  "Memory concept: why does a transformer KV-cache grow with context?",
  "Reasoning: explain how a recurrent latent state differs from token-by-token reasoning.",
  "Stress test: summarize this idea in one sentence, then explain the trade-off in simple terms.",
];

export default function Home() {
  const { state, run, cancel, reset, replay } = useExecution();
  const { phase, isActive, isComplete } = useFlowPhase(state);

  const canReplay =
    state.runId !== null &&
    (state.status === "completed" || state.status === "cancelled" || state.status === "error");

  const elapsedMs = useElapsedMs(state.status);

  // Which architecture's page is active — "split" is the DEFAULT.
  const [view, setView] = useState<View>("split");

  const handleRun = useCallback(
    (p: string) => { run(p); },
    [run]
  );

  const outputTokenCount = Number(state.conventional.cache?.output_tokens?.value ?? 0);
  const tokensPerSec =
    elapsedMs && elapsedMs > 500 && outputTokenCount > 0
      ? (outputTokenCount / (elapsedMs / 1000)).toFixed(1)
      : null;

  const isLive = state.status === "running" || state.status === "streaming";
  const isIdle = state.status === "idle";
  const showPostRun = isComplete || state.status === "error" || state.status === "cancelled";

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-10">
      {/* ══════════════════════════════════════════════════════════════
          HERO HEADER — always visible
      ══════════════════════════════════════════════════════════════ */}
      <header className="mb-6 animate-slide-up">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-amber-500/40 bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-300">
            AI Memory Observatory
          </span>
          <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-0.5 text-[11px] uppercase tracking-wide text-cyan-300">
            Token Memory vs Latent Memory
          </span>
        </div>

        <h1 className="font-display text-4xl italic leading-tight text-paper md:text-5xl">
          AI Reasoning Observatory
        </h1>

        <div className="mt-3 rounded-2xl border border-graphite-600 bg-graphite-900/70 p-5 shadow-lg">
          <p className="font-display text-2xl italic leading-tight text-paper md:text-3xl">
            AI can give us an answer.
            <br />
            <span className="text-cyan-300">Can we see what it remembers while getting there?</span>
          </p>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-paper/50">
            Ask one question. Two AI designs answer it at the same time — one
            <span className="text-amber-300"> keeps every word you type</span>, the other
            <span className="text-cyan-300"> keeps one tiny summary that never grows</span>.
            Watch both happen live, section by section.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-3">
            {[
              ["01", "ASK", "Give the observatory any reasonable question."],
              ["02", "WATCH", "The page scrolls through each section — one at a time."],
              ["03", "COMPARE", "Read the evidence instead of trusting a black-box claim."],
            ].map(([n, title, desc]) => (
              <div key={n} className="rounded-xl border border-graphite-700 bg-graphite-950/60 p-3">
                <div className="mb-1 flex items-center gap-2">
                  <span className="readout text-[10px] text-amber-300">{n}</span>
                  <span className="text-[10px] font-semibold tracking-[0.18em] text-paper/60">{title}</span>
                </div>
                <p className="text-[11px] leading-relaxed text-paper/40">{desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px]">
            <span className="rounded-full border border-emerald-500/25 bg-emerald-500/8 px-2 py-0.5 text-emerald-300">
              LIVE = observed at runtime
            </span>
            <span className="rounded-full border border-amber-500/25 bg-amber-500/8 px-2 py-0.5 text-amber-300">
              ESTIMATE = transparent calculation
            </span>
            <span className="rounded-full border border-violet-500/25 bg-violet-500/8 px-2 py-0.5 text-violet-300">
              PUBLISHED = external research
            </span>
            <span className="rounded-full border border-graphite-600 bg-graphite-950/50 px-2 py-0.5 text-paper/35">
              UNAVAILABLE = never fabricated
            </span>
          </div>
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════════════
          PROMPT INPUT — always visible
      ══════════════════════════════════════════════════════════════ */}
      <section className="mb-4 animate-slide-up" style={{ animationDelay: "60ms" }}>
        <PromptBar status={state.status} onSubmit={handleRun} onCancel={cancel} />

        {isIdle && (
          <p className="mt-2 text-[12px] leading-relaxed text-paper/45">
            Press Enter and this page runs your question through{" "}
            <span className="text-amber-300/80">two AI designs</span> and shows you, live, how
            each one remembers your words. The page scrolls through each section
            automatically — one step at a time. Everything you see really happens.
          </p>
        )}

        {(isIdle || isComplete) && (
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="self-center text-[11px] text-paper/30">Try:</span>
            {PRESET_PROMPTS.map((p) => (
              <button
                key={p}
                onClick={() => handleRun(p)}
                className="rounded-full border border-graphite-600 bg-graphite-900/60 px-3 py-1 text-[11px] text-paper/55 transition hover:border-paper/30 hover:text-paper/80"
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* ══════════════════════════════════════════════════════════════
          STATUS BAR — always visible during a run
      ══════════════════════════════════════════════════════════════ */}
      <section className="mb-4 flex flex-wrap items-center gap-3 animate-fade-in" style={{ animationDelay: "100ms" }}>
        <ExecutionStatusBadge status={state.status} />

        {elapsedMs !== null && (
          <div className="flex items-center gap-1.5 rounded border border-graphite-600 bg-graphite-950/60 px-2 py-0.5">
            {isLive && <span className="live-dot" />}
            <span className="readout text-xs text-paper/70">{(elapsedMs / 1000).toFixed(1)}s</span>
          </div>
        )}

        {tokensPerSec && (
          <div className="flex items-center gap-1.5 rounded border border-amber-500/25 bg-amber-500/8 px-2 py-0.5">
            <span className="readout text-xs text-amber-300">{tokensPerSec} tok/s</span>
            <span className="text-[10px] text-paper/35">live</span>
          </div>
        )}

        {state.conventional.demoMode && state.status !== "idle" && (
          <span className="readout rounded border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-300">
            Demo Mode — no live provider
          </span>
        )}

        {state.conventional.provider && !state.conventional.demoMode && (
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/8 px-2.5 py-0.5 text-[11px] uppercase tracking-wide text-emerald-300">
            {state.conventional.provider}
          </span>
        )}
      </section>

      <ErrorBanner errors={state.errors} />

      {/* ══════════════════════════════════════════════════════════════
          FLOW PROGRESS — sticky indicator showing sequential phases
      ══════════════════════════════════════════════════════════════ */}
      {(isActive || isComplete || phase > 0) && (
        <FlowProgress phase={phase} isActive={isActive} isComplete={isComplete} />
      )}

      {/* ══════════════════════════════════════════════════════════════
          PHASE 1 — Memory in use (the "aha moment")
      ══════════════════════════════════════════════════════════════ */}
      <div className="mb-5">
        <SectionGate
          phase={phase}
          requiredPhase={1}
          sectionId="sec-memory"
          label="Memory in use"
          number={1}
        >
          <MemoryRaceStrip state={state} />
        </SectionGate>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          PHASE 2 — Memory scaling chart
      ══════════════════════════════════════════════════════════════ */}
      <div className="mb-6">
        <SectionGate
          phase={phase}
          requiredPhase={2}
          sectionId="sec-scaling"
          label="Memory scaling"
          number={2}
        >
          <ScalingChart state={state} />
        </SectionGate>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          PHASE 3 — Architecture (side-by-side answers + comparison)
      ══════════════════════════════════════════════════════════════ */}
      <div className="my-4">
        <SectionGate
          phase={phase}
          requiredPhase={3}
          sectionId="sec-answers"
          label="Architecture — one prompt, two answers"
          number={3}
        >
          {/* Section heading */}
          <div className="mb-4 flex items-center gap-3">
            <span className="h-px flex-1 bg-gradient-to-r from-transparent via-graphite-600 to-transparent" />
            <h2 className="font-display text-xl italic text-paper">
              One prompt, two architectures{" "}
              <span className="text-paper/30">— flip the switch to see each</span>
            </h2>
            <span className="h-px flex-1 bg-gradient-to-l from-transparent via-graphite-600 to-transparent" />
          </div>

          <div className="mb-5">
            <ViewToggle view={view} onChange={setView} />
          </div>

          {/* Main architecture panels */}
          <div className="animate-slide-up" key={view}>
            {view === "split" ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <ConventionalPanel state={state} elapsedMs={elapsedMs} />
                <BDHPanel state={state} />
              </div>
            ) : view === "conventional" ? (
              <ConventionalPanel state={state} elapsedMs={elapsedMs} />
            ) : (
              <BDHPanel state={state} />
            )}
          </div>

          <ComparisonTable />
          <TheoryComparison />
        </SectionGate>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          PHASE 4 — Execution timeline
      ══════════════════════════════════════════════════════════════ */}
      <div className="mb-6">
        <SectionGate
          phase={phase}
          requiredPhase={4}
          sectionId="sec-timeline"
          label="Execution timeline"
          number={4}
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[0.18em] text-paper/30">
              Verifiable by anyone
            </span>
            <ExportRunButton state={state} />
          </div>
          <Timeline events={state.events} canReplay={canReplay} onReplay={replay} onReset={reset} />
        </SectionGate>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          PHASE 5 — BDH-CQ telemetry
      ══════════════════════════════════════════════════════════════ */}
      <div className="mb-6">
        <SectionGate
          phase={phase}
          requiredPhase={5}
          sectionId="sec-telemetry"
          label="BDH-CQ telemetry"
          number={5}
        >
          <TelemetryCharts state={state} elapsedMs={elapsedMs} view={view} />
        </SectionGate>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          POST-RUN SECTIONS — shown after the flow completes
      ══════════════════════════════════════════════════════════════ */}
      {showPostRun && (
        <>
          {/* Interactive context stress test */}
          <section className="mb-5 animate-fade-in">
            <ContextStressTest />
          </section>

          {/* Judge lens */}
          <section className="mb-5 rounded-xl border border-cyan-500/15 bg-cyan-500/[0.03] p-4 animate-fade-in">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300/70">
                  HACKATHON LENS
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-paper/40">
                  Watch each section in order. Don't skip ahead — the story builds itself step by step.
                </p>
                <h2 className="mt-1 font-display text-xl italic text-paper/90">
                  Don't just read the dashboard. Change the question.
                </h2>
              </div>
              <span className="readout rounded-full border border-graphite-600 bg-graphite-950/60 px-2.5 py-1 text-[10px] text-paper/45">
                one input → independent execution → observable evidence
              </span>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
              <div className="rounded-lg bg-graphite-950/50 p-3">
                <div className="text-[10px] font-semibold text-amber-300">WATCH #1 · MEMORY</div>
                <p className="mt-1 text-[11px] leading-relaxed text-paper/45">
                  The conventional side exposes token usage; the local latent trace exposes a fixed-size state update.
                </p>
              </div>
              <div className="rounded-lg bg-graphite-950/50 p-3">
                <div className="text-[10px] font-semibold text-cyan-300">WATCH #2 · EXECUTION</div>
                <p className="mt-1 text-[11px] leading-relaxed text-paper/45">
                  The timeline is driven by real backend events — not a prerecorded animation.
                </p>
              </div>
              <div className="rounded-lg bg-graphite-950/50 p-3">
                <div className="text-[10px] font-semibold text-violet-300">WATCH #3 · EVIDENCE</div>
                <p className="mt-1 text-[11px] leading-relaxed text-paper/45">
                  Every number is labeled live, estimated, published, proxy, or unavailable.
                </p>
              </div>
            </div>
          </section>

          {/* Pathway achievements */}
          <section className="mb-6">
            <PathwayAchievementPanel />
          </section>

          {/* Evidence & scientific integrity */}
          <section>
            <EvidencePanel />
          </section>
        </>
      )}

      <footer className="mt-10 flex flex-col items-center gap-1 text-center text-[11px] text-paper/25">
        <span>
          Every metric labeled{" "}
          <span className="text-amber-400/60">live</span>,{" "}
          <span className="text-paper/40">estimated</span>,{" "}
          <span className="text-paper/30">unavailable</span>, or{" "}
          <span className="text-cyan-400/60">published</span>{" "}
          — never invented.
        </span>
        <span>AI Memory Observatory · Token Memory vs Latent Memory</span>
      </footer>
    </main>
  );
}
