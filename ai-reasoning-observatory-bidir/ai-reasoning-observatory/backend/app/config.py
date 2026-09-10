"""
Centralized, server-side-only configuration.

Nothing in this module is ever sent to the browser. The frontend never
sees ANTHROPIC_API_KEY; it only talks to our FastAPI routes.
"""
from __future__ import annotations

import os
from dataclasses import dataclass, field

from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Settings:
    anthropic_api_key: str = os.getenv("ANTHROPIC_API_KEY", "")
    anthropic_model: str = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-6")
    anthropic_base_url: str = os.getenv("ANTHROPIC_BASE_URL", "https://api.anthropic.com")
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    openai_model: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    openai_base_url: str = os.getenv("OPENAI_BASE_URL", "https://api.openai.com")
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
    gemini_model: str = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
    sarvam_api_key: str = os.getenv("SARVAM_API_KEY", "")
    sarvam_model: str = os.getenv("SARVAM_MODEL", "sarvam-1")
    sarvam_base_url: str = os.getenv("SARVAM_BASE_URL", "https://api.sarvam.ai")
    provider_priority: list[str] = field(
        default_factory=lambda: [
            p.strip().lower()
            for p in os.getenv("PROVIDER_PRIORITY", "openai,gemini,anthropic,sarvam").split(",")
            if p.strip()
        ]
    )
    cors_origins: list[str] = field(
        default_factory=lambda: [
            o.strip()
            for o in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
            if o.strip()
        ]
    )
    max_prompt_chars: int = int(os.getenv("MAX_PROMPT_CHARS", "4000"))
    max_run_history: int = int(os.getenv("MAX_RUN_HISTORY", "50"))

    # --- Security hardening (frontend/backend are separate services;
    # this API is the only thing that ever sees ANTHROPIC_API_KEY) ---
    trusted_hosts: list[str] = field(
        default_factory=lambda: [
            h.strip()
            for h in os.getenv("TRUSTED_HOSTS", "*").split(",")
            if h.strip()
        ]
    )
    rate_limit_requests: int = int(os.getenv("RATE_LIMIT_REQUESTS", "20"))
    rate_limit_window_seconds: int = int(os.getenv("RATE_LIMIT_WINDOW_SECONDS", "60"))
    docs_enabled: bool = os.getenv("DOCS_ENABLED", "true").lower() == "true"
    environment: str = os.getenv("ENVIRONMENT", "development")

    @property
    def live_provider_configured(self) -> bool:
        """Whether any provider key is present. If not, we run in Demo Mode
        rather than pretending to call a live model (NFR-04 / FR-28 / Section 16)."""
        return bool(
            self.anthropic_api_key
            or self.openai_api_key
            or self.gemini_api_key
            or self.sarvam_api_key
        )

    @property
    def live_providers(self) -> list[str]:
        """Names of providers that have a key configured, in priority order."""
        return [name for name in self.provider_priority if getattr(self, f"{name}_api_key")]


settings = Settings()
