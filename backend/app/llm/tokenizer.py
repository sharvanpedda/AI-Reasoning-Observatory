"""
Token estimation.

Anthropic does not publish Claude's exact tokenizer, so any count we
produce *before* the API responds is necessarily an approximation. We
deliberately do NOT depend on a downloaded BPE vocabulary (e.g.
tiktoken's remote files): a hackathon demo network can be flaky or
locked down, and NFR-04 (reliability) matters more than exactness for
a value that is honestly labeled "estimated" either way. Instead we
use a small dependency-free regex tokenizer -- words, numbers, and
punctuation each count as one unit -- as a simplified, clearly-labeled
proxy token representation (SRS Section 12: PROXY / ESTIMATE).

The *real* number (SRS "LIVE MEASUREMENT") comes back from the
provider itself in the streaming response's `usage` field
(input_tokens / output_tokens) and supersedes this estimate -- see
llm/anthropic_client.py. We never invent a live number ourselves
(FR-15, Section 16).
"""
from __future__ import annotations

import re

_TOKEN_RE = re.compile(r"\w+|[^\w\s]", re.UNICODE)


def estimate_tokens(text: str) -> list[str]:
    """Return a simplified, human-readable token representation.

    This is intentionally coarse: it exists so the UI has *something*
    to render as a "prompt token row" before the provider confirms
    real counts, not to claim it matches Claude's internal tokenizer.
    """
    if not text:
        return []
    return _TOKEN_RE.findall(text)


def estimate_token_count(text: str) -> int:
    return len(estimate_tokens(text))
