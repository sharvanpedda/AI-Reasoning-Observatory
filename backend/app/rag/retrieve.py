"""
Lightweight retrieval + classification for the Agentic RAG path.

No heavy embeddings: the knowledge base is small and curated, so a
keyword / overlap scorer is deterministic, offline, and transparent.
Two jobs:

1. `classify_mode(prompt)`  -> "ai_memory" | "general"
     Decide whether the question is about AI / memory / the observatory
     itself (where grounding helps) or a general question (answer directly,
     still with clean formatting).
2. `retrieve(prompt, k)`    -> sorted list of Passage
     Score every passage by how many of its keywords appear in the prompt;
     a passage must have at least one hit to qualify.

Everything is honest: the passages actually injected into the prompt are
also disclosed in the `rag_context` event on the wire.
"""
from __future__ import annotations

import re

from app.rag.knowledge_base import KNOWLEDGE_BASE, Passage

TOPIC_WORDS: set[str] = {
    # AI / memory / observatory vocabulary
    "llm", "ai", "model", "token", "tokens", "kv", "cache", "memory",
    "latent", "state", "attention", "transformer", "context", "bdh",
    "bdh-cq", "pathway", "neural", "network", "rnn", "recurrent",
    "hidden", "cog", "latency", "forward", "backward", "bidirectional",
    "combined", "pass", "float32", "bytes", "o(1)", "o(n)", "reasoning",
    "inference", "generation", "decode", "prompt", "rag", "retrieval",
    "agentic", "hov", "screen",
}

# Also treat these as topic-ish (educational questions likely desire context)
_SOFT_TOPIC_WORDS: set[str] = {
    "explain", "what is", "how does", "why", "how", "learn", "course",
    "teach", "tutorial",
}


def _tokens(text: str) -> set[str]:
    """Lowercased word tokens (crude but sufficient for scoring)."""
    return set(re.findall(r"[a-z0-9]+", text.lower()))


def _has_keyword(prompt_lower: str, keyword: str) -> bool:
    kw = keyword.strip().lower()
    if not kw:
        return False
    return kw in prompt_lower


def classify_mode(prompt: str) -> str:
    lowered = prompt.lower().strip()
    toks = _tokens(prompt)
    if toks & TOPIC_WORDS:
        return "ai_memory"
    for soft in _SOFT_TOPIC_WORDS:
        if soft in lowered:
            return "ai_memory"
    return "general"


def retrieve(prompt: str, k: int = 3) -> list[Passage]:
    lowered = prompt.lower()
    ranked: list[tuple[int, Passage]] = []
    for passage in KNOWLEDGE_BASE:
        score = sum(1 for kw in passage.keywords if _has_keyword(lowered, kw))
        if score > 0:
            ranked.append((score, passage))
    ranked.sort(key=lambda item: (-item[0], item[1].id))
    return [p for _, p in ranked[:k]]