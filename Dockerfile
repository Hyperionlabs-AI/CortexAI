# ── Stage 1: Build the React SPA ──────────────────────────────────────────────
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci --silent

COPY frontend/ ./
# In production the SPA calls /api/* on the same origin — no proxy needed.
RUN npm run build

# ── Stage 2: Python backend + bundled static files ─────────────────────────────
FROM python:3.13-slim AS runtime
WORKDIR /app/backend

# Non-root user for security
RUN addgroup --system aiobs && adduser --system --ingroup aiobs aiobs

COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./

# Copy the built React SPA so FastAPI serves it as static files at "/"
COPY --from=frontend-build /app/frontend/dist /app/frontend/dist

# Persistent volume mount point for the SQLite database
RUN mkdir -p /app/data && chown -R aiobs:aiobs /app/data
ENV AIOBS_DB_PATH=/app/data/aiobs.db

USER aiobs

EXPOSE 8000

# Docker-level healthcheck (separate from the docker-compose one)
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/health')"

# Single worker keeps the in-memory WebSocket ConnectionManager coherent.
# Scale via a load balancer + Redis pub/sub if you ever need multiple instances.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
