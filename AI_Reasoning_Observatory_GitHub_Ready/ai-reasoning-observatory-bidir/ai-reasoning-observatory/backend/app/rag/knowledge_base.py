"""
Curated knowledge base for the Agentic RAG path (Phase 2).

A small, trusted set of plain-text passages about how LLMs and latent-
state models actually hold memory. These are the only "documents" the
retrieval stage searches, which keeps the demo deterministic, offline,
and honest: the conventional LLM is asked to answer the user's question
grounded in these passages (when they match), and the observatory always
discloses which passages were injected (see the `rag_context` event).

These passages are intentionally plain-language and internally researched
(summaries of attention / KV-cache / recurrent-state mechanics). They are
NOT a reproduction of Pathway's proprietary BDH-CQ system.
"""
from __future__ import annotations

from pydantic import BaseModel


class Passage(BaseModel):
    id: str
    title: str
    keywords: list[str]
    text: str


KNOWLEDGE_BASE: list[Passage] = [
    Passage(
        id="kv-cache",
        title="What the KV-cache is and why it grows",
        keywords=["kv", "kv cache", "kv-cache", "cache", "context window", "tokens", "keys", "values", "grows", "memory", "o(n)"],
        text=(
            "During generation, a transformer must re-attend to every earlier token. To avoid "
            "recomputing them, it stores each token's key and value vectors in a KV-cache. "
            "That cache is proportional to the number of tokens processed, so its memory usage "
            "is O(n). Longer conversations cost more memory; every new token appends vectors "
            "rather than compressing what came before."
        ),
    ),
    Passage(
        id="token-memory",
        title="Token memory: memory that scales with input length",
        keywords=["token memory", "tokens", "grows", "scales", "long", "conversation", "context"],
        text=(
            "A conventional LLM's working memory is per-token: it keeps one K/V pair per token in "
            "the context window. The cost is linear in the number of tokens, and nothing is ever "
            "compressed. This is 'token memory' — precise, but it grows without bound as a "
            "conversation continues."
        ),
    ),
    Passage(
        id="attention",
        title="How attention reads the whole context",
        keywords=["attention", "transformer", "query", "key", "value", "self-attention"],
        text=(
            "In self-attention, every position computes query, key, and value vectors, then "
            "attends to every earlier key. The K/V pairs produced along the way are exactly what "
            "the KV-cache stores. Attention itself is a compute cost per token pair; the KV-cache "
            "is the memory cost of those same K/V vectors — the two are distinct measurable things."
        ),
    ),
    Passage(
        id="latent-memory",
        title="Latent memory: a fixed-size state instead of a growing list",
        keywords=["latent", "state", "hidden", "recurrent", "o(1)", "rnn", "vector", "fixed", "constant", "compressed", "persistent"],
        text=(
            "Recurrent architectures replace the per-token list with a single fixed-size state. "
            "Each token updates the state instead of appending to it. The memory footprint is "
            "constant regardless of input length — O(1) for the retained state — at the cost of "
            "storing information only as far as the state can represent it."
        ),
    ),
    Passage(
        id="bdh-cq",
        title="BDH / BDH-CQ: a persistent-state line of work",
        keywords=["bdh", "bdh-cq", "pathway", "latent", "persistent", "state", "o(1)", "memory", "kv"],
        text=(
            "Pathway's BDH / BDH-CQ research line studies architectures that keep a persistent "
            "recurrent state rather than a growing KV-cache, aiming for O(1) memory and strong "
            "reasoning on long inputs. This observatory runs a transparent, deterministic research "
            "demonstration of the fixed-size latent-state idea with a 12-dim float32 state "
            "(48 bytes); it is not Pathway's proprietary implementation."
        ),
    ),
    Passage(
        id="bidi-rnn",
        title="Forward, backward, and combined passes over the same tokens",
        keywords=["forward", "backward", "bidirectional", "combined", "pass", "left", "right", "schuster", "paliwal"],
        text=(
            "A forward pass over a prompt is causal: the state at step t depends only on tokens 0..t. "
            "A backward pass reads right-to-left and is non-causal; it needs the whole prompt before "
            "its first step exists. A combined pass merges both per position (Schuster & Paliwal 1997, "
            "the classic bidirectional RNN). The backward/combined passes are a general recurrent "
            "technique, not part of BDH-CQ."
        ),
    ),
    Passage(
        id="latency",
        title="Latency vs memory are different measurements",
        keywords=["latency", "speed", "fast", "slow", "seconds", "throughput", "time"],
        text=(
            "Latency (how long an answer takes) and memory (how much space is retained) are "
            "independent quantities. A model can be fast but memory-hungry, or memory-cheap but "
            "slow. When comparing architectures, each must be measured and labeled separately."
        ),
    ),
    Passage(
        id="float32",
        title="Why the demo state is 48 bytes",
        keywords=["48", "byte", "bytes", "float32", "float", "12", "dimension", "state size"],
        text=(
            "The demo BDH state is a 12-dimensional vector stored as 12 float32 values: 12 x 4 = 48 "
            "bytes exactly, regardless of prompt length. The KV-cache of a real 7B-class model is "
            "typically on the order of tens of thousands of bytes per token; providers do not expose "
            "the true live value, so the observatory labels it 'not exposed' or 'estimated' rather "
            "than inventing a number."
        ),
    ),
    Passage(
        id="chat-style",
        title="A clean, human answer style",
        keywords=["explain", "what is", "how", "why", "simple", "10-year-old", "beginner", "understand"],
        text=(
            "Good answers to educational questions are direct, structured, and non-robotic: a short "
            "direct answer, then a few short paragraphs or sections, examples where helpful, and no "
            "'as an AI, I cannot...' boilerplate. Formatting signals sections; short sentences keep "
            "it readable."
        ),
    ),
]


def get_passage(passage_id: str) -> Passage | None:
    for p in KNOWLEDGE_BASE:
        if p.id == passage_id:
            return p
    return None