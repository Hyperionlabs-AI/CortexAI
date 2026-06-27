import json

import aiosqlite
from fastapi import APIRouter, Depends, HTTPException

from database import get_db
from models import PromptListItem, PromptVersion

router = APIRouter(prefix="/prompts", tags=["prompts"])


@router.get("", response_model=list[PromptListItem])
async def list_prompts(db: aiosqlite.Connection = Depends(get_db)):
    cur = await db.execute(
        """SELECT name, MAX(version) AS latest_version,
                  COALESCE((SELECT p2.version FROM prompts p2
                             WHERE p2.name=p.name AND p2.is_active=1 LIMIT 1), 0) AS active_version,
                  MIN(created_at) AS created_at
           FROM prompts p GROUP BY name ORDER BY name"""
    )
    rows = await cur.fetchall()
    return [
        PromptListItem(
            name=r["name"],
            latest_version=r["latest_version"],
            active_version=r["active_version"],
            created_at=r["created_at"],
        )
        for r in rows
    ]


@router.get("/{name}", response_model=list[PromptVersion])
async def get_prompt_versions(name: str, db: aiosqlite.Connection = Depends(get_db)):
    cur = await db.execute(
        "SELECT * FROM prompts WHERE name=? ORDER BY version DESC", (name,)
    )
    rows = await cur.fetchall()
    if not rows:
        raise HTTPException(status_code=404, detail=f"Prompt '{name}' not found")
    return [
        PromptVersion(
            id=r["id"],
            name=r["name"],
            version=r["version"],
            content=r["content"],
            variables=json.loads(r["variables"] or "[]"),
            tags=json.loads(r["tags"] or "[]"),
            is_active=bool(r["is_active"]),
            created_at=r["created_at"],
        )
        for r in rows
    ]
