# AI Reasoning Observatory — frontend (Next.js)
#
# Built and deployed as a completely separate service/image from the
# backend (see ../DEPLOYMENT.md). This image never contains
# ANTHROPIC_API_KEY — it only ever talks to the backend's public HTTP
# routes via NEXT_PUBLIC_API_BASE_URL, which is safe to ship to the
# browser because it is just a URL, not a credential.

# --- deps -------------------------------------------------------------
FROM node:20-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# --- build --------------------------------------------------------------
FROM node:20-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}
RUN npm run build

# --- run ------------------------------------------------------------
FROM node:20-slim AS run
WORKDIR /app
ENV NODE_ENV=production
RUN useradd --create-home --uid 1000 appuser

COPY --from=build /app/public ./public
COPY --from=build --chown=appuser:appuser /app/.next/standalone ./
COPY --from=build --chown=appuser:appuser /app/.next/static ./.next/static

USER appuser
EXPOSE 3000
ENV PORT=3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "fetch('http://localhost:3000').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
