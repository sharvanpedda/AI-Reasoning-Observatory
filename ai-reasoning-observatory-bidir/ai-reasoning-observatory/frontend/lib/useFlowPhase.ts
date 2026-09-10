"use client";

import { useEffect, useRef, useState } from "react";
import type { ObservatoryState } from "./useExecution";

/**
 * Flow phases — the sequential story the observatory tells.
 *
 * Each phase corresponds to one section of the page. The phase only
 * advances when the previous section's data has fully arrived, so the
 * page walks through the run one stage at a time — like a flowchart
 * where each box completes before the next one starts.
 *
 * 0 = idle
 * 1 = Memory in use        (tokenized + first BDH steps)
 * 2 = Memory scaling       (state_updates streaming, scaling chart live)
 * 3 = Architecture answers (both panels have answer text)
 * 4 = Execution timeline   (both sides done + events log)
 * 5 = BDH-CQ telemetry    (run fully completed)
 */
export type FlowPhase = 0 | 1 | 2 | 3 | 4 | 5;

export const PHASE_META: {
  id: string;
  label: string;
  caption: string;
  sectionId: string;
  /** When this becomes the active phase */
  gate: (s: ObservatoryState) => boolean;
}[] = [
  {
    id: "memory",
    label: "Memory in use",
    caption:
      "Your question goes to two AI designs at once. The left one keeps every single word of what you asked. The right one rewrites one small note it carries — the same size, always.",
    sectionId: "sec-memory",
    gate: (s) => {
      if (s.status === "idle" || s.status === "error" || s.status === "cancelled") return false;
      return s.promptTokens !== null || s.bdh.steps.length > 0;
    },
  },
  {
    id: "scaling",
    label: "Memory scaling",
    caption:
      "As your question gets processed, the left one has to carry more and more memory. The right one? Exactly the same size as before — 48 bytes. That difference is the whole idea.",
    sectionId: "sec-scaling",
    gate: (s) => {
      if (s.status === "idle" || s.status === "error" || s.status === "cancelled") return false;
      return s.bdh.steps.length >= 3;
    },
  },
  {
    id: "architecture",
    label: "Architecture",
    caption:
      "Both sides answer your question — the conventional LLM first, then the BDH-CQ-constrained answer. Same prompt, different memory, different results. Watch both happen live.",
    sectionId: "sec-answers",
    gate: (s) => {
      if (s.status === "idle" || s.status === "error" || s.status === "cancelled") return false;
      return s.conventional.completed || s.bdh.completed;
    },
  },
  {
    id: "timeline",
    label: "Execution timeline",
    caption:
      "Everything that just happened, listed one line at a time. Every event, every token, every state update — the honest log behind everything you just watched.",
    sectionId: "sec-timeline",
    gate: (s) => {
      if (s.status === "idle" || s.status === "error" || s.status === "cancelled") return false;
      return s.conventional.completed && s.bdh.completed;
    },
  },
  {
    id: "telemetry",
    label: "BDH-CQ telemetry",
    caption:
      "The telemetry charts — token counts, latency, state-norm evolution, and throughput. The final numbers behind the entire run, computed from real data.",
    sectionId: "sec-telemetry",
    gate: (s) => {
      if (s.status === "idle" || s.status === "error" || s.status === "cancelled") return false;
      return s.status === "completed";
    },
  },
];

const TOTAL_PHASES = PHASE_META.length; // 5

/**
 * Determines the current flow phase from the execution state.
 * Phase only advances forward — never jumps back.
 */
function computePhase(state: ObservatoryState): FlowPhase {
  if (state.status === "idle") return 0;
  if (state.status === "error" || state.status === "cancelled") return 0;

  // Prioritize explicit stage from backend
  if (state.currentStage && state.currentStage >= 1 && state.currentStage <= 6) {
    return state.currentStage as FlowPhase;
  }

  // Walk phases in reverse — the last one whose gate passes is the current phase
  for (let i = PHASE_META.length - 1; i >= 0; i--) {
    if (PHASE_META[i].gate(state)) return (i + 1) as FlowPhase;
  }
  return 0;
}

/**
 * useFlowPhase — drives the sequential flow of the observatory.
 *
 * Returns the current phase (0-5), whether the run is active, and helpers.
 * The phase monotonically advances — it never goes backward, so the page
 * only ever scrolls forward through the story.
 */
export function useFlowPhase(state: ObservatoryState) {
  const [phase, setPhase] = useState<FlowPhase>(0);
  const phaseRef = useRef<FlowPhase>(0);
  const prevStatusRef = state.status;

  // Reset phase when a new run starts
  useEffect(() => {
    if (state.status === "preparing" && prevStatusRef !== "preparing") {
      phaseRef.current = 0;
      setPhase(0);
    }
  }, [state.status, prevStatusRef]);

  // Advance phase monotonically — only forward, never backward
  useEffect(() => {
    const next = computePhase(state);
    if (next > phaseRef.current) {
      phaseRef.current = next;
      setPhase(next);
    }
  }, [state]);

  const isActive = state.status === "running" || state.status === "streaming" || state.status === "preparing";
  const isComplete = state.status === "completed";
  const progress = isActive
    ? Math.min(100, Math.round((phase / TOTAL_PHASES) * 100))
    : isComplete
      ? 100
      : 0;

  return { phase, isActive, isComplete, progress };
}
