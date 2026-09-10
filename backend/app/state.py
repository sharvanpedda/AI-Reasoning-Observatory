"""
In-memory run store.

SRS Section 14 explicitly scopes storage to "in memory for the
hackathon unless persistence is necessary" and Section 15 says not to
silently retain judge prompts beyond what the active demo needs. So:
- Runs live in a bounded FIFO dict (oldest evicted once MAX_RUN_HISTORY
  is exceeded).
- Nothing is written to disk.
- The stored event log is what powers /api/replay/{run_id} without
  making another provider call.
"""
from __future__ import annotations

import asyncio
import uuid
from collections import OrderedDict
from dataclasses import field

from app.config import settings
from app.event_model import ObservatoryEvent


class Run:
    __slots__ = ("run_id", "prompt", "events", "cancel_event", "stage_acks", "status")

    def __init__(self, run_id: str, prompt: str) -> None:
        self.run_id: str = run_id
        self.prompt: str = prompt
        self.events: list[ObservatoryEvent] = []
        self.cancel_event: asyncio.Event = asyncio.Event()
        self.stage_acks: dict[int, asyncio.Event] = {
            i: asyncio.Event() for i in range(1, 7)
        }
        self.status: str = "idle"  # idle|preparing|running|streaming|completed|error|cancelled


class RunStore:
    def __init__(self) -> None:
        self._runs: dict[str, Run] = OrderedDict()
        self._run_ids: list[str] = []

    def create(self, prompt: str) -> Run:
        run_id = uuid.uuid4().hex[:12]
        run = Run(run_id=run_id, prompt=prompt)
        self._runs[run_id] = run
        self._run_ids.append(run_id)
        while len(self._runs) > settings.max_run_history:
            oldest = self._run_ids.pop(0)
            self._runs.pop(oldest, None)
        return run

    @property
    def latest_run_id(self) -> str | None:
        return self._run_ids[-1] if self._run_ids else None

    def reset_stage_acks(self, run_id: str) -> None:
        """Clear all stage acks for a new run."""
        run = self._runs.get(run_id)
        if run is not None:
            run.stage_acks = {i: asyncio.Event() for i in range(1, 7)}

    def get(self, run_id: str) -> Run | None:
        return self._runs.get(run_id)

    def append_event(self, run_id: str, event: ObservatoryEvent) -> None:
        run = self._runs.get(run_id)
        if run is not None:
            run.events.append(event)


run_store = RunStore()
