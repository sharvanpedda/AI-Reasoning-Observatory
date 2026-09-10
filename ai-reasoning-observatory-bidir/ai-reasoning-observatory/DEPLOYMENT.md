# Deployment & security architecture

## Two separate services, on purpose

The frontend and backend are **not** one app split into folders for
tidiness — they are two independently deployable services that never
share a process, a filesystem, an environment, or a container:

```
┌───────────────────────────┐        HTTPS, JSON/SSE only        ┌────────────────────────────┐
│  Frontend (Next.js)       │  ───────────────────────────────▶  │  Backend (FastAPI)         │
│  its own origin/domain    │  ◀───────────────────────────────  │  its own origin/domain     │
│  its own container/deploy │      (NEXT_PUBLIC_API_BASE_URL)    │  holds ANTHROPIC_API_KEY   │
│  NEVER sees the API key   │                                    │  never renders any UI      │
└───────────────────────────┘                                    └────────────────────────────┘
```

Why this matters for data security:

- **The provider API key can only ever leak from one place** — the
  backend process/container — because it is never passed to the
  frontend build, never put in a `NEXT_PUBLIC_*` variable, and never
  returned in any API response body. `grep -r "sk-ant" .next` after a
  frontend build should find nothing (see the root `README.md`'s
  verification command).
- **A frontend compromise (e.g. a malicious npm package, an XSS bug)
  cannot read backend secrets**, because there is no shared memory,
  disk, or environment for it to reach into — it would have to attack
  the backend over the network like any other client, and would hit
  the same rate limiting and validation everyone else does.
- **The backend never serves HTML/JS to a browser**, so a backend
  compromise doesn't hand an attacker a foothold for injecting script
  into what judges/users see — its only output is JSON and SSE events.
- Each service can be scaled, redeployed, or rolled back independently
  without touching the other.

## Local development

Two ways to run it locally, both keep the services separate:

### Option A — two terminals (fastest inner loop)

```bash
# terminal 1
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in ANTHROPIC_API_KEY (optional — Demo Mode works without it)
uvicorn app.main:app --reload --port 8000

# terminal 2
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

### Option B — Docker Compose (closer to how it's actually deployed)

```bash
cp backend/.env.example backend.env   # fill in ANTHROPIC_API_KEY
docker compose up --build
```

This starts two containers on a shared Docker network (`observatory`)
that only exposes the ports each service needs — the frontend
container has no `ANTHROPIC_API_KEY` in its environment at all.

## Production deployment (example: Render + Vercel)

This is one concrete split-hosting example; any two independent hosts
work the same way (e.g. Fly.io + Netlify, ECS + S3/CloudFront, etc).

1. **Backend → Render** (or any container host): push `backend/` with
   its `Dockerfile`. `backend/render.yaml` is a ready-to-use blueprint.
   Set `ANTHROPIC_API_KEY` directly in the host's secret manager —
   never in a committed file. Set `CORS_ORIGINS` to the frontend's
   real deployed URL, and `TRUSTED_HOSTS` to the backend's own
   hostname once it's known.
2. **Frontend → Vercel** (or any static/Node host): push `frontend/`.
   Set `NEXT_PUBLIC_API_BASE_URL` to the backend's deployed URL as a
   build-time environment variable. This value is public by design —
   it's a URL, not a credential.
3. Re-deploy the backend once the frontend's final URL is known, so
   `CORS_ORIGINS` is accurate (an overly permissive `*` defeats the
   purpose of CORS).

## Defense-in-depth already built into the backend

None of this replaces a real edge/WAF/CDN layer in front of a public
production deployment, but the backend does not rely on one either:

| Control | Where |
|---|---|
| CORS restricted to known frontend origin(s) | `app/main.py` (`CORSMiddleware`) |
| Host header validation | `app/main.py` (`TrustedHostMiddleware`) |
| Security response headers (no-sniff, no-frame, referrer, permissions) | `app/security.py` (`SecurityHeadersMiddleware`) |
| Request body size cap | `app/security.py` (`MaxBodySizeMiddleware`) |
| Per-IP rate limiting on the expensive endpoint | `app/security.py` (`RateLimitMiddleware`) |
| Prompt length validation | `app/routes/execute.py` |
| No secrets ever returned in responses | enforced by code review — the event model has no field for it |
| No prompts/results persisted to disk | `app/state.py` (bounded in-memory store only) |
| `/docs`, `/redoc`, `/openapi.json` can be disabled in prod | `DOCS_ENABLED` env var |

The frontend adds its own response headers via `next.config.js` /
`vercel.json`, and never embeds the backend UI in an iframe or shares
any origin/session state with it.
