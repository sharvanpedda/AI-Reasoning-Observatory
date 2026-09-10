"""
Deterministic fallback path (SRS Section 16 / NFR-04).

If ANTHROPIC_API_KEY is missing, or the live provider call fails
mid-stream, the demo must not die. We serve one of a few canned,
clearly-labeled "Demo Mode" responses instead of a live model answer.
This keeps AT-08 (failure test) passing and lets a Demo Operator
rehearse without burning API budget.
"""
from __future__ import annotations

_CANNED: dict[str, str] = {
    "sky": (
        "The sky looks blue because sunlight is made of many colors, and air "
        "molecules scatter shorter, bluer wavelengths of light much more than "
        "longer, redder wavelengths. That scattered blue light reaches your "
        "eyes from all directions across the sky, so the whole sky looks blue "
        "instead of just the direction of the sun."
    ),
    "multiply": (
        "27 x 43 = 1161. One way to see it: 27 x 40 = 1080, and 27 x 3 = 81, "
        "so 1080 + 81 = 1161."
    ),
    "linked list": (
        "def reverse_linked_list(head):\n"
        "    previous = None\n"
        "    current = head\n"
        "    while current is not None:\n"
        "        next_node = current.next\n"
        "        current.next = previous\n"
        "        previous = current\n"
        "        current = next_node\n"
        "    return previous\n"
    ),
    "default": (
        "This is a Demo Mode response because no live model provider is "
        "configured on this server (ANTHROPIC_API_KEY is unset) or the live "
        "call failed. Demo Mode exists so the observatory keeps working for "
        "a reliable walkthrough. Configure ANTHROPIC_API_KEY to see real "
        "model output and real provider telemetry for this prompt."
    ),
}


def pick_demo_response(prompt: str) -> str:
    lowered = prompt.lower()
    if "sky" in lowered and "blue" in lowered:
        return _CANNED["sky"]
    if "27" in prompt and "43" in prompt:
        return _CANNED["multiply"]
    if "linked list" in lowered:
        return _CANNED["linked list"]
    return _CANNED["default"]


def demo_response_chunks(prompt: str) -> list[str]:
    """Split the canned response into small chunks so it can be streamed
    the same way a live response would be, at a similar cadence."""
    text = pick_demo_response(prompt)
    words = text.split(" ")
    chunks = []
    buf = ""
    for w in words:
        buf += (w + " ")
        if len(buf) > 12:
            chunks.append(buf)
            buf = ""
    if buf:
        chunks.append(buf)
    return chunks
