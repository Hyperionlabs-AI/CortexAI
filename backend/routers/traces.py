import json
from typing import Optional

import aiosqlite
from fastapi import APIRouter, Depends, HTTPException

from database import get_db
from models import TraceDetailResponse, TraceRow, TracesListResponse, SpanOut, ScoreOut

router = APIRouter(prefix="/traces", tags=["traces"])


@router.get("", response_model=TracesListResponse)
async def list_traces(
    page: int = 1,
    per_page: int = 50,
    model: Optional[str] = None,
    provider: Optional[str] = None,
    status: Optional[str] = None,
    app_name: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    pii_flagged: Optional[bool] = None,
    db: aiosqlite.Connection = Depends(get_db),
):
    conditions = []
    params: list = []

    if model:
        conditions.append("model = ?")
        params.append(model)
    if provider:
        conditions.append("provider = ?")
        params.append(provider)
    if status:
        conditions.append("status = ?")
        params.append(status)
    if app_name:
        conditions.append("app_name = ?")
        params.append(app_name)
    if date_from:
        conditions.append("created_at >= ?")
        params.append(date_from)
    if date_to:
        conditions.append("created_at <= ?")
        params.append(date_to)
    if pii_flagged is not None:
        conditions.append("pii_flagged = ?")
        params.append(int(pii_flagged))

    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""

    count_cur = await db.execute(f"SELECT COUNT(*) FROM traces {where}", params)
    total = (await count_cur.fetchone())[0]

    offset = (page - 1) * per_page
    cur = await db.execute(
        f"""SELECT id, model, provider, status, user_id, app_name,
                   cost_usd, duration_ms, total_tokens, pii_flagged, created_at, input_text
            FROM traces {where}
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?""",
        [*params, per_page, offset],
    )

    items = [
        TraceRow(
            id=r[0], model=r[1], provider=r[2], status=r[3],
            user_id=r[4], app_name=r[5], cost_usd=r[6], duration_ms=r[7],
            total_tokens=r[8], pii_flagged=bool(r[9]), created_at=r[10],
            input_preview=(r[11][:80] + "…") if r[11] and len(r[11]) > 80 else r[11],
        )
        for r in await cur.fetchall()
    ]

    return TracesListResponse(items=items, total=total, page=page, per_page=per_page)


@router.get("/{trace_id}", response_model=TraceDetailResponse)
async def get_trace(trace_id: str, db: aiosqlite.Connection = Depends(get_db)):
    cur = await db.execute("SELECT * FROM traces WHERE id = ?", (trace_id,))
    row = await cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Trace not found.")

    sc = await db.execute(
        "SELECT * FROM spans WHERE trace_id = ? ORDER BY start_time", (trace_id,)
    )
    spans = [
        SpanOut(
            id=s["id"], trace_id=s["trace_id"], parent_span_id=s["parent_span_id"],
            name=s["name"], span_type=s["span_type"], input_text=s["input_text"],
            output_text=s["output_text"], model=s["model"],
            prompt_tokens=s["prompt_tokens"] or 0, completion_tokens=s["completion_tokens"] or 0,
            cost_usd=s["cost_usd"] or 0.0, start_time=s["start_time"], end_time=s["end_time"],
            duration_ms=s["duration_ms"], status=s["status"] or "success",
            metadata=json.loads(s["metadata"] or "{}"),
        )
        for s in await sc.fetchall()
    ]

    sc2 = await db.execute(
        "SELECT * FROM scores WHERE trace_id = ? ORDER BY created_at", (trace_id,)
    )
    scores = [
        ScoreOut(
            id=s["id"], trace_id=s["trace_id"], span_id=s["span_id"],
            name=s["name"], value=s["value"], comment=s["comment"],
            source=s["source"] or "auto", created_at=s["created_at"],
        )
        for s in await sc2.fetchall()
    ]

    return TraceDetailResponse(
        id=row["id"], session_id=row["session_id"], user_id=row["user_id"],
        app_name=row["app_name"], environment=row["environment"] or "production",
        model=row["model"], provider=row["provider"], status=row["status"],
        input_text=row["input_text"], output_text=row["output_text"],
        prompt_tokens=row["prompt_tokens"] or 0, completion_tokens=row["completion_tokens"] or 0,
        total_tokens=row["total_tokens"] or 0, cost_usd=row["cost_usd"] or 0.0,
        duration_ms=row["duration_ms"] or 0, ttft_ms=row["ttft_ms"],
        tags=json.loads(row["tags"] or "{}"), pii_flagged=bool(row["pii_flagged"]),
        created_at=row["created_at"], spans=spans, scores=scores,
    )


@router.delete("/{trace_id}", status_code=204)
async def delete_trace(trace_id: str, db: aiosqlite.Connection = Depends(get_db)):
    cur = await db.execute("SELECT id FROM traces WHERE id = ?", (trace_id,))
    if not await cur.fetchone():
        raise HTTPException(status_code=404, detail="Trace not found.")
    await db.execute("DELETE FROM scores WHERE trace_id = ?", (trace_id,))
    await db.execute("DELETE FROM spans WHERE trace_id = ?", (trace_id,))
    await db.execute("DELETE FROM traces WHERE id = ?", (trace_id,))
    await db.commit()
