import json

import aiosqlite
from fastapi import APIRouter, Depends, HTTPException

from database import get_db
from models import AlertEvent, AlertRule

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("", response_model=list[AlertRule])
async def list_alert_rules(db: aiosqlite.Connection = Depends(get_db)):
    cur = await db.execute("SELECT * FROM alert_rules ORDER BY name")
    rows = await cur.fetchall()
    return [
        AlertRule(
            id=r["id"], name=r["name"], metric=r["metric"],
            condition=r["condition"], threshold=r["threshold"],
            window_minutes=r["window_minutes"],
            channels=json.loads(r["channels"] or "[]"),
            webhook_url=r["webhook_url"], enabled=bool(r["enabled"]),
            created_at=r["created_at"],
        )
        for r in rows
    ]


@router.get("/events", response_model=list[AlertEvent])
async def list_alert_events(
    limit: int = 50,
    db: aiosqlite.Connection = Depends(get_db),
):
    cur = await db.execute(
        """SELECT ae.*, ar.name AS rule_name, ar.metric
           FROM alert_events ae JOIN alert_rules ar ON ae.rule_id = ar.id
           ORDER BY ae.triggered_at DESC LIMIT ?""",
        (limit,),
    )
    rows = await cur.fetchall()
    return [
        AlertEvent(
            id=r["id"], rule_id=r["rule_id"], rule_name=r["rule_name"],
            metric=r["metric"], metric_value=r["metric_value"],
            triggered_at=r["triggered_at"], resolved_at=r["resolved_at"],
        )
        for r in rows
    ]


@router.put("/{rule_id}/toggle", response_model=AlertRule)
async def toggle_alert_rule(rule_id: str, db: aiosqlite.Connection = Depends(get_db)):
    cur = await db.execute("SELECT enabled FROM alert_rules WHERE id=?", (rule_id,))
    row = await cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Rule not found")
    new_enabled = 0 if row["enabled"] else 1
    await db.execute("UPDATE alert_rules SET enabled=? WHERE id=?", (new_enabled, rule_id))
    await db.commit()
    cur2 = await db.execute("SELECT * FROM alert_rules WHERE id=?", (rule_id,))
    r = await cur2.fetchone()
    return AlertRule(
        id=r["id"], name=r["name"], metric=r["metric"],
        condition=r["condition"], threshold=r["threshold"],
        window_minutes=r["window_minutes"],
        channels=json.loads(r["channels"] or "[]"),
        webhook_url=r["webhook_url"], enabled=bool(r["enabled"]),
        created_at=r["created_at"],
    )
