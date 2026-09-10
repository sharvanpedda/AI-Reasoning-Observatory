export type MetricLabel = "live" | "estimated" | "unavailable" | "published" | "proxy";

export interface Metric<T = number | string | null> {
  value: T;
  label: MetricLabel;
  note?: string;
}

export type EventType =
  | "prompt_received"
  | "tokenized"
  | "context_prepared"
  | "rag_context"
  | "inference_started"
  | "output_token"
  | "state_update"
  | "cache_update"
  | "inference_completed"
  | "evaluation_completed"
  | "stage_ack"
  | "error"
  | "cancelled"
  | "done";

export type Channel = "conventional" | "bdh_cq" | "system";

export interface ObservatoryEvent {
  run_id: string;
  seq: number;
  event_type: EventType;
  ts: number;
  channel: Channel;
  payload: Record<string, any>;
}

export type ExecutionStatus =
  | "idle"
  | "preparing"
  | "running"
  | "streaming"
  | "completed"
  | "error"
  | "cancelled";

export type BdhPass = "forward" | "backward" | "combined";

export interface RagSource {
  id: string;
  title: string;
}

export interface RagInfo {
  mode: "ai_memory" | "general";
  sources: RagSource[];
  injected_tokens: Metric | null;
}

export interface EvalScore {
  method: "known_answer" | "reference_overlap" | "structural";
  score: number;
  label: string;
  note: string;
}

export interface EvaluationInfo {
  conventional: EvalScore;
  bdh: EvalScore;
  caveat: string;
}

export interface LatentStep {
  step: number;
  token_text: string;
  state_preview: number[];
  state_norm: number;
  decoded: boolean;
  pass: BdhPass;
}
