"""
Honest, labeled correctness evaluation for both sides (Phase 4).

Rules that keep this defensible:
  * NEVER present a proxy score as absolute truth. Every result carries a
    `method` and a `note` explaining exactly what was measured.
  * The conventional answer is scored against the question:
      - "known_answer" when the prompt matches a registry entry with a
        verifiable expected value (e.g. 27 x 43 = 1161). 1.0 if the
        answer contains the expected value, 0.0 otherwise — real signal,
        and it can honestly show the LLM being wrong.
      - "reference_overlap" (proxy) otherwise: how much of the answer
        overlaps the keywords the RAG layer used / default topic words.
  * The BDH-CQ side now produces a real LLM answer constrained to its fixed
    48-byte latent memory (no full prompt, no retrieved documents) that
    answers the SAME question with the SAME facts (fresh wording), so it is
    scored with the exact SAME method as the conventional side — including
    the verifiable arithmetic verdict when one exists. Method-identical,
    directly comparable. For non-objective prompts both sides get the same
    topical-grounding proxy, built from the question's own content words
    (or RAG keywords when available) — never from an unrelated jargon list.
"""
from __future__ import annotations

import re

from app.rag.knowledge_base import KNOWLEDGE_BASE

# ── Objective, verifiable prompts ────────────────────────────────────
_K_NUMERIC = [
    {
        # Matches *, x, and the Unicode multiplication sign × (which the UI's
        # own preset prompt uses) — without it, a correct arithmetic answer
        # would silently fall through to the weaker topical proxy.
        "pattern": re.compile(r"\b27\s*(?:\*|x|\u00d7)\s*43\b|\b27\s*and\s*43\b|\b43\s*(?:\*|x|\u00d7)\s*27\b", re.I),
        "expected": 1161,
        "label": "27 × 43 = 1161",
    },
    {
        "pattern": re.compile(r"what\s+is\s+(\d{1,4})\s*\+\s*(\d{1,4})", re.I),
        "expected": None,  # dynamic
        "label": "simple addition",
    },
]

_DEFAULT_REFERENCE_KEYWORDS = {
    "llm", "token", "memory", "kv", "cache", "latent", "state", "attention",
    "context", "bdh", "pathway", "recurrence", "o(1)", "o(n)", "float32",
    "48", "byte", "forward", "backward", "combined", "bidirectional",
}


def _extract_numbers(text: str) -> list[float]:
    """Extract numbers, honoring thousands separators.

    LLMs routinely format answers like "1,161" — a naive [0-9.]+ scan
    splits that into 1 and 161, which would score a CORRECT arithmetic
    answer as Incorrect. The first alternative matches comma-grouped
    integers (1,161 / 1,080,532) and strips the commas; the second is the
    plain number. The pattern requires exactly three digits after each
    comma, so lists like "27, 43" are unaffected.
    """
    grouped = re.findall(r"-?\d{1,3}(?:,\d{3})+(?:\.\d+)?", text)
    plain = re.findall(r"-?\d+(?:\.\d+)?", text)
    values = [float(m.replace(",", "")) for m in grouped]
    # Only add plain matches that are not substrings of a grouped match.
    grouped_spans = [m.span() for m in re.finditer(r"-?\d{1,3}(?:,\d{3})+(?:\.\d+)?", text)]
    for m in re.finditer(r"-?\d+(?:\.\d+)?", text):
        if any(s <= m.start() < e for s, e in grouped_spans):
            continue
        values.append(float(m.group()))
    return values


