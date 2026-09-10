from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware

from app.config import settings
from app.routes.execute import router as execute_router
from app.routes.replay import router as replay_router
from app.security import MaxBodySizeMiddleware, RateLimitMiddleware, SecurityHeadersMiddleware

app = FastAPI(
    title="AI Reasoning Observatory API",
    description=(
        "Backend for the AI Reasoning Observatory (DataForge Hackathon, "
        "Problem Statement 1 / Pathway). Orchestrates a real LLM call and a "
        "deterministic recurrent-latent-state demonstration (forward, "
        "backward, and combined bidirectional passes), normalizing both "
        "into a single synchronized event stream."
    ),
    version="2.1.0",
    docs_url="/docs" if settings.docs_enabled else None,
    redoc_url="/redoc" if settings.docs_enabled else None,
    openapi_url="/openapi.json" if settings.docs_enabled else None,
)

# This process is the only thing that ever holds ANTHROPIC_API_KEY. The
# frontend runs as a fully separate service/origin and only ever talks
# to the routes below over HTTP — it never sees provider credentials
# (NFR-05). Middleware order matters: outermost first.
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(MaxBodySizeMiddleware, max_bytes=settings.max_prompt_chars * 4 + 2_000)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.trusted_hosts)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

app.include_router(execute_router)
app.include_router(replay_router)


@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "live_provider_configured": settings.live_provider_configured,
        "providers": settings.live_providers,
        "model": settings.anthropic_model,
    }
