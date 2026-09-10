"""
Thin streaming client for the OpenAI Chat Completions API.

Same style as `anthropic_client` — raw HTTP streaming via httpx (no SDK),
so the "what data comes from the provider" boundary stays explicit and
auditable in one place. The API key never leaves this server process
(NFR-05 / Section 15).
"""
from __future__ import annotations

import json
from collections.abc import AsyncIterator

import httpx

from app.config import settings
from app.llm.providers import ProviderStreamError, StreamChunk


async def stream_completion(prompt: str, model: str | None = None) -> AsyncIterator[StreamChunk]:
    """Stream a completion for `prompt`, yielding StreamChunk objects.

    Token counts come from OpenAI's own reported usage chunk
    (`stream_options.include_usage`), so they carry the "live" label.
    """
    if not settings.openai_api_key:
        raise ProviderStreamError("OPENAI_API_KEY is not configured on the server.")

    url = f"{settings.openai_base_url}/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {settings.openai_api_key}",
        "Content-Type": "application/json",
    }
    body = {
        "model": model or settings.openai_model,
        "max_tokens": 1024,
        "stream": True,
        "stream_options": {"include_usage": True},
        "messages": [{"role": "user", "content": prompt}],
    }

    input_tokens: int | None = None
    output_tokens: int | None = None

    try:
        async with httpx.AsyncClient(
            timeout=httpx.Timeout(connect=10.0, read=30.0, write=10.0, pool=10.0)
        ) as client:
            async with client.stream("POST", url, headers=headers, json=body) as resp:
                if resp.status_code != 200:
                    raw = await resp.aread()
                    raise ProviderStreamError(
                        f"OpenAI returned HTTP {resp.status_code}: {raw.decode(errors='replace')[:500]}"
                    )

                async for line in resp.aiter_lines():
                    if not line.startswith("data:"):
                        continue
                    payload = line.split(":", 1)[1].strip()
                    if payload == "[DONE]":
                        break
                    try:
                        data = json.loads(payload)
                    except json.JSONDecodeError:
                        continue

                    if data.get("usage"):
                        usage = data["usage"]
                        input_tokens = usage.get("prompt_tokens") or input_tokens
                        output_tokens = usage.get("completion_tokens") or output_tokens
                        yield StreamChunk(
                            kind="usage",
                            input_tokens=input_tokens,
                            output_tokens=output_tokens,
                        )
                        continue

                    choices = data.get("choices") or []
                    if not choices:
                        continue
                    delta = choices[0].get("delta") or {}
                    text = delta.get("content")
                    if text:
                        yield StreamChunk(kind="text_delta", text=text)

        # Usage-total chunk always arrives before [DONE]; still, be safe.
        if input_tokens is not None or output_tokens is not None:
            yield StreamChunk(
                kind="usage",
                input_tokens=input_tokens,
                output_tokens=output_tokens,
            )
        yield StreamChunk(kind="message_stop")

    except httpx.HTTPError as exc:
        raise ProviderStreamError(f"Network error contacting OpenAI: {exc}") from exc