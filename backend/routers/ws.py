import json
from typing import List

import aiosqlite
from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect

from database import get_db

router = APIRouter(tags=["websocket"])


class ConnectionManager:
    def __init__(self) -> None:
        self._connections: List[WebSocket] = []

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        self._connections.append(ws)

    def disconnect(self, ws: WebSocket) -> None:
        try:
            self._connections.remove(ws)
        except ValueError:
            pass

    async def broadcast(self, data: dict) -> None:
        if not self._connections:
            return
        payload = json.dumps(data)
        dead: List[WebSocket] = []
        for ws in list(self._connections):
            try:
                await ws.send_text(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)


manager = ConnectionManager()


@router.websocket("/ws/live-feed")
async def live_feed(ws: WebSocket, db: aiosqlite.Connection = Depends(get_db)):
    await manager.connect(ws)
    try:
        cur = await db.execute(
            """SELECT id, model, provider, status, user_id, app_name,
                      cost_usd, duration_ms, total_tokens, pii_flagged, created_at, input_text
               FROM traces ORDER BY created_at DESC LIMIT 20"""
        )
        rows = await cur.fetchall()
        initial = [
            {
                "id": r[0], "model": r[1], "provider": r[2], "status": r[3],
                "user_id": r[4], "app_name": r[5], "cost_usd": r[6],
                "duration_ms": r[7], "total_tokens": r[8], "pii_flagged": bool(r[9]),
                "created_at": r[10],
                "input_preview": (r[11][:80] + "…") if r[11] and len(r[11]) > 80 else r[11],
            }
            for r in rows
        ]
        await ws.send_text(json.dumps({"type": "init", "data": initial}))

        while True:
            await ws.receive_text()

    except WebSocketDisconnect:
        manager.disconnect(ws)
