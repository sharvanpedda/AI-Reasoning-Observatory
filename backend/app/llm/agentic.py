"""
Agentic RAG prompt composition (Phase 2).

Turns the user's raw question into the prompt actually sent to the live
provider:

  1. classify  (rag/retrieve)      -> "ai_memory" | "general"
  2. retrieve  (rag/retrieve)      -> up to k curated passages
  3. compose                        -> one well-structured prompt

The composed prompt requests a clean, ChatGPT/Gemini-style answer: direct,
sectioned with Markdown when useful, no "as an AI" boilerplate, and —
when context was retrieved — grounded in that context. The raw question is
never mangled: every injected source is disclosed separately via the
`rag_context` event so the observatory stays honest about what the model
was actually given.
"""
from __future__ import annotations

from dataclasses import dataclass, field

from app.llm.tokenizer import estimate_token_count
from app.rag.knowledge_base import Passage
from app.rag.retrieve import classify_mode, retrieve

_MAX_SOURCES = 3

_FORMAT_INSTRUCTIONS = (
    "Answer directly and conversationally, the way a helpful AI assistant does. "
    "Start with a short, direct answer in one or two sentences. Then expand with "
    "short paragraphs or a few Markdown sections (## headings for longer answers), "
    "use **bold** for key terms, and use bullet lists only where they genuinely help. "
    "Keep sentences short. Never write 'As an AI model...', 'I cannot', or other "
    "boilerplate. If you used background context below, let it guide accuracy but "
    "answer in your own words."
)


@dataclass
class AgenticPlan:
    """What the conventional side will actually send + what to disclose."""

    prompt: str
    mode: str
    sources: list[Passage] = field(default_factory=list)
    injected_tokens: int = 0  # estimated tokens added beyond the user's question


def _context_block(sources: list[Passage]) -> str:
    lines = ["Background context (curated knowledge base):", ""]
    for i, p in enumerate(sources, 1):
        lines.append(f"--- passage {i}: {p.title} ---")
        lines.append(p.text)
        lines.append("")
    return "\n".join(lines)


def build_agentic_prompt(user_prompt: str) -> AgenticPlan:
    mode = classify_mode(user_prompt)
    if mode == "general":
        composed = f"{_FORMAT_INSTRUCTIONS}\n\nQuestion: {user_prompt}"
        return AgenticPlan(prompt=composed, mode=mode, sources=[], injected_tokens=0)

    sources = retrieve(user_prompt, k=_MAX_SOURCES)
    parts: list[str] = [_FORMAT_INSTRUCTIONS]
    if sources:
        parts.append(_context_block(sources))
    parts.append(f"Question: {user_prompt}")
    composed = "\n\n".join(parts)

    plain = composed.replace(user_prompt, "")  # tokens added beyond the question
    injected_tokens = estimate_token_count(plain)
    return AgenticPlan(
        prompt=composed,
        mode=mode,
        sources=sources,
        injected_tokens=injected_tokens,
    )