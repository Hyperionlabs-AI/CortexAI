import os
import aiosqlite
from pathlib import Path

DB_PATH = Path(os.getenv("AIOBS_DB_PATH", str(Path(__file__).parent / "aiobs.db")))

_SCHEMA = """
CREATE TABLE IF NOT EXISTS traces (
    id                TEXT PRIMARY KEY,
    session_id        TEXT,
    user_id           TEXT,
    app_name          TEXT,
    environment       TEXT DEFAULT 'production',
    model             TEXT NOT NULL,
    provider          TEXT NOT NULL,
    status            TEXT NOT NULL,
    input_text        TEXT,
    output_text       TEXT,
    prompt_tokens     INTEGER DEFAULT 0,
    completion_tokens INTEGER DEFAULT 0,
    total_tokens      INTEGER DEFAULT 0,
    cost_usd          REAL DEFAULT 0.0,
    duration_ms       INTEGER DEFAULT 0,
    ttft_ms           INTEGER,
    tags              TEXT DEFAULT '{}',
    pii_flagged       INTEGER DEFAULT 0,
    created_at        TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS spans (
    id                TEXT PRIMARY KEY,
    trace_id          TEXT NOT NULL REFERENCES traces(id),
    parent_span_id    TEXT,
    name              TEXT NOT NULL,
    span_type         TEXT NOT NULL,
    input_text        TEXT,
    output_text       TEXT,
    model             TEXT,
    prompt_tokens     INTEGER DEFAULT 0,
    completion_tokens INTEGER DEFAULT 0,
    cost_usd          REAL DEFAULT 0.0,
    start_time        TEXT NOT NULL,
    end_time          TEXT,
    duration_ms       INTEGER,
    status            TEXT DEFAULT 'success',
    metadata          TEXT DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS scores (
    id         TEXT PRIMARY KEY,
    trace_id   TEXT NOT NULL REFERENCES traces(id),
    span_id    TEXT REFERENCES spans(id),
    name       TEXT NOT NULL,
    value      REAL NOT NULL,
    comment    TEXT,
    source     TEXT DEFAULT 'auto',
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS prompts (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    version    INTEGER NOT NULL,
    content    TEXT NOT NULL,
    variables  TEXT DEFAULT '[]',
    tags       TEXT DEFAULT '[]',
    is_active  INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    UNIQUE(name, version)
);

CREATE TABLE IF NOT EXISTS alert_rules (
    id             TEXT PRIMARY KEY,
    name           TEXT NOT NULL,
    metric         TEXT NOT NULL,
    condition      TEXT NOT NULL,
    threshold      REAL NOT NULL,
    window_minutes INTEGER DEFAULT 5,
    channels       TEXT DEFAULT '[]',
    webhook_url    TEXT,
    enabled        INTEGER DEFAULT 1,
    created_at     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS alert_events (
    id           TEXT PRIMARY KEY,
    rule_id      TEXT NOT NULL REFERENCES alert_rules(id),
    metric_value REAL NOT NULL,
    triggered_at TEXT NOT NULL,
    resolved_at  TEXT
);

CREATE INDEX IF NOT EXISTS idx_traces_created_at ON traces(created_at);
CREATE INDEX IF NOT EXISTS idx_traces_model      ON traces(model);
CREATE INDEX IF NOT EXISTS idx_traces_user_id    ON traces(user_id);
CREATE INDEX IF NOT EXISTS idx_spans_trace_id    ON spans(trace_id);
CREATE INDEX IF NOT EXISTS idx_scores_trace_id   ON scores(trace_id);
"""


async def init_db() -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.executescript(_SCHEMA)
        await db.commit()


async def get_db():
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        yield db
