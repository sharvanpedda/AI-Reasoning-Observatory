from __future__ import annotations

import asyncio
import itertools
import time

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.bdh.answer import generate_bdh_answer
from app.bdh.simulator import BIDIRECTIONAL_NOTE, run_bidirectional_latent_trace
from app.bdh.summary import generate_bdh_summary
from app.eval.evaluate import evaluate
from app.config import settings
from app.event_model import EventType, ObservatoryEvent
from app.fallback.demo_responses import demo_response_chunks
from app.llm.agentic import build_agentic_prompt
from app.llm.providers import (
    ProviderStreamError,
    provider_chain,
    record_provider_failure,
    record_provider_success,
)
from app.llm.tokenizer import estimate_tokens
from app.state import run_store

router = APIRouter(prefix="/api", tags=["execute"])


class ExecuteRequest(BaseModel):
    prompt: str = Field(..., min_length=1)
    model: str | None = None


def _seq_counter():
    return itertools.count(1)


async def _event_stream(run_id: str, prompt: str, model: str | None):
    run = run_store.get(run_id)
    assert run is not None
    seq = _seq_counter()
    queue: asyncio.Queue[ObservatoryEvent] = asyncio.Queue()

    # Phase 4 — evaluation runs once both sides complete. The two side-coro
    # tasks write their outputs here; runner() evaluates after gather().
    results: dict[str, object] = {"prompt": prompt, "rag_sources": []}

    def emit(event_type: EventType, payload: dict, channel: str = "system") -> None:
        ev = ObservatoryEvent(
            run_id=run_id,
            seq=next(seq),
            event_type=event_type,
            channel=channel,
            payload=payload,
        )
        run_store.append_event(run_id, ev)
        queue.put_nowait(ev)

    async def cancellable_sleep(duration: float, step: float = 0.1) -> None:
        elapsed = 0.0
        while elapsed < duration:
            if run.cancel_event.is_set():
                return
            await asyncio.sleep(min(step, duration - elapsed))
            elapsed += step

    async def run_conventional_inference(tokens: list[str]) -> None:
        agentic = build_agentic_prompt(prompt)
        emit(
            EventType.RAG_CONTEXT,
            {
                "mode": agentic.mode,
                "sources": [
                    {"id": p.id, "title": p.title} for p in agentic.sources
                ],
                "injected_tokens": {
                    "value": agentic.injected_tokens,
                    "label": "estimated",
                    "note": (
                        "Tokens of format instructions + retrieved context added "
                        "to the user's question before the provider call."
                    ),
                },
            },
            channel="conventional",
        )
        chain = provider_chain()
        emit(
            EventType.INFERENCE_STARTED,
            {
                "panel": "conventional",
                "live_providers": [name for name, _ in chain],
            },
            channel="conventional",
        )
        start = time.time()
        demo_mode = not chain
        provider_used: str | None = None
        output_text_parts: list[str] = []
        input_tokens_live: int | None = None
        output_tokens_live: int | None = None
        stream_started = False

        for provider_name, stream_fn in chain:
            if run.cancel_event.is_set():
                return
            try:
                async for chunk in stream_fn(agentic.prompt, model=model):
                    if run.cancel_event.is_set():
                        return
                    if not stream_started:
                        stream_started = True
                        provider_used = provider_name
                        record_provider_success(provider_name)
                    if chunk.kind == "usage":
                        if chunk.input_tokens is not None:
                            input_tokens_live = chunk.input_tokens
                        if chunk.output_tokens is not None:
                            output_tokens_live = chunk.output_tokens
                        emit(
                            EventType.CACHE_UPDATE,
                            {
                                "input_tokens": {"value": input_tokens_live, "label": "live"}
                                if input_tokens_live is not None
                                else {"value": None, "label": "unavailable"},
                                "output_tokens": {"value": output_tokens_live, "label": "live"}
                                if output_tokens_live is not None
                                else {"value": None, "label": "unavailable"},
                                "kv_cache": {
                                    "value": None,
                                    "label": "unavailable",
                                    "note": "Not exposed by provider",
                                },
                            },
                            channel="conventional",
                        )
                    elif chunk.kind == "text_delta" and chunk.text:
                        output_text_parts.append(chunk.text)
                        emit(
                            EventType.OUTPUT_TOKEN,
                            {"text": chunk.text, "demo_mode": False},
                            channel="conventional",
                        )
                    elif chunk.kind == "message_stop":
                        break
                break
            except ProviderStreamError as exc:
                if stream_started:
                    record_provider_success(provider_name)
                else:
                    record_provider_failure(provider_name)
                emit(
                    EventType.ERROR,
                    {
                        "message": str(exc),
                        "recoverable": not stream_started,
                        "note": (
                            f"Provider '{provider_name}' failed "
                            + (f"after streaming. Keeping partial answer." if stream_started else "before streaming. Falling back to the next provider.")
                        ),
                    },
                    channel="conventional",
                )
                if stream_started:
                    break
                provider_used = None
                stream_started = False

        if not stream_started:
            demo_mode = True
            provider_used = None

        if demo_mode:
            for chunk in demo_response_chunks(prompt):
                if run.cancel_event.is_set():
                    return
                output_text_parts.append(chunk)
                emit(
                    EventType.OUTPUT_TOKEN,
                    {"text": chunk, "demo_mode": True},
                    channel="conventional",
                )
                await asyncio.sleep(0.04)
            emit(
                EventType.CACHE_UPDATE,
                {
                    "input_tokens": {"value": len(tokens), "label": "estimated"},
                    "output_tokens": {
                        "value": len("".join(output_text_parts).split()),
                        "label": "estimated",
                    },
                    "kv_cache": {
                        "value": None,
                        "label": "unavailable",
                        "note": "Demo Mode — no live provider available",
                    },
                },
                channel="conventional",
            )

        latency_ms = round((time.time() - start) * 1000)

        results["conventional"] = "".join(output_text_parts)
        results["conventional_demo"] = demo_mode
        results["rag_sources"] = [p.id for p in agentic.sources]

        emit(
            EventType.INFERENCE_COMPLETED,
            {
                "panel": "conventional",
                "latency_ms": {"value": latency_ms, "label": "live"},
                "demo_mode": demo_mode,
                "provider": provider_used,
                "full_text": "".join(output_text_parts),
            },
            channel="conventional",
        )

    async def run_bdh_answer_inference(
        prompt: str,
        fwd_steps: list,
        bwd_steps: list,
        comb_steps: list,
    ) -> None:
        chain = provider_chain()
        emit(
            EventType.RAG_CONTEXT,
            {
                "mode": "latent_memory",
                "sources": [],
                "injected_tokens": {
                    "value": 0,
                    "label": "estimated",
                    "note": (
                        "BDH-CQ answer uses the same live LLM, but its memory is the "
                        "fixed 48-byte latent state — it is not given the full prompt "
                        "or any retrieved documents, only what the state captured. "
                        "Contract: same meaning as the conventional answer, freshly "
                        "phrased."
                    ),
                },
            },
            channel="bdh_cq",
        )
        emit(
            EventType.INFERENCE_STARTED,
            {
                "panel": "bdh_cq",
                "mode": "latent_memory_answer",
                "live_providers": [name for name, _ in chain],
            },
            channel="bdh_cq",
        )
        bdh_answer_text: list[str] = []
        stream_started = False
        answer_provider: str | None = None

        for provider_name, stream_fn in chain:
            if run.cancel_event.is_set():
                return
            try:
                async for line in generate_bdh_answer(
                    prompt,
                    fwd_steps,
                    bwd_steps,
                    comb_steps,
                    stream_fn=stream_fn,
                    model=model,
                ):
                    if run.cancel_event.is_set():
                        return
                    if not stream_started:
                        stream_started = True
                        answer_provider = provider_name
                        record_provider_success(provider_name)
                    bdh_answer_text.append(line)
                    emit(
                        EventType.OUTPUT_TOKEN,
                        {
                            "text": line,
                            "demo_mode": False,
                            "panel": "bdh_cq",
                            "section": "answer",
                        },
                        channel="bdh_cq",
                    )
                break
            except ProviderStreamError as exc:
                if stream_started:
                    record_provider_success(provider_name)
                else:
                    record_provider_failure(provider_name)
                emit(
                    EventType.ERROR,
                    {
                        "message": str(exc),
                        "recoverable": not stream_started,
                        "note": (
                            f"BDH answer provider '{provider_name}' failed "
                            + ("after streaming. Keeping partial answer." if stream_started
                               else "before streaming. Falling back to a deterministic answer.")
                        ),
                    },
                    channel="bdh_cq",
                )
                if stream_started:
                    break
                stream_started = False

        if not stream_started:
            async for line in generate_bdh_answer(
                prompt, fwd_steps, bwd_steps, comb_steps, stream_fn=None, model=model
            ):
                if run.cancel_event.is_set():
                    return
                bdh_answer_text.append(line)
                emit(
                    EventType.OUTPUT_TOKEN,
                    {
                        "text": line,
                        "demo_mode": False,
                        "panel": "bdh_cq",
                        "section": "answer",
                    },
                    channel="bdh_cq",
                )
                await asyncio.sleep(0.015)

        results["bdh"] = "".join(bdh_answer_text)

        emit(
            EventType.INFERENCE_COMPLETED,
            {
                "panel": "bdh_cq",
                "state_dim": {"value": 12, "label": "published", "note": "Fixed demo state size"},
                "provider": answer_provider,
                "bidirectional_note": BIDIRECTIONAL_NOTE,
                "note": (
                    "This is a research-backed algorithmic demonstration of a "
                    "recurrent, fixed-size latent state (forward pass), plus a "
                    "classical bidirectional extension (backward + combined "
                    "passes) — not the official Pathway BDH-CQ implementation, "
                    "and the bidirectional part is not part of BDH-CQ at all."
                ),
            },
            channel="bdh_cq",
        )

    STAGE_PAUSE_SECONDS = 3.0

    async def runner():
        try:
            tokens = estimate_tokens(prompt)
            all_steps = list(run_bidirectional_latent_trace(tokens))
            fwd_steps = [s for s in all_steps if s.pass_name == "forward"]
            bwd_steps = [s for s in all_steps if s.pass_name == "backward"]
            comb_steps = [s for s in all_steps if s.pass_name == "combined"]

            # ══════════════════════════════════════════════════════════
            # STAGE 1 — Memory in use (right now)
            # Scrolls to Memory in use. Executes Phase 1 completely.
            # Then stops for 5.0s so judges can see and compare memory.
            # ══════════════════════════════════════════════════════════
            run.status = "running"
            emit(
                EventType.STAGE_ACK,
                {"stage_num": 1, "title": "Memory in use"},
                channel="system",
            )
            emit(EventType.PROMPT_RECEIVED, {"prompt": prompt})
            emit(
                EventType.TOKENIZED,
                {
                    "tokens": tokens,
                    "count": {"value": len(tokens), "label": "estimated",
                              "note": "cl100k_base proxy tokenizer; provider's real "
                                      "tokenizer count follows once inference starts."},
                },
            )
            emit(
                EventType.CONTEXT_PREPARED,
                {
                    "context_tokens_estimate": {"value": len(tokens), "label": "estimated"},
                },
            )
            emit(
                EventType.CACHE_UPDATE,
                {
                    "input_tokens": {"value": len(tokens), "label": "estimated"},
                    "output_tokens": {"value": 0, "label": "live"},
                    "kv_cache": {
                        "value": len(tokens) * 65536,
                        "label": "estimated",
                        "note": "Estimated KV-cache for prompt tokens (~65 KB/token)",
                    },
                },
                channel="conventional",
            )
            if fwd_steps:
                first_step = fwd_steps[0]
                emit(
                    EventType.STATE_UPDATE,
                    {
                        "step": first_step.step,
                        "token_text": first_step.token_text,
                        "state_preview": [round(v, 4) for v in first_step.state],
                        "state_norm": round(first_step.state_norm, 4),
                        "decoded": first_step.decoded,
                        "pass": first_step.pass_name,
                        "source": "algorithmic_demonstration",
                    },
                    channel="bdh_cq",
                )

            # STOP/PAUSE for judges at Stage 1
            await cancellable_sleep(STAGE_PAUSE_SECONDS)
            if run.cancel_event.is_set():
                return

            # ══════════════════════════════════════════════════════════
            # STAGE 2 — Memory scaling
            # Scrolls to Memory scaling. Streams the scaling steps.
            # Then stops for 5.0s so judges can inspect the scaling chart.
            # ══════════════════════════════════════════════════════════
            emit(
                EventType.STAGE_ACK,
                {"stage_num": 2, "title": "Memory scaling"},
                channel="system",
            )
            for step in all_steps:
                if run.cancel_event.is_set():
                    return
                if fwd_steps and step == fwd_steps[0]:
                    continue
                emit(
                    EventType.STATE_UPDATE,
                    {
                        "step": step.step,
                        "token_text": step.token_text,
                        "state_preview": [round(v, 4) for v in step.state],
                        "state_norm": round(step.state_norm, 4),
                        "decoded": step.decoded,
                        "pass": step.pass_name,
                        "source": "algorithmic_demonstration",
                    },
                    channel="bdh_cq",
                )
                await asyncio.sleep(0.04)

            emit(
                EventType.CACHE_UPDATE,
                {
                    "bdh_phase_boundary": "forward_complete",
                    "note": (
                        "Forward pass complete. Backward and combined "
                        "passes require the full prompt and are not "
                        "causal/streamable the way the forward pass is."
                    ),
                },
                channel="bdh_cq",
            )

            for line in generate_bdh_summary(prompt, fwd_steps, bwd_steps, comb_steps):
                if run.cancel_event.is_set():
                    return
                emit(
                    EventType.OUTPUT_TOKEN,
                    {"text": line, "demo_mode": False, "panel": "bdh_cq"},
                    channel="bdh_cq",
                )
                await asyncio.sleep(0.015)

            # STOP/PAUSE for judges at Stage 2
            await cancellable_sleep(STAGE_PAUSE_SECONDS)
            if run.cancel_event.is_set():
                return

            # ══════════════════════════════════════════════════════════
            # STAGE 3 — Architecture (One prompt, two answers)
            # Scrolls to Architecture. Streams both answers live.
            # Then stops for 5.0s so judges can read both answers.
            # ══════════════════════════════════════════════════════════
            emit(
                EventType.STAGE_ACK,
                {"stage_num": 3, "title": "Architecture"},
                channel="system",
            )
            await asyncio.gather(
                run_conventional_inference(tokens),
                run_bdh_answer_inference(prompt, fwd_steps, bwd_steps, comb_steps),
            )

            # STOP/PAUSE for judges at Stage 3
            await cancellable_sleep(STAGE_PAUSE_SECONDS)
            if run.cancel_event.is_set():
                return

            # ══════════════════════════════════════════════════════════
            # STAGE 4 — Execution timeline
            # Scrolls to Execution timeline.
            # Stops for 3.0s so judges can review event diary.
            # ══════════════════════════════════════════════════════════
            emit(
                EventType.STAGE_ACK,
                {"stage_num": 4, "title": "Execution timeline"},
                channel="system",
            )

            # STOP/PAUSE for judges at Stage 4
            await cancellable_sleep(STAGE_PAUSE_SECONDS)
            if run.cancel_event.is_set():
                return

            # ══════════════════════════════════════════════════════════
            # STAGE 5 — BDH-CQ telemetry
            # Scrolls to BDH-CQ telemetry.
            # ══════════════════════════════════════════════════════════
            emit(
                EventType.STAGE_ACK,
                {"stage_num": 5, "title": "BDH-CQ telemetry"},
                channel="system",
            )
            run.status = "completed"
        except Exception as exc:  # noqa: BLE001 - surfaced to the client as an error event
            run.status = "error"
            emit(EventType.ERROR, {"message": str(exc), "recoverable": False})
        finally:
            emit(EventType.DONE, {"status": run.status})
            queue.put_nowait(None)  # sentinel

    task = asyncio.create_task(runner())

    try:
        while True:
            item = await queue.get()
            if item is None:
                break
            yield item.to_sse()
    finally:
        if not task.done():
            run.cancel_event.set()
            task.cancel()


