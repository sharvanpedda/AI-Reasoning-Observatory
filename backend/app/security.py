"""
Backend-only security middleware.

This process is the sole holder of ANTHROPIC_API_KEY and the sole
network egress point the frontend is allowed to talk to (NFR-05). The
two apps run as separate services on separate origins/ports; this
module adds the additional hardening appropriate for a backend that
will actually be exposed on the internet rather than just localhost:

- Security response headers (no secrets in headers, clickjacking /
  MIME-sniffing / referrer hardening).
- A simple in-memory, per-client-IP sliding-window rate limiter for
  the expensive /api/execute endpoint, so one client can't exhaust the
  provider budget or the in-memory run store.
- A request body size cap, enforced before the JSON body is parsed.

None of this replaces a real edge/WAF layer in production (see
DEPLOYMENT.md) — it's the minimum a standalone API process should do
for itself regardless of what sits in front of it.
"""
from __future__ import annotations

import time
from collections import defaultdict, deque

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.config import settings


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        response.headers["Cross-Origin-Resource-Policy"] = "same-site"
        if settings.environment == "production":
            response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains"
        return response


class MaxBodySizeMiddleware(BaseHTTPMiddleware):
    """Rejects requests whose declared Content-Length exceeds the cap,
    before FastAPI/pydantic ever touches the body."""

    def __init__(self, app, max_bytes: int = 32_000) -> None:
        super().__init__(app)
        self.max_bytes = max_bytes

    async def dispatch(self, request: Request, call_next):
        content_length = request.headers.get("content-length")
        if content_length is not None:
            try:
                if int(content_length) > self.max_bytes:
                    return JSONResponse(
                        status_code=413,
                        content={"detail": "Request body too large."},
                    )
            except ValueError:
                pass
        return await call_next(request)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Sliding-window rate limit, keyed by client IP, scoped to a
    configurable set of path prefixes (the expensive routes). In-memory
    only — fine for a single-process demo/small deployment; swap for a
    shared store (Redis) behind a load balancer with multiple workers.
    """

    def __init__(
        self,
        app,
        limited_prefixes: tuple[str, ...] = ("/api/execute",),
        max_requests: int | None = None,
        window_seconds: int | None = None,
    ) -> None:
        super().__init__(app)
        self.limited_prefixes = limited_prefixes
        self.max_requests = max_requests or settings.rate_limit_requests
        self.window_seconds = window_seconds or settings.rate_limit_window_seconds
        self._hits: dict[str, deque[float]] = defaultdict(deque)

    def _client_key(self, request: Request) -> str:
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.client.host if request.client else "unknown"

    async def dispatch(self, request: Request, call_next):
        if any(request.url.path.startswith(p) for p in self.limited_prefixes):
            key = self._client_key(request)
            now = time.time()
            window = self._hits[key]
            while window and now - window[0] > self.window_seconds:
                window.popleft()
            if len(window) >= self.max_requests:
                return JSONResponse(
                    status_code=429,
                    content={
                        "detail": (
                            f"Rate limit exceeded: max {self.max_requests} requests per "
                            f"{self.window_seconds}s on this endpoint."
                        )
                    },
                    headers={"Retry-After": str(self.window_seconds)},
                )
            window.append(now)
        return await call_next(request)
