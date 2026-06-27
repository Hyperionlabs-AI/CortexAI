import json
import uuid
from datetime import datetime, timezone

import aiosqlite
from fastapi import APIRouter, Depends, HTTPException

from database import get_db
from models import (
    ScoreIn, ScoreIngestResponse,
    SpanIn, SpanIngestResponse,
    TraceIn, TraceIngestResponse,
)
from services.alert_engine import evaluate_rules
from services.cost_calculator import calculate_cost
from services.pii_scanner import scan, redact

router = APIRouter(prefix="/ingest", tags=["ingest"])


@router.post("/trace", response_model=TraceIngestResponse, status_code=201)
async def ingest_trace(body: TraceIn, db: aiosqlite.Connection = Depends(get_db)):
    pii_flagged = scan(body.input_text) or scan(body.output_text)
    input_text  = redact(body.input_text)  if pii_flagged else body.input_text
    output_text = redact(body.output_text) if pii_flagged else body.output_text

    cost_usd     = calculate_cost(body.model, body.prompt_tokens, body.completion_tokens)
    total_tokens = body.prompt_tokens + body.completion_tokens

    try:
        await db.execute(
            """INSERT INTO traces (
                id, session_id, user_id, app_name, environment, model, provider,
                status, input_text, output_text, prompt_tokens, completion_tokens,
                total_tokens, cost_usd, duration_ms, ttft_ms, tags, pii_flagged, created_at
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                body.id, body.session_id, body.user_id, body.app_name,
                body.environment, body.model, body.provider, body.status,
                input_text, output_text, body.prompt_tokens, body.completion_tokens,
                total_tokens, cost_usd, body.duration_ms, body.ttft_ms,
                json.dumps(body.tags), int(pii_flagged), body.created_at,
            ),
        )
        await db.commit()
    except aiosqlite.IntegrityError:
        raise HTTPException(status_code=409, detail=f"Trace '{body.id}' already exists.")

    # Broadcast to WebSocket clients and evaluate alert rules (import deferred to avoid circular import at module load)
    from routers.ws import manager
    await manager.broadcast({
        "type": "trace",
        "data": {
            "id": body.id, "model": body.model, "provider": body.provider,
            "status": body.status, "user_id": body.user_id, "app_name": body.app_name,
            "cost_usd": cost_usd, "duration_ms": body.duration_ms,
            "total_tokens": total_tokens, "pii_flagged": pii_flagged,
            "created_at": body.created_at,
            "input_preview": (input_text[:80] + "…") if input_text and len(input_text) > 80 else input_text,
        },
    })
    await evaluate_rules(db)

    return TraceIngestResponse(trace_id=body.id)


@router.post("/span", response_model=SpanIngestResponse, status_code=201)
async def ingest_span(body: SpanIn, db: aiosqlite.Connection = Depends(get_db)):
    cost_usd = 0.0
    if body.model:
        cost_usd = calculate_cost(body.model, body.prompt_tokens, body.completion_tokens)

    duration_ms: int | None = None
    if body.start_time and body.end_time:
        try:
            start = datetime.fromisoformat(body.start_time.replace("Z", "+00:00"))
            end   = datetime.fromisoformat(body.end_time.replace("Z", "+00:00"))
            duration_ms = int((end - start).total_seconds() * 1000)
        except ValueError:
            pass

    try:
        await db.execute(
            """INSERT INTO spans (
                id, trace_id, parent_span_id, name, span_type, input_text, output_text,
                model, prompt_tokens, completion_tokens, cost_usd,
                start_time, end_time, duration_ms, status, metadata
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                body.id, body.trace_id, body.parent_span_id, body.name, body.span_type,
                body.input_text, body.output_text, body.model,
                body.prompt_tokens, body.completion_tokens, cost_usd,
                body.start_time, body.end_time, duration_ms,
                "success", json.dumps(body.metadata),
            ),
        )
        await db.commit()
    except aiosqlite.IntegrityError:
        raise HTTPException(status_code=409, detail=f"Span '{body.id}' already exists.")

    return SpanIngestResponse(span_id=body.id)


@router.post("/score", response_model=ScoreIngestResponse, status_code=201)
async def ingest_score(body: ScoreIn, db: aiosqlite.Connection = Depends(get_db)):
    score_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    await db.execute(
        """INSERT INTO scores (id, trace_id, span_id, name, value, comment, source, created_at)
           VALUES (?,?,?,?,?,?,?,?)""",
        (score_id, body.trace_id, body.span_id, body.name, body.value,
         body.comment, body.source, now),
    )
    await db.commit()
    return ScoreIngestResponse(score_id=score_id)
