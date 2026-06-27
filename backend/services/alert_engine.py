import uuid
from datetime import datetime, timedelta, timezone

import aiosqlite

_FMT = "%Y-%m-%dT%H:%M:%SZ"
_OPS = {
    "gt":  lambda v, t: v > t,
    "lt":  lambda v, t: v < t,
    "gte": lambda v, t: v >= t,
    "lte": lambda v, t: v <= t,
}


async def _metric_value(metric: str, window_minutes: int, db: aiosqlite.Connection) -> float:
    now = datetime.now(timezone.utc)
    since = (now - timedelta(minutes=window_minutes)).strftime(_FMT)
    until = now.strftime(_FMT)

    if metric == "error_rate":
        cur = await db.execute(
            "SELECT COUNT(*), SUM(CASE WHEN status!='success' THEN 1 ELSE 0 END) "
            "FROM traces WHERE created_at >= ? AND created_at <= ?",
            (since, until),
        )
        row = await cur.fetchone()
        total, errors = (row[0] or 0), (row[1] or 0)
        return round(errors / total * 100, 2) if total else 0.0

    if metric == "cost_usd":
        cur = await db.execute(
            "SELECT COALESCE(SUM(cost_usd), 0) FROM traces WHERE created_at >= ? AND created_at <= ?",
            (since, until),
        )
        return float((await cur.fetchone())[0] or 0)

    if metric == "p95_latency":
        cur = await db.execute(
            "SELECT duration_ms FROM traces "
            "WHERE created_at >= ? AND created_at <= ? AND duration_ms > 0 ORDER BY duration_ms",
            (since, until),
        )
        durations = [r[0] for r in await cur.fetchall()]
        return float(durations[int(len(durations) * 0.95)]) if durations else 0.0

    if metric == "quality_score":
        cur = await db.execute(
            "SELECT AVG(s.value) FROM scores s JOIN traces t ON s.trace_id=t.id "
            "WHERE s.name='relevance' AND t.created_at >= ? AND t.created_at <= ?",
            (since, until),
        )
        val = (await cur.fetchone())[0]
        return round(float(val), 4) if val else 0.0

    return 0.0


async def evaluate_rules(db: aiosqlite.Connection) -> None:
    cur = await db.execute("SELECT * FROM alert_rules WHERE enabled=1")
    rules = await cur.fetchall()

    for rule in rules:
        fn = _OPS.get(rule["condition"])
        if not fn:
            continue

        value = await _metric_value(rule["metric"], rule["window_minutes"], db)
        if not fn(value, rule["threshold"]):
            continue

        event_id = str(uuid.uuid4())
        now_iso = datetime.now(timezone.utc).strftime(_FMT)
        await db.execute(
            "INSERT INTO alert_events (id, rule_id, metric_value, triggered_at) VALUES (?,?,?,?)",
            (event_id, rule["id"], value, now_iso),
        )
        await db.commit()

        if rule["webhook_url"]:
            try:
                import httpx
                async with httpx.AsyncClient() as client:
                    await client.post(
                        rule["webhook_url"],
                        json={
                            "rule_id": rule["id"], "rule_name": rule["name"],
                            "metric": rule["metric"], "value": value, "triggered_at": now_iso,
                        },
                        timeout=5.0,
                    )
            except Exception:
                pass
