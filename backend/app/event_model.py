"""
The normalized event model described in SRS Section 9.

Every observable thing that happens during a run — on the conventional
LLM side or the BDH-CQ/latent side — is emitted as one of these events.
The frontend never has to know which provider or runtime produced an
event; it only understands this shape. This is also what makes replay
possible: replaying a run is just re-emitting its stored event list.
"""
from __future__ import annotations

import time
from enum import Enum
from typing import Any, Literal

from pydantic import BaseModel, Field


class EventType(str, Enum):
    PROMPT_RECEIVED = "prompt_received"
    TOKENIZED = "tokenized"
    CONTEXT_PREPARED = "context_prepared"
    RAG_CONTEXT = "rag_context"
    INFERENCE_STARTED = "inference_started"
    OUTPUT_TOKEN = "output_token"
    STATE_UPDATE = "state_update"
    CACHE_UPDATE = "cache_update"
    INFERENCE_COMPLETED = "inference_completed"
    EVALUATION_COMPLETED = "evaluation_completed"
    STAGE_ACK = "stage_ack"
    ERROR = "error"
    CANCELLED = "cancelled"
    DONE = "done"


# Every metric shown in the UI must be tagged with its provenance
# (SRS Section 12 / NFR-06). This is enforced at the type level so a
# developer can't add a new metric field without deciding its label.
MetricLabel = Literal["live", "estimated", "unavailable", "published", "proxy"]


class Metric(BaseModel):
    value: Any
    label: MetricLabel
    note: str | None = None


class ObservatoryEvent(BaseModel):
    run_id: str
    seq: int
    event_type: EventType
    ts: float = Field(default_factory=time.time)
    # "conventional" | "bdh_cq" | "system" — which panel this event drives
    channel: Literal["conventional", "bdh_cq", "system"] = "system"
    payload: dict[str, Any] = Field(default_factory=dict)

    def to_sse(self) -> str:
        return f"event: {self.event_type.value}\ndata: {self.model_dump_json()}\n\n"
