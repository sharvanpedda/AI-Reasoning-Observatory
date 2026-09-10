# AI Reasoning Observatory

**DataForge 2026 — Pathway Track / Problem Statement 1**

## Overview

AI Memory Observatory is an interactive observability platform for understanding how AI systems represent and update information during reasoning.

A user enters one question and the observatory independently runs two paths:

1. **Conventional LLM path** — shows observable token/usage telemetry and execution timing.
2. **BDH-CQ-inspired latent-state path** — visualizes a deterministic recurrent latent-state trace as an architectural demonstration.

The goal is **not** to claim that one architecture is universally better. The goal is to make a difficult AI concept — token-based memory versus recurrent latent-state reasoning — visible and experimentally understandable.

## What the project demonstrates

- One prompt → independent execution paths
- Live LLM answer streaming
- Prompt/output token telemetry where exposed by the provider
- Latent-state updates and state visualization
- Execution timeline and normalized events
- Evidence labels: **LIVE / ESTIMATE / PUBLISHED / N/A**
- Side-by-side comparison
- JSON export/replay support where available

## Important scientific limitation

The latent-state implementation in this repository is **BDH-CQ-inspired** and is **not claimed to be Pathway's official BDH-CQ checkpoint**.

The project uses published BDH/BDH-CQ research as the architectural reference. The local recurrent trace is an explanatory experiment designed to make the idea observable.

Provider APIs may not expose internal KV-cache memory directly. When a value cannot be measured, the application reports it as unavailable or uses an explicitly labeled estimate rather than fabricating a number.

## Architecture

```text
User
  │
  ▼
Next.js / React frontend
  │
  ▼
FastAPI backend
  │
  ├──────────────► Conventional LLM provider
  │
  └──────────────► Local latent-state experiment
                         │
                         ▼
                 Normalized telemetry
                         │
                         ▼
                  Observatory UI
```

The frontend and backend are separate services. The backend owns provider credentials; provider API keys must never be placed in the frontend environment.

## Technology

- Next.js 14 / React / TypeScript
- Tailwind CSS
- FastAPI / Python
- Server-Sent Events (SSE)
- Recharts
- React Three Fiber
- Configurable LLM providers

## Run locally

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Add the provider key you want to use to `backend/.env`.

Then:

```bash
uvicorn app.main:app --reload --port 8000
```

### Frontend

In another terminal:

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

Open:

```text
http://localhost:3000
```

The frontend should point to the backend with:

```text
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

## Environment files

**Actual `.env` and `.env.local` files are intentionally excluded from this repository/package.**

Only safe example files are included:

- `backend/.env.example`
- `frontend/.env.local.example`

Never commit API keys, passwords, tokens, or other secrets to GitHub.

## Evidence policy

Every important value is classified as one of:

| Label | Meaning |
|---|---|
| **LIVE** | Directly observed from the running application/provider |
| **ESTIMATE** | Transparent calculation or proxy because the runtime does not expose the underlying metric |
| **PUBLISHED** | Taken from cited external research |
| **N/A** | Not exposed or not supported |

This separation is a core design principle of the project.

## Pathway / BDH-CQ connection

The project is inspired by Pathway's BDH and BDH-CQ research on recurrent latent reasoning and persistent state.

Published BDH-CQ research reports a **150M-parameter** reasoning model, **29.5% pass@2 on ARC-AGI-1**, and **$0.00070 computed inference cost per task**. These are published research figures, **not measurements produced by this project**.

## Key references

- Pathway — Introducing BDH-CQ: https://pathway.com/research/introducing-bdh-cq
- BDH-CQ paper: https://arxiv.org/abs/2608.09888
- Pathway BDH repository: https://github.com/pathwaycom/bdh/
- Pathway BDH research: https://pathway.com/research/

## Team

**Team Pixel Perfect**

- Sharvan
- Kusuma Sri
- Raghava Manikanta

## Hackathon objective

The project turns an advanced AI architecture concept into an interactive experiment:

> **Ask → Observe → Compare**

Instead of only looking at an AI's final answer, the observatory helps users inspect the information representation and execution signals that can actually be observed.