@router.post("/execute")
async def execute(req: ExecuteRequest, request: Request):
    prompt = req.prompt.strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="Prompt must not be empty.")
    if len(prompt) > settings.max_prompt_chars:
        raise HTTPException(
            status_code=413,
            detail=f"Prompt exceeds {settings.max_prompt_chars} characters.",
        )

    run = run_store.create(prompt)
    return StreamingResponse(
        _event_stream(run.run_id, prompt, req.model),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Run-Id": run.run_id,
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/cancel/{run_id}")
async def cancel(run_id: str):
    run = run_store.get(run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="Unknown run_id.")
    run.cancel_event.set()
    run.status = "cancelled"
    return {"ok": True}


@router.post("/execute/{run_id}/acknowledge-stage/{stage_num}")  # noqa: RUF029 — framework hook signature
async def acknowledge_stage(
    run_id: str, stage_num: int, request: Request
) -> dict[str, str]:  # noqa: RUF029 — framework hook signature
    """Frontend ACK: the given stage is fully rendered, resume the stream.

    Called by the guided tour once each section (memory in use, scaling,
    architecture, correctness, timeline, telemetry) has been fully painted.
    The next stage then begins to stream.
    """
    run = run_store.get(run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="Unknown run_id.")
    ack = run.stage_acks.get(stage_num)
    if ack is None:
        # Out-of-order or duplicate ACK is harmless.
        return {"ok": "duplicate-or-out-of-order"}
    ack.set()
    emit(
        EventType.STAGE_ACK,
        {
            "stage_num": stage_num,
            "note": f"Stage {stage_num} acknowledged by frontend; resuming stream.",
        },
        channel="system",
    )
    return {"ok": "acked"}
