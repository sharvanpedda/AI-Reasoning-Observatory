"""
Multi-provider registry with ordered failover.

Every streaming client (`anthropic_client`, `openai_client`,
`gemini_client`, `sarvam_client`) exposes the same async-generator
signature and yields the same `StreamChunk` type (defined here, owned
by this module), so the execute route can walk `provider_chain()` in
order and fall through to the next provider on any pre-stream failure —
the observatory keeps answering even when one upstream provider is
down or out of credits (NFR-04: a demo never dies).

Keys are read server-side only; nothing here ever reaches the browser
(NFR-05 / Section 15).
"""
from __future__ import annotations

import time
from collections.abc import AsyncIterator, Callable
from dataclasses import dataclass
from typing import Literal

# --- Circuit breaker: a provider that fails pre-stream repeatedly gets
# skipped for a cooldown window, so a dead provider (e.g. out of credits)
# can't add latency to every run ("no breakdowns, no lagging"). ---
FAILURE_THRESHOLD = 2
COOLDOWN_SECONDS = 300.0

_failure_times: dict[str, list[float]] = {}


def record_provider_failure(name: str) -> None:
    _failure_times.setdefault(name, []).append(time.time())


def record_provider_success(name: str) -> None:
    _failure_times.pop(name, None)


@dataclass
class StreamChunk:
    """Provider-agnostic stream event emitted by every client."""

    kind: Literal["text_delta", "usage", "message_stop", "error"]
    text: str | None = None
    input_tokens: int | None = None
    output_tokens: int | None = None
    error_message: str | None = None


StreamFn = Callable[[str, str | None], AsyncIterator[StreamChunk]]


class ProviderStreamError(RuntimeError):
    """Raised by any provider client when the stream cannot start or fails."""


def provider_stream_fn(name: str) -> StreamFn | None:
    """Return the streaming function for a provider name, or None if unknown."""
    name = name.lower()
    if name == "anthropic":
        from app.llm.anthropic_client import stream_completion

        return stream_completion
    if name == "openai":
        from app.llm.openai_client import stream_completion

        return stream_completion
    if name == "gemini":
        from app.llm.gemini_client import stream_completion

        return stream_completion
    if name == "sarvam":
        from app.llm.sarvam_client import stream_completion

        return stream_completion
    return None


def provider_chain() -> list[tuple[str, StreamFn]]:
    """Ordered (name, stream_fn) pairs for providers with a configured key,
    respecting `settings.provider_priority`, excluding any whose circuit
    breaker is open (>= FAILURE_THRESHOLD failures within COOLDOWN_SECONDS
    — stale failures are evicted first)."""
    from app.config import settings

    now = time.time()
    chain: list[tuple[str, StreamFn]] = []
    for name in settings.provider_priority:
        key = getattr(settings, f"{name}_api_key", "")
        if not key:
            continue
        fn = provider_stream_fn(name)
        if fn is None:
            continue
        recent = [t for t in _failure_times.get(name, []) if now - t < COOLDOWN_SECONDS]
        _failure_times[name] = recent
        if len(recent) >= FAILURE_THRESHOLD:
            continue  # circuit open — skip this provider until cooldown
        chain.append((name, fn))
    return chain