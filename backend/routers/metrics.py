from datetime import datetime, timedelta, timezone
from typing import Optional

import aiosqlite
from fastapi import APIRouter, Depends

from database import get_db
from models import CostPoint, MetricsSummaryResponse, ModelStat, VolumePoint

router = APIRouter(prefix="/metrics", tags=["metrics"])

_FMT = "%Y-%m-%dT%H:%M:%SZ"


def _parse_dt(s: str) -> datetime:
    for fmt in ("%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M:%S.%fZ"):
        try:
            return datetime.strptime(s, fmt).replace(tzinfo=timezone.utc)
        except ValueError:
            pass
    return datetime.fromisoformat(s)


def _delta(curr: float, prev: float) -> float:
    if prev == 0:
        return 0.0
    return round((curr - prev) / prev * 100, 1)


@router.get("/summary", response_model=MetricsSummaryResponse)
async def metrics_summary(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    db: aiosqlite.Connection = Depends(get_db),
):
    now = datetime.now(timezone.utc)
    dt_to = _parse_dt(date_to) if date_to else now
    dt_from = _parse_dt(date_from) if date_from else now - timedelta(hours=24)
    duration = dt_to - dt_from
    prev_from = dt_from - duration
    prev_to = dt_from

    iso_from = dt_from.strftime(_FMT)
    iso_to   = dt_to.strftime(_FMT)
    iso_prev_from = prev_from.strftime(_FMT)
    iso_prev_to   = prev_to.strftime(_FMT)

    # ── current period core stats ────────────────────────────────────────────
    cur = await db.execute(
        """SELECT
               COUNT(*)                                          AS total,
               COALESCE(SUM(cost_usd), 0)                       AS total_cost,
               COUNT(DISTINCT user_id)                          AS active_users,
               SUM(CASE WHEN pii_flagged=1 THEN 1 ELSE 0 END)  AS pii_events,
               SUM(CASE WHEN status!='success' THEN 1 ELSE 0 END) AS errors,
               SUM(CASE WHEN json_extract(tags,'$.security_event')='1' THEN 1 ELSE 0 END) AS security_events
           FROM traces WHERE created_at >= ? AND created_at <= ?""",
        (iso_from, iso_to),
    )
    row = dict(await cur.fetchone())
    total        = row["total"] or 0
    total_cost   = row["total_cost"] or 0.0
    active_users = row["active_users"] or 0
    pii_events   = row["pii_events"] or 0
    errors       = row["errors"] or 0
    security_ev  = row["security_events"] or 0
    error_rate   = round(errors / total * 100, 1) if total else 0.0

    # ── p95 latency ──────────────────────────────────────────────────────────
    dur_cur = await db.execute(
        "SELECT duration_ms FROM traces WHERE created_at >= ? AND created_at <= ? AND duration_ms > 0 ORDER BY duration_ms",
        (iso_from, iso_to),
    )
    durations = [r[0] for r in await dur_cur.fetchall()]
    p95 = durations[int(len(durations) * 0.95)] if durations else 0

    # ── quality / safety scores ──────────────────────────────────────────────
    sc_cur = await db.execute(
        """SELECT s.name, AVG(s.value) AS avg_val
           FROM scores s JOIN traces t ON s.trace_id = t.id
           WHERE t.created_at >= ? AND t.created_at <= ?
           GROUP BY s.name""",
        (iso_from, iso_to),
    )
    sc = {r[0]: r[1] for r in await sc_cur.fetchall()}

    avg_quality    = round(sc.get("relevance", 0) or 0, 3)
    avg_hall       = sc.get("hallucination", 1.0) or 1.0
    hall_rate      = round((1.0 - avg_hall) * 100, 1)
    avg_toxicity   = round(sc.get("toxicity", 0) or 0, 3)
    avg_risk       = round(sc.get("risk_score", 0) or 0, 3)

    hr_cur = await db.execute(
        """SELECT COUNT(DISTINCT s.trace_id) FROM scores s
           JOIN traces t ON s.trace_id = t.id
           WHERE s.name='risk_score' AND s.value > 0.7
             AND t.created_at >= ? AND t.created_at <= ?""",
        (iso_from, iso_to),
    )
    high_risk_count = (await hr_cur.fetchone())[0] or 0

    # ── previous period for deltas ───────────────────────────────────────────
    prev_cur = await db.execute(
        """SELECT COUNT(*) AS total, COALESCE(SUM(cost_usd),0) AS cost,
                  SUM(CASE WHEN status!='success' THEN 1 ELSE 0 END) AS errors
           FROM traces WHERE created_at >= ? AND created_at <= ?""",
        (iso_prev_from, iso_prev_to),
    )
    pr = dict(await prev_cur.fetchone())
    prev_total      = pr["total"] or 0
    prev_cost       = pr["cost"] or 0.0
    prev_errors     = pr["errors"] or 0
    prev_error_rate = round(prev_errors / prev_total * 100, 1) if prev_total else 0.0

    prev_dur_cur = await db.execute(
        "SELECT duration_ms FROM traces WHERE created_at >= ? AND created_at <= ? AND duration_ms > 0 ORDER BY duration_ms",
        (iso_prev_from, iso_prev_to),
    )
    prev_durs = [r[0] for r in await prev_dur_cur.fetchall()]
    prev_p95 = prev_durs[int(len(prev_durs) * 0.95)] if prev_durs else 0

    prev_sc_cur = await db.execute(
        """SELECT s.name, AVG(s.value) AS avg_val FROM scores s
           JOIN traces t ON s.trace_id = t.id
           WHERE t.created_at >= ? AND t.created_at <= ? GROUP BY s.name""",
        (iso_prev_from, iso_prev_to),
    )
    prev_sc = {r[0]: r[1] for r in await prev_sc_cur.fetchall()}
    prev_quality = prev_sc.get("relevance", 0) or 0

    return MetricsSummaryResponse(
        total_requests=total,
        requests_delta_pct=_delta(total, prev_total),
        total_cost_usd=round(total_cost, 4),
        cost_delta_pct=_delta(total_cost, prev_cost),
        p95_latency_ms=p95,
        latency_delta_pct=_delta(p95, prev_p95),
        error_rate_pct=error_rate,
        error_delta_pct=_delta(error_rate, prev_error_rate),
        avg_quality_score=avg_quality,
        quality_delta_pct=_delta(avg_quality, prev_quality),
        hallucination_rate_pct=hall_rate,
        avg_toxicity=avg_toxicity,
        avg_risk_score=avg_risk,
        high_risk_count=high_risk_count,
        security_events=security_ev,
        pii_events=pii_events,
        active_users=active_users,
    )


@router.get("/volume", response_model=list[VolumePoint])
async def metrics_volume(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    interval: str = "day",
    db: aiosqlite.Connection = Depends(get_db),
):
    now = datetime.now(timezone.utc)
    dt_to = _parse_dt(date_to) if date_to else now
    dt_from = _parse_dt(date_from) if date_from else now - timedelta(days=7)

    fmt = "%Y-%m-%d" if interval == "day" else "%Y-%m-%dT%H:00:00Z"
    trunc = "date(created_at)" if interval == "day" else "strftime('%Y-%m-%dT%H:00:00Z', created_at)"

    cur = await db.execute(
        f"""SELECT {trunc} AS ts,
                   COUNT(*) AS requests,
                   SUM(CASE WHEN status!='success' THEN 1 ELSE 0 END) AS errors
            FROM traces WHERE created_at >= ? AND created_at <= ?
            GROUP BY ts ORDER BY ts""",
        (dt_from.strftime(_FMT), dt_to.strftime(_FMT)),
    )
    return [
        VolumePoint(timestamp=r[0], requests=r[1], errors=r[2])
        for r in await cur.fetchall()
    ]


@router.get("/models", response_model=list[ModelStat])
async def metrics_models(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    db: aiosqlite.Connection = Depends(get_db),
):
    now = datetime.now(timezone.utc)
    dt_to = _parse_dt(date_to) if date_to else now
    dt_from = _parse_dt(date_from) if date_from else now - timedelta(days=7)

    cur = await db.execute(
        """SELECT model, provider,
                  COUNT(*) AS requests,
                  COALESCE(SUM(cost_usd), 0) AS cost_usd,
                  CAST(COALESCE(AVG(duration_ms), 0) AS INTEGER) AS avg_latency_ms,
                  ROUND(SUM(CASE WHEN status!='success' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) AS error_rate_pct
           FROM traces WHERE created_at >= ? AND created_at <= ?
           GROUP BY model, provider ORDER BY requests DESC""",
        (dt_from.strftime(_FMT), dt_to.strftime(_FMT)),
    )
    return [
        ModelStat(
            model=r[0], provider=r[1], requests=r[2],
            cost_usd=round(r[3], 4), avg_latency_ms=r[4], error_rate_pct=r[5],
        )
        for r in await cur.fetchall()
    ]


@router.get("/cost", response_model=list[CostPoint])
async def metrics_cost(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    db: aiosqlite.Connection = Depends(get_db),
):
    now = datetime.now(timezone.utc)
    dt_to = _parse_dt(date_to) if date_to else now
    dt_from = _parse_dt(date_from) if date_from else now - timedelta(days=7)

    cur = await db.execute(
        """SELECT date(created_at) AS ts,
                  model,
                  ROUND(SUM(cost_usd), 6) AS cost_usd,
                  SUM(total_tokens) AS tokens
           FROM traces WHERE created_at >= ? AND created_at <= ?
           GROUP BY ts, model ORDER BY ts, model""",
        (dt_from.strftime(_FMT), dt_to.strftime(_FMT)),
    )
    return [
        CostPoint(timestamp=r[0], model=r[1], cost_usd=r[2], tokens=r[3])
        for r in await cur.fetchall()
    ]
