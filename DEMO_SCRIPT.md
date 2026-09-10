# Demo Script — AI Reasoning Observatory
**DataForge 2026 · Problem Statement 1 (Pathway) · IIT Kharagpur**

---

## 30-Second Pitch

> "Every LLM answer you've ever seen was produced by a context window that grows with every token.
> This app lets you watch that happening — live, with real telemetry — right next to what a
> **fixed-size recurrent latent state** looks like instead. That's the BDH/BDH-CQ idea from
> Pathway. Same prompt, two architectures, zero invented numbers."

---

## Setup (2 min)

### Backend (Terminal 1)
```bash
cd C:\DataForge\ai-reasoning-observatory-bidir\ai-reasoning-observatory\backend
.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload
```
Verify: open [http://127.0.0.1:8001/api/health](http://127.0.0.1:8001/api/health)
Expected: `{"status":"ok","live_provider_configured":true,"providers":["sarvam"],"model":"claude-sonnet-4-6"}`

### Frontend (Terminal 2)
```bash
cd C:\DataForge\ai-reasoning-observatory-bidir\ai-reasoning-observatory\frontend
npm run dev
```
Open: [http://localhost:3003](http://localhost:3003) (or whichever port Next.js reports)

---

## The 90-second flow

1. Open `/observatory` — split view is already on: both architectures side by side.
2. Run prompt 1 below. While it streams: point at the memory race strip (one bar grows, one never moves), then at the latent heatmap filling column by column — "hover any column, that's the raw state".
3. When it completes, scroll to the **Context stress test**: "now you break it" — hand the mouse to a judge and let them drag to 8K+ and watch the overflow trip.
4. Point at **Export run (JSON)**: "every number you just saw is in this file — take it with you."

## Recommended Demo Prompts (in order)

### 1. Classic explainer (best for judges)
```
Explain why the sky is blue to a 10-year-old
```
- Short enough to see all tokens tokenized live
- Shows full pipeline: tokenize → inference → stream → complete
- BDH-CQ trace runs concurrently — point out the fixed-size chamber vs growing bars

### 2. CS fundamentals (impresses technical judges)
```
What is the time complexity of quicksort, and when does it degrade?
```
- Shows provider reasoning on a precise technical question
- Token throughput (tok/s) badge appears in real time
- Point to the KV-cache showing "Not exposed by provider" — honesty, not fakery

### 3. Programming task (longest output, shows streaming best)
```
Write a Python function to detect a cycle in a linked list
```
- Longest output → best demo of streaming animation
- BDH backward pass "pending" until forward completes — explain why (non-causal)

---

## What to Point Out

| What the judge sees | What to say |
|---|---|
| Split view by default — both panels running simultaneously | "Same prompt, same moment, zero clicks — the conventional LLM is calling the provider live while the BDH-CQ trace computes locally. I never have to ask you to imagine them together." |
| The latent-state heatmap under the BDH chamber | "Every column is a real state vector from the run — hover one and you can read the exact token and raw floats. The bright spikes are the tokens that moved the state most; those are the same tokens the constrained-memory probe uses." |
| Token chips in amber | "These are the actual tokens from your prompt — the proxy tokenizer fires before inference, then the provider's real count supersedes it once the response starts" |
| Growing token bars in the 3D viewport (left) | "This is O(n) memory — every token you output adds to the KV cache. The bar row only ever grows." |
| Fixed-size sphere with shifting particles (right) | "This is O(1) memory — the same 60-particle chamber regardless of prompt length. Only the activity pattern shifts." |
| KV Cache: "Not exposed by provider" | "We don't invent numbers. The provider doesn't expose KV-cache memory, so we say so — FR-20 in the SRS." |
| Latency timer during inference | "Live elapsed clock — starts when execution begins, freezes when inference completes." |
| tok/s badge | "Real throughput calculated from provider-reported token count ÷ elapsed time." |
| Evidence panel at the bottom | "Every metric is tagged: live, estimated, unavailable, or published. Every claim has a citation." |
| Three BDH-CQ tabs: Forward / Backward / Combined | "Forward = Pathway's BDH-CQ idea (causal). Backward + Combined = classical BiRNN technique (Schuster & Paliwal 1997) — not part of BDH-CQ, but illustrates how a fixed-size state generalizes." |
| Replay button | "Events are stored — you can replay the whole run without hitting the API again." |

---

## Key Differentiators vs Other Teams

1. **Zero fabricated metrics** — every number has a source label (live/estimated/unavailable/published)
2. **Bidirectional pass honestly labeled** — the backward/combined passes are explicitly stated NOT to be part of BDH-CQ
3. **Multi-provider fallback** — if Sarvam fails, the chain tries Anthropic then Demo Mode; the demo never dies
4. **Security AT-09 passes** — no API key appears in the client bundle (run `npm run build && grep -r "sk_" .next/static` to verify)
5. **Concurrent execution** — LLM call and BDH-CQ trace run in parallel via `asyncio.gather`, not sequentially
6. **Real SSE event stream** — 11 distinct event types with run_id, timestamp, channel, and typed payloads
7. **Deterministic BDH-CQ trace** — same prompt → identical state trajectory every time (demonstrable live with Replay)
8. **Split view by default** — the two architectures always run side by side; the comparison is the interface, not a hidden tab
9. **Interactive stress test** — judges drag a slider and watch the conventional side's memory climb, degrade (Lost in the Middle, Liu et al. 2023) and overflow — while the latent state stays at 48 B. The demo invites the judge to try to break it.
10. **One-click reproducibility** — "Export run (JSON)" downloads every event and metric of the run; nothing on screen is unverifiable

---

## Graceful Failure Paths

| Failure | What happens | What to say |
|---|---|---|
| Sarvam API is down | Anthropic tried; if both fail → Demo Mode | "The demo never dies — see the amber 'Demo Mode' badge" |
| No internet | Demo Mode with canned responses | "Works offline — Demo Mode is built-in" |
| WebGL unavailable | Three.js falls back silently; numeric readouts still work | "The app doesn't require 3D — all the real data is in the text rows" |

---

## Acceptance Tests (SRS Section 17)

- [x] AT-01: Enter submits the prompt
- [x] AT-02: Run button submits the same pipeline
- [x] AT-03: Token row updates automatically with every prompt
- [x] AT-04: Output streams progressively (not batch)
- [x] AT-05: All metrics labeled live/estimated/unavailable/published
- [x] AT-06: Replay works without another API call
- [x] AT-07: BDH state updates are data-driven or explicitly labeled
- [x] AT-08: Provider failure → fallback, never a dead page
- [x] AT-09: No provider key in client bundle
- [x] AT-10: A new viewer understands the central difference within 30 seconds

---

*"A truthful live LLM demo with excellent observability is more valuable than an elaborate 3D environment."*
*— SRS Section 18 priority rule*
