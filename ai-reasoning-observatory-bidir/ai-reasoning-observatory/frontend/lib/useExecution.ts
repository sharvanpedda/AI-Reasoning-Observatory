"use client";

import { useCallback, useReducer, useRef } from "react";
import { API_BASE_URL } from "./api";
import type {
  BdhPass,
  Channel,
  EvaluationInfo,
  ExecutionStatus,
  LatentStep,
  Metric,
  ObservatoryEvent,
  RagInfo,
} from "./types";

interface ErrorEntry {
  message: string;
  recoverable: boolean;
  note?: string;
  channel: Channel;
}

interface ConventionalState {
  outputText: string;
  demoMode: boolean;
  /** Which provider actually produced the answer (e.g. "openai", "gemini"). */
  provider: string | null;
  /** Agentic RAG: what the provider was actually grounded on (Phase 2). */
  rag: RagInfo | null;
  cache: {
    input_tokens: Metric;
    output_tokens: Metric;
    kv_cache: Metric;
  } | null;
  latencyMs: Metric | null;
  completed: boolean;
}

interface BdhState {
  /** All steps in arrival order (kept for the timeline / total count). */
  steps: LatentStep[];
  /** Same steps, bucketed by which pass produced them, for the panel's
   * forward/backward/combined tabs. */
  forwardSteps: LatentStep[];
  backwardSteps: LatentStep[];
  combinedSteps: LatentStep[];
  bidirectionalNote: string | null;
  forwardComplete: boolean;
  note: string | null;
  completed: boolean;
  /** Text output from BDH — the memory trace summary. */
  outputText: string;
  /** Phase 3 — the BDH side's own answer (latent-state report). */
  answerText: string;
}

export interface ObservatoryState {
  status: ExecutionStatus;
  runId: string | null;
  prompt: string;
  promptTokens: { tokens: string[]; count: Metric } | null;
  contextEstimate: Metric | null;
  conventional: ConventionalState;
  bdh: BdhState;
  /** Phase 4 — honest, method-labeled correctness evaluation. */
  evaluation: EvaluationInfo | null;
  /** Active tour/flow stage (1..6) emitted sequentially by backend. */
  currentStage: number | null;
  errors: ErrorEntry[];
  events: ObservatoryEvent[];
}

const initialState: ObservatoryState = {
  status: "idle",
  runId: null,
  prompt: "",
  promptTokens: null,
  contextEstimate: null,
  currentStage: null,
  conventional: { outputText: "", demoMode: false, provider: null, rag: null, cache: null, latencyMs: null, completed: false },
  bdh: {
    steps: [],
    forwardSteps: [],
    backwardSteps: [],
    combinedSteps: [],
    bidirectionalNote: null,
    forwardComplete: false,
    note: null,
    completed: false,
    outputText: "",
    answerText: "",
  },
  errors: [],
  events: [],
  evaluation: null,
};

type Action =
  | { type: "reset_for_run"; prompt: string }
  | { type: "reset_all" }
  | { type: "set_run_id"; runId: string }
  | { type: "status"; status: ExecutionStatus }
  | { type: "event"; event: ObservatoryEvent };

