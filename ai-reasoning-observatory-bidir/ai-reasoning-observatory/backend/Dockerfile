# AI Reasoning Observatory — backend (FastAPI)
#
# Built and deployed as a completely separate service/image from the
# frontend (see ../DEPLOYMENT.md). This container is the only place
# ANTHROPIC_API_KEY ever exists.

FROM python:3.12-slim AS base

WORKDIR /app

# System deps kept minimal on purpose — smaller image, smaller attack surface.
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

# Runs as a non-root user.
RUN useradd --create-home --uid 1000 appuser
USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers"]
