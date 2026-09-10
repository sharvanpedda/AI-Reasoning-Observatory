"""
Thin streaming client for the Anthropic Messages API.

We talk to the raw HTTP streaming endpoint (rather than depending on
the anthropic SDK) so the "what data comes from the provider" boundary
stays explicit and auditable in one place. The API key never leaves
this server process (NFR-05 / Section 15).
"""
from __future__ import annotations

from collections.abc import AsyncIterator
from dataclasses import dataclass
from typing import Any, Literal

import httpx

from app.config import settings
from app.llm.providers import ProviderStreamError, StreamChunk

ANTHROPIC_VERSION = "2023-06-01"


class AnthropicStreamError(ProviderStreamError):
    pass


async def stream_completion(prompt: str, model: str | None = None) -> AsyncIterator[StreamChunk]:
    """Stream a completion for `prompt`, yielding StreamChunk objects.

    Token counts in the yielded `usage` chunks are the provider's own
    reported numbers — this is the one place in the app allowed to be
    labeled "live" for token telemetry (SRS Section 12).
    """
    if not settings.anthropic_api_key:
        raise AnthropicStreamError("ANTHROPIC_API_KEY is not configured on the server.")

    url = f"{settings.anthropic_base_url}/v1/messages"
    headers = {
        "x-api-key": settings.anthropic_api_key,
        "anthropic-version": ANTHROPIC_VERSION,
        "content-type": "application/json",
    }
    body: dict[str, Any] = {
        "model": model or settings.anthropic_model,
        "max_tokens": 1024,
        "stream": True,
        "messages": [{"role": "user", "content": prompt}],
    }

    input_tokens_seen = None

    try:
        async with httpx.AsyncClient(
            timeout=httpx.Timeout(connect=10.0, read=30.0, write=10.0, pool=10.0)
        ) as client:
            async with client.stream("POST", url, headers=headers, json=body) as resp:
                if resp.status_code != 200:
                    raw = await resp.aread()
                    raise AnthropicStreamError(
                        f"Provider returned HTTP {resp.status_code}: {raw.decode(errors='replace')[:500]}"
                    )

                event_name = None
                async for line in resp.aiter_lines():
                    if line == "":
                        event_name = None
                        continue
                    if line.startswith("event:"):
                        event_name = line.split(":", 1)[1].strip()
                        continue
                    if not line.startswith("data:"):
                        continue

                    import json

                    data = json.loads(line.split(":", 1)[1].strip())

                    if event_name == "message_start":
                        usage = data.get("message", {}).get("usage", {})
                        input_tokens_seen = usage.get("input_tokens")
                        if input_tokens_seen is not None:
                            yield StreamChunk(kind="usage", input_tokens=input_tokens_seen)

                    elif event_name == "content_block_delta":
                        delta = data.get("delta", {})
                        if delta.get("type") == "text_delta":
                            yield StreamChunk(kind="text_delta", text=delta.get("text", ""))

                    elif event_name == "message_delta":
                        usage = data.get("usage", {})
                        output_tokens = usage.get("output_tokens")
                        if output_tokens is not None:
                            yield StreamChunk(
                                kind="usage",
                                input_tokens=input_tokens_seen,
                                output_tokens=output_tokens,
                            )

                    elif event_name == "message_stop":
                        yield StreamChunk(kind="message_stop")

                    elif event_name == "error":
                        message = data.get("error", {}).get("message", "Unknown provider error")
                        raise AnthropicStreamError(message)

    except httpx.HTTPError as exc:
        raise AnthropicStreamError(f"Network error contacting provider: {exc}") from exc