def _known_answer_score(prompt: str, text: str) -> dict | None:
    for entry in _K_NUMERIC:
        m = entry["pattern"].search(prompt)
        if not m:
            continue
        if entry["expected"] is None:
            # dynamic addition: a + b from the matched groups
            a, b = int(m.group(1)), int(m.group(2))
            expected = a + b
        else:
            expected = entry["expected"]
        nums = _extract_numbers(text)
        correct = bool(nums and any(abs(n - expected) < 0.01 for n in nums))
        return {
            "method": "known_answer",
            "score": 1.0 if correct else 0.0,
            "label": "Correct" if correct else "Incorrect",
            "note": (
                f"Verifiable objective: expected {expected}. The model's answer "
                f"contains {expected!r}: {'YES' if correct else 'NO'}."
            ),
        }
    return None


_PROMPT_STOP = {
    "what", "when", "where", "which", "with", "does", "did", "that", "this",
    "then", "they", "them", "their", "there", "have", "has", "had", "will",
    "would", "could", "should", "about", "into", "from", "your", "you",
    "explain", "briefly", "please", "tell", "give", "show", "check",
    "objective", "reasoning", "concept", "stress", "test", "sentence",
    "summarize", "simple", "terms", "one", "two",
}


def _prompt_reference_words(prompt: str) -> set[str]:
    """Content words of the question itself — the honest fallback proxy set:
    does the answer address what was actually asked?"""
    return set(re.findall(r"[a-z]{4,}", prompt.lower())) - _PROMPT_STOP


def _reference_overlap_score(prompt: str, text: str, rag_keywords: set[str]) -> dict:
    """Reference-overlap proxy: how many reference keywords appear in the answer."""
    words = set(re.findall(r"[a-z0-9]+", text.lower()))
    ref = rag_keywords or _prompt_reference_words(prompt) or _DEFAULT_REFERENCE_KEYWORDS
    hits = words & ref
    denominator = max(3, len(ref))
    score = min(1.0, len(hits) / denominator) if ref else 0.0
    return {
        "method": "reference_overlap",
        "score": round(score, 3),
        "label": "proxy",
        "note": (
            f"Proxy score: {len(hits)} reference keywords detected in the answer "
            f"out of a reference set of {len(ref)} (score denominator {denominator}). "
            "This measures topical grounding, "
            "not factual truth — it is labeled proxy, never presented as correctness."
        ),
    }


def evaluate(
    prompt: str,
    conventional_text: str,
    bdh_answer_text: str,
    rag_source_ids: list[str],
) -> dict:
    rag_keywords: set[str] = set()
    for pid in rag_source_ids:
        for p in KNOWLEDGE_BASE:
            if p.id == pid:
                rag_keywords.update(p.keywords)
                break

    # Conventional: known_answer (objective/verifiable) when possible,
    # otherwise a topical-grounding reference-overlap proxy.
    conv = _known_answer_score(prompt, conventional_text)
    if conv is None:
        conv = _reference_overlap_score(prompt, conventional_text, rag_keywords)

    # BDH answers the same question with the same facts (the memory
    # architecture differs, not the substance), so it gets the SAME scoring
    # method as the conventional side — including the verifiable arithmetic
    # verdict when one exists. Method-identical, directly comparable.
    bdh = _known_answer_score(prompt, bdh_answer_text)
    if bdh is None:
        bdh = _reference_overlap_score(prompt, bdh_answer_text, rag_keywords)
    # Tag the BDH score note so the method is unambiguous.
    bdh["note"] = (
        "BDH-CQ's answer is produced by the same live LLM but constrained to its "
        "fixed 48-byte latent memory (no full prompt, no retrieved documents). "
        "Scored with the exact same method as the conventional side, so the two "
        "scores are directly comparable. " + bdh["note"]
    )

    return {
        "prompt": prompt,
        "conventional": conv,
        "bdh": bdh,
        "caveat": (
            "Scores are method-labeled. known_answer = verifiable objective check "
            "(conventional side only — the full-context LLM can do arithmetic; "
            "BDH-CQ's constrained 48-byte-memory answer may not reliably); "
            "reference_overlap = topical-grounding proxy applied to BOTH sides "
            "identically. Only the known_answer score is a true correctness verdict."
        ),
    }