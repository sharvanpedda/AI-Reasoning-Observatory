"""
Thin streaming client for the Google Gemini API (generativelanguage).

Uses the `:streamGenerateContent?alt=sse` endpoint over plain httpx.
The API key is sent in the query string, which is how Gemini's REST API
expects it; it never leaves this server process (NFR-05 / Section 15).
"""
from __future__ import annotations

import json
from collections.abc import AsyncIterator

import httpx

from app.config import settings
from app.llm.providers import ProviderStreamError, StreamChunk


async def stream_completion(prompt: str, model: str | None = None) -> AsyncIterator[StreamChunk]:
    """Stream a completion for `prompt`, yielding StreamChunk objects.

    Token counts come from the final chunk's `usageMetadata`, the
    provider's own reported numbers ("live" label).
    """
    if not settings.gemini_api_key:
        raise ProviderStreamError("GEMINI_API_KEY is not configured on the server.")

    model = model or settings.gemini_model
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/{model}"
        f":streamGenerateContent?alt=sse&key={settings.gemini_api_key}"
    )
    body = {"contents": [{"role": "user", "parts": [{"text": prompt}]}]}

    input_tokens: int | None = None
    output_tokens: int | None = None

    try:
        async with httpx.AsyncClient(
            timeout=httpx.Timeout(connect=10.0, read=30.0, write=10.0, pool=10.0)
        ) as client:
            async with client.stream("POST", url, json=body) as resp:
                if resp.status_code != 200:
                    raw = await resp.aread()
                    raise ProviderStreamError(
                        f"Gemini returned HTTP {resp.status_code}: {raw.decode(errors='replace')[:500]}"
                    )

                async for line in resp.aiter_lines():
                    if not line.startswith("data:"):
                        continue
                    payload = line.split(":", 1)[1].strip()
                    if not payload:
                        continue
                    try:
                        data = json.loads(payload)
                    except json.JSONDecodeError:
                        continue

                    usage = data.get("usageMetadata") or {}
                    if usage.get("promptTokenCount") is not None:
                        input_tokens = usage.get("promptTokenCount") or input_tokens
                        output_tokens = usage.get("candidatesTokenCount") or output_tokens
                        yield StreamChunk(
                            kind="usage",
                            input_tokens=input_tokens,
                            output_tokens=output_tokens,
                        )

                    candidates = data.get("candidates") or []
                    if not candidates:
                        continue
                    parts = (candidates[0].get("content") or {}).get("parts") or []
                    for part in parts:
                        text = part.get("text")
                        if text:
                            yield StreamChunk(kind="text_delta", text=text)

        if input_tokens is None and output_tokens is None:
            # usageMetadata can be emitted in a final chunk without text;
            # if we truly got nothing, still finish cleanly.
            pass
        yield StreamChunk(kind="message_stop")

    except httpx.HTTPError as exc:
        raise ProviderStreamError(f"Network error contacting Gemini: {exc}") from exc