"""
Recurrent latent-state demonstration — forward, backward, and combined
(bidirectional) passes.

IMPORTANT — read before changing this file:

This module does NOT run Pathway's actual BDH / BDH-CQ model. There is
no lightweight, reliably runnable public BDH-CQ checkpoint we could
embed here (SRS FR-27/FR-28). Rather than faking numbers or randomly
animating something, this module implements a small, fully-deterministic
recurrent state update, computed from the *actual* tokens of the
judge's real prompt:

    h_t = tanh(W_h . h_{t-1} + W_x . x_t + b)          (forward pass)
    g_t = tanh(U_h . g_{t+1} + U_x . x_t + c)          (backward pass)
    m_t = tanh(V_f . h_t + V_g . g_t + d)              (combined state)

where x_t is a fixed (seeded, non-random-per-run) hash embedding of
token t, and every weight matrix/bias (W_h, W_x, b, U_h, U_x, c, V_f,
V_g, d) is a fixed seeded matrix — never learned, never random per
run. Because every seed is constant, the same prompt always produces
the same three trajectories, and each one genuinely depends on the
prompt's tokens — this is a real, inspectable computation, not a
random walk or a canned animation.

WHAT THIS DOES AND DOES NOT ILLUSTRATE
---------------------------------------
Two separate architectural ideas are bundled into this one demo panel,
and the UI must keep them distinct (never collapse them into a single
unlabeled "BDH" number):

1. Persistent, fixed-size state (the forward pass, `h_t`). This is the
   idea genuinely associated with Pathway's BDH/BDH-CQ line of work: a
   constant-size recurrent state updated per token, instead of a
   KV-cache/context window that grows with every token. Pathway's own
   published BDH-CQ model is described as processing its input
   causally (left-to-right, one direction) when it updates its
   recurrent memory from in-context demonstrations.

2. Bidirectional recurrence (the backward pass `g_t` and the combined
   state `m_t`) is a classical, general recurrent-network technique
   (Schuster & Paliwal, 1997, "Bidirectional Recurrent Neural
   Networks") for building a representation of a token that has
   access to context on both sides of it, by running a second,
   independent recurrent state backward through the sequence and
   combining the two per-position states. It is included here because
   it is a genuinely useful complementary idea when discussing
   recurrent latent state (a fixed-size state is only causal by
   default; going bidirectional shows how the same idea generalizes)
   — but it is NOT part of Pathway's published BDH-CQ architecture,
   and the panel/labels must never imply that it is. It is an
   independent, general-purpose illustration bolted onto the same
   state trajectory, clearly separated in the UI (channel="bdh_cq",
   pass="forward" | "backward" | "combined").

Every event this module's caller emits is tagged channel="bdh_cq" and
a "pass" field, and the frontend labels the panel "Algorithmic
demonstration" (see EvidencePanel.tsx / Section 12). The backward and
combined passes additionally carry `bidirectional_note` text so the
UI can render the distinction inline rather than relying on the judge
having read this docstring.
"""
from __future__ import annotations

import hashlib
import math
from collections.abc import Iterator
from dataclasses import dataclass
from typing import Literal

STATE_DIM = 12
SEED = 1729  # fixed on purpose — determinism matters more than "randomness"

PassName = Literal["forward", "backward", "combined"]

BIDIRECTIONAL_NOTE = (
    "Bidirectional processing (backward + combined passes) is a classical, "
    "general recurrent-network technique (Schuster & Paliwal, 1997) shown here "
    "to illustrate how a fixed-size recurrent state generalizes beyond a single "
    "causal direction. It is NOT part of Pathway's published BDH-CQ "
    "architecture, which is described as processing context causally. "
    "Treat forward, backward and combined as three separate, clearly labeled "
    "illustrative computations over the same real prompt tokens."
)


def _seeded_matrix(rows: int, cols: int, tag: str) -> list[list[float]]:
    """A fixed pseudo-random matrix derived from a tag string + SEED.

    Uses hashlib (not `random`) so the exact same matrix is reproduced
    on every process start, on every machine, forever — no stored
    weights file needed for this illustrative demo.
    """
    matrix = []
    for r in range(rows):
        row = []
        for c in range(cols):
            h = hashlib.sha256(f"{SEED}:{tag}:{r}:{c}".encode()).hexdigest()
            # map first 8 hex chars to a float in [-1, 1]
            val = (int(h[:8], 16) / 0xFFFFFFFF) * 2 - 1
            row.append(val * 0.35)
        matrix.append(row)
    return matrix


# Forward-pass weights (left -> right recurrence).
_W_H = _seeded_matrix(STATE_DIM, STATE_DIM, "Wh")
_W_X = _seeded_matrix(STATE_DIM, STATE_DIM, "Wx")
_BIAS = [v[0] for v in _seeded_matrix(STATE_DIM, 1, "b")]

# Backward-pass weights (right -> left recurrence). Independently
# seeded (different tag strings) so the backward state genuinely is a
# separate recurrent computation, not a mirrored copy of the forward one.
_U_H = _seeded_matrix(STATE_DIM, STATE_DIM, "Uh")
_U_X = _seeded_matrix(STATE_DIM, STATE_DIM, "Ux")
_BIAS_BWD = [v[0] for v in _seeded_matrix(STATE_DIM, 1, "c")]

# Combination weights: how the forward and backward states at the same
# position are merged into one "bidirectional" state per token.
_V_F = _seeded_matrix(STATE_DIM, STATE_DIM, "Vf")
_V_G = _seeded_matrix(STATE_DIM, STATE_DIM, "Vg")
_BIAS_COMBINED = [v[0] for v in _seeded_matrix(STATE_DIM, 1, "d")]


def _token_embedding(token_text: str) -> list[float]:
    """Deterministic fixed embedding for a token string (hash-based, not learned)."""
    h = hashlib.sha256(token_text.encode("utf-8", errors="ignore")).digest()
    vec = []
    for i in range(STATE_DIM):
        byte = h[i % len(h)]
        vec.append((byte / 255.0) * 2 - 1)
    return vec


def _matvec(mat: list[list[float]], vec: list[float]) -> list[float]:
    return [sum(mat[r][c] * vec[c] for c in range(len(vec))) for r in range(len(mat))]


def _add(*vecs: list[float]) -> list[float]:
    return [sum(vs) for vs in zip(*vecs)]


def _tanh_vec(v: list[float]) -> list[float]:
    return [math.tanh(x) for x in v]


def _norm(v: list[float]) -> float:
    return math.sqrt(sum(x * x for x in v))


@dataclass
class LatentStep:
    step: int
    token_text: str
    state: list[float]
    state_norm: float
    decoded: bool
    pass_name: PassName = "forward"


def _decoded_heuristic(tok: str, i: int) -> bool:
    """Decoding heuristic for the demo: emit a decode marker every few
    steps or on sentence-ending punctuation, purely to give the timeline
    something discrete to show."""
    return tok.strip().endswith((".", "?", "!", ",")) or (i > 0 and i % 4 == 0)


def run_latent_trace(tokens: list[str]) -> Iterator[LatentStep]:
    """Forward-only recurrent state trace (kept for backward compatibility /
    the single-direction illustration). Yields one LatentStep per input
    token, updating a persistent fixed-size state vector left-to-right.
    """
    h = [0.0] * STATE_DIM
    for i, tok in enumerate(tokens):
        x = _token_embedding(tok)
        h = _tanh_vec(_add(_matvec(_W_H, h), _matvec(_W_X, x), _BIAS))
        yield LatentStep(
            step=i,
            token_text=tok,
            state=h[:6],
            state_norm=_norm(h),
            decoded=_decoded_heuristic(tok, i),
            pass_name="forward",
        )


def _forward_states(tokens: list[str]) -> list[list[float]]:
    h = [0.0] * STATE_DIM
    states = []
    for tok in tokens:
        x = _token_embedding(tok)
        h = _tanh_vec(_add(_matvec(_W_H, h), _matvec(_W_X, x), _BIAS))
        states.append(h)
    return states


def _backward_states(tokens: list[str]) -> list[list[float]]:
    """Independent recurrence run right-to-left over the same tokens,
    using its own weights (_U_H/_U_X/_BIAS_BWD). Returned in original
    left-to-right index order so `states[i]` is the backward state that
    has "seen" tokens i..end."""
    g = [0.0] * STATE_DIM
    states_rev: list[list[float]] = []
    for tok in reversed(tokens):
        x = _token_embedding(tok)
        g = _tanh_vec(_add(_matvec(_U_H, g), _matvec(_U_X, x), _BIAS_BWD))
        states_rev.append(g)
    return list(reversed(states_rev))


def run_bidirectional_latent_trace(tokens: list[str]) -> Iterator[LatentStep]:
    """Yield the full bidirectional demonstration for a token sequence:
    every forward step, then every backward step, then every combined
    (bidirectional) step — each tagged with `pass_name` so callers can
    stream them as three visually distinct phases.

    This mirrors a classical BiRNN: forward and backward recurrences
    are independent computations over the same input; only the
    per-position combination step reads from both. Backward and
    combined states require having the whole sequence available
    first (an inherent property of any bidirectional recurrence, not
    a limitation specific to this demo) — the panel/UI should present
    this honestly as "requires the full prompt" rather than pretending
    it streams causally like the forward pass does.
    """
    if not tokens:
        return

    forward_states = _forward_states(tokens)
    backward_states = _backward_states(tokens)

    for i, tok in enumerate(tokens):
        h = forward_states[i]
        yield LatentStep(
            step=i,
            token_text=tok,
            state=h[:6],
            state_norm=_norm(h),
            decoded=_decoded_heuristic(tok, i),
            pass_name="forward",
        )

    for i, tok in enumerate(tokens):
        g = backward_states[i]
        yield LatentStep(
            step=i,
            token_text=tok,
            state=g[:6],
            state_norm=_norm(g),
            decoded=_decoded_heuristic(tok, len(tokens) - 1 - i),
            pass_name="backward",
        )

    for i, tok in enumerate(tokens):
        h = forward_states[i]
        g = backward_states[i]
        m = _tanh_vec(_add(_matvec(_V_F, h), _matvec(_V_G, g), _BIAS_COMBINED))
        yield LatentStep(
            step=i,
            token_text=tok,
            state=m[:6],
            state_norm=_norm(m),
            decoded=_decoded_heuristic(tok, i) or _decoded_heuristic(tok, len(tokens) - 1 - i),
            pass_name="combined",
        )