function reducer(state: ObservatoryState, action: Action): ObservatoryState {
  switch (action.type) {
    case "reset_all":
      return initialState;
    case "reset_for_run":
      return { ...initialState, prompt: action.prompt, status: "preparing" };
    case "set_run_id":
      return { ...state, runId: action.runId };
    case "status":
      return { ...state, status: action.status };
    case "event": {
      const ev = action.event;
      const events = [...state.events, ev];
      switch (ev.event_type) {
        case "prompt_received":
          return { ...state, events, status: "preparing" };
        case "tokenized":
          return {
            ...state,
            events,
            promptTokens: { tokens: ev.payload.tokens, count: ev.payload.count },
          };
        case "context_prepared":
          return { ...state, events, contextEstimate: ev.payload.context_tokens_estimate };
        case "rag_context":
          // Only the conventional side's RAG context populates the
          // conventional chip. The BDH side emits its own rag_context
          // (mode: "latent_memory") which appears in the timeline but must
          // not overwrite the conventional grounding disclosure.
          if (ev.channel !== "conventional") {
            return { ...state, events };
          }
          return {
            ...state,
            events,
            conventional: {
              ...state.conventional,
              rag: {
                mode: ev.payload.mode ?? "general",
                sources: ev.payload.sources ?? [],
                injected_tokens: ev.payload.injected_tokens ?? null,
              },
            },
          };
        case "inference_started":
          if (ev.channel === "bdh_cq" && ev.payload.bidirectional_note) {
            return {
              ...state,
              events,
              status: "running",
              bdh: { ...state.bdh, bidirectionalNote: ev.payload.bidirectional_note },
            };
          }
          return { ...state, events, status: "running" };
        case "output_token":
          if (ev.channel === "bdh_cq" || ev.payload.panel === "bdh_cq") {
            // BDH side: memory-trace summary (default) and its own
            // latent-state answer (section === "answer") — Phase 3.
            const isAnswer = ev.payload.section === "answer";
            return {
              ...state,
              events,
              status: "streaming",
              bdh: isAnswer
                ? { ...state.bdh, answerText: state.bdh.answerText + ev.payload.text }
                : { ...state.bdh, outputText: state.bdh.outputText + ev.payload.text },
            };
          }
          return {
            ...state,
            events,
            status: "streaming",
            conventional: {
              ...state.conventional,
              outputText: state.conventional.outputText + ev.payload.text,
              demoMode: ev.payload.demo_mode ?? state.conventional.demoMode,
            },
          };
        case "cache_update":
          if (ev.channel === "bdh_cq" && ev.payload.bdh_phase_boundary === "forward_complete") {
            return { ...state, events, bdh: { ...state.bdh, forwardComplete: true } };
          }
          return {
            ...state,
            events,
            conventional: {
              ...state.conventional,
              cache: {
                input_tokens: ev.payload.input_tokens,
                output_tokens: ev.payload.output_tokens,
                kv_cache: ev.payload.kv_cache,
              },
            },
          };
        case "state_update": {
          const pass: BdhPass = ev.payload.pass ?? "forward";
          const step: LatentStep = {
            step: ev.payload.step,
            token_text: ev.payload.token_text,
            state_preview: ev.payload.state_preview,
            state_norm: ev.payload.state_norm,
            decoded: ev.payload.decoded,
            pass,
          };
          return {
            ...state,
            events,
            bdh: {
              ...state.bdh,
              steps: [...state.bdh.steps, step],
              forwardSteps: pass === "forward" ? [...state.bdh.forwardSteps, step] : state.bdh.forwardSteps,
              backwardSteps: pass === "backward" ? [...state.bdh.backwardSteps, step] : state.bdh.backwardSteps,
              combinedSteps: pass === "combined" ? [...state.bdh.combinedSteps, step] : state.bdh.combinedSteps,
            },
          };
        }
        case "inference_completed":
          if (ev.channel === "conventional") {
            return {
              ...state,
              events,
              conventional: {
                ...state.conventional,
                latencyMs: ev.payload.latency_ms,
                demoMode: ev.payload.demo_mode ?? state.conventional.demoMode,
                provider: ev.payload.provider ?? state.conventional.provider,
                completed: true,
              },
            };
          }
          if (ev.channel === "bdh_cq") {
            return {
              ...state,
              events,
              bdh: {
                ...state.bdh,
                note: ev.payload.note,
                bidirectionalNote: ev.payload.bidirectional_note ?? state.bdh.bidirectionalNote,
                completed: true,
              },
            };
          }
          return { ...state, events };
        case "evaluation_completed":
          return {
            ...state,
            events,
            evaluation: {
              conventional: ev.payload.conventional,
              bdh: ev.payload.bdh,
              caveat: ev.payload.caveat,
            },
          };
        case "stage_ack": {
          const stageNum = ev.payload.stage_num ?? ev.payload.stage;
          return {
            ...state,
            events,
            currentStage: typeof stageNum === "number" ? stageNum : state.currentStage,
          };
        }
        case "error":
          return {
            ...state,
            events,
            errors: [
              ...state.errors,
              {
                message: ev.payload.message,
                recoverable: !!ev.payload.recoverable,
                note: ev.payload.note,
                channel: ev.channel,
              },
            ],
          };
        case "cancelled":
          return { ...state, events, status: "cancelled" };
        case "done":
          return {
            ...state,
            events,
            status: state.status === "cancelled" ? "cancelled" : (ev.payload.status as ExecutionStatus),
          };
        default:
          return { ...state, events };
      }
    }
    default:
      return state;
  }
}

/** Parse one SSE "frame" (the text between blank lines) into an ObservatoryEvent. */
function parseSseFrame(frame: string): ObservatoryEvent | null {
  const dataLine = frame
    .split("\n")
    .find((line) => line.startsWith("data:"));
  if (!dataLine) return null;
  try {
    return JSON.parse(dataLine.slice(5).trim());
  } catch {
    return null;
  }
}

export function useExecution() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const abortRef = useRef<AbortController | null>(null);
  const runIdRef = useRef<string | null>(null);

  const consumeStream = useCallback(async (response: Response) => {
    const runId = response.headers.get("X-Run-Id");
    if (runId) {
      runIdRef.current = runId;
      dispatch({ type: "set_run_id", runId });
    }
    const reader = response.body?.getReader();
    if (!reader) return;
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let boundary = buffer.indexOf("\n\n");
      while (boundary !== -1) {
        const frame = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        const event = parseSseFrame(frame);
        if (event) dispatch({ type: "event", event });
        boundary = buffer.indexOf("\n\n");
      }
    }
  }, []);

  const run = useCallback(
    async (prompt: string) => {
      const trimmed = prompt.trim();
      if (!trimmed) return;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      dispatch({ type: "reset_for_run", prompt: trimmed });
      try {
        const response = await fetch(`${API_BASE_URL}/api/execute`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: trimmed }),
          signal: controller.signal,
        });
        if (!response.ok) {
          const detail = await response.json().catch(() => ({}));
          dispatch({
            type: "event",
            event: {
              run_id: "n/a",
              seq: 0,
              event_type: "error",
              ts: Date.now() / 1000,
              channel: "system",
              payload: { message: detail.detail || `Request failed (${response.status})`, recoverable: false },
            },
          });
          dispatch({ type: "status", status: "error" });
          return;
        }
        await consumeStream(response);
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        dispatch({
          type: "event",
          event: {
            run_id: "n/a",
            seq: 0,
            event_type: "error",
            ts: Date.now() / 1000,
            channel: "system",
            payload: { message: String(err?.message || err), recoverable: false },
          },
        });
        dispatch({ type: "status", status: "error" });
      }
    },
    [consumeStream]
  );

  const cancel = useCallback(async () => {
    abortRef.current?.abort();
    const runId = runIdRef.current;
    if (runId) {
      try {
        await fetch(`${API_BASE_URL}/api/cancel/${runId}`, { method: "POST" });
      } catch {
        // best-effort; the client-side abort already stopped local rendering
      }
    }
    dispatch({ type: "status", status: "cancelled" });
  }, []);

  /** Acknowledge to the backend that a tour stage is fully rendered, so the
   * stream can resume to the next stage. Must be called exactly once per
   * stage, in order (1..6), after the corresponding section is fully painted.
   * Safe to call if no run is active. */
  const acknowledgeStage = useCallback(
    async (stageNum: number) => {
      const runId = runIdRef.current;
      if (!runId) return;
      try {
        await fetch(`${API_BASE_URL}/api/execute/${runId}/acknowledge-stage/${stageNum}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stage_num: stageNum }),
        });
      } catch {
        // Best-effort; if the backend already moved on, nothing to fix.
      }
    },
    [],
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    runIdRef.current = null;
    dispatch({ type: "reset_all" });
  }, []);

  const replay = useCallback(async () => {
    const runId = runIdRef.current;
    if (!runId) return;
    const prompt = state.prompt;
    dispatch({ type: "reset_for_run", prompt });
    dispatch({ type: "set_run_id", runId });
    try {
      const response = await fetch(`${API_BASE_URL}/api/replay/${runId}`);
      if (!response.ok) return;
      await consumeStream(response);
    } catch {
      // replay is best-effort; leave state as whatever was reconstructed
    }
  }, [consumeStream, state.prompt]);

  return { state, run, cancel, reset, replay, acknowledgeStage };
}
