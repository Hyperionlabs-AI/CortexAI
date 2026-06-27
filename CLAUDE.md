# CLAUDE.md — AI Observability Dashboard (AIOBS)

This file is the single source of truth for building AIOBS. Read it fully before writing
any code. Every architectural and design decision is specified here — follow them exactly.

---

## Project Overview

**AIOBS** is a production-grade AI observability and monitoring dashboard. It lets engineering
teams track every LLM call, agent step, cost, quality score, and policy violation across
their AI applications — in real time, from a single dark-themed web interface.

**Comparable products (for reference only — do not copy their code):**
Langfuse, Helicone, Arize Phoenix, Braintrust.

**What makes AIOBS different:**
- Single platform: traces + cost + quality + guardrails in one UI, no bolt-ons
- Self-hostable: runs fully on localhost with zero cloud dependency
- Beautiful: dark-themed, chart-rich, pixel-perfect dashboard — not a generic admin panel

---

## Tech Stack — Non-Negotiable

| Layer | Technology | Why |
|---|---|---|
| Frontend | React 18 + TypeScript | Type-safe, component-based SPA |
| Styling | Tailwind CSS v3 + shadcn/ui | Pre-built accessible components, easy dark theme |
| Charts | Recharts 2.x | Lightweight, React-native, composable |
| Frontend routing | React Router v6 | SPA navigation |
| Frontend state | React Query (TanStack Query v5) | Server state, auto-refresh, caching |
| Backend | Python FastAPI | Async, fast, Pydantic models |
| Database | SQLite via `aiosqlite` + `sqlite3` | Zero-config local storage; schema designed to migrate to ClickHouse later |
| Real-time | FastAPI WebSockets | Live trace feed on dashboard |
| Package manager (FE) | npm | Standard |
| Package manager (BE) | pip + `requirements.txt` | Consistent with sibling projects |

**Do not** substitute these choices (e.g., do not use Streamlit, do not use Vue, do not use
MongoDB). The stack above is final.

---

## Repository Structure

Create this exact directory layout:

```
AIOBS/
├── CLAUDE.md                        ← this file
├── README.md                        ← setup instructions (create last)
├── Dockerfile                       ← multi-stage build (frontend → Python runtime)
├── docker-compose.yml               ← single-service compose with named volume
├── .dockerignore                    ← excludes node_modules, __pycache__, local DB
│
├── backend/                         ← FastAPI server
│   ├── main.py                      ← app entrypoint, router registration
│   ├── database.py                  ← SQLite connection, table creation
│   ├── models.py                    ← Pydantic request/response models
│   ├── requirements.txt
│   │
│   ├── routers/
│   │   ├── ingest.py                ← POST /ingest/trace, /ingest/span, /ingest/score
│   │   ├── traces.py                ← GET /traces, GET /traces/{id}
│   │   ├── metrics.py               ← GET /metrics/summary, /cost, /latency, /quality, /volume
│   │   ├── prompts.py               ← CRUD /prompts
│   │   ├── alerts.py                ← CRUD /alerts, GET /alerts/events
│   │   └── ws.py                    ← WebSocket /ws/live-feed
│   │
│   └── services/
│       ├── cost_calculator.py       ← token → USD conversion per model
│       ├── pii_scanner.py           ← regex-based PII detection
│       └── alert_engine.py          ← evaluates alert rules on new traces
│
├── frontend/                        ← React SPA
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   ├── index.html
│   │
│   └── src/
│       ├── main.tsx
│       ├── App.tsx                  ← router, layout shell
│       ├── api/
│       │   └── client.ts            ← axios instance, typed API functions
│       ├── types/
│       │   └── index.ts             ← all TypeScript interfaces
│       ├── hooks/
│       │   ├── useMetrics.ts
│       │   ├── useTraces.ts
│       │   └── useLiveFeed.ts       ← WebSocket hook
│       ├── components/
│       │   ├── layout/
│       │   │   ├── Sidebar.tsx
│       │   │   ├── TopBar.tsx
│       │   │   └── PageShell.tsx
│       │   ├── ui/                  ← shadcn/ui primitives (Badge, Card, Button, etc.)
│       │   ├── charts/
│       │   │   ├── CostAreaChart.tsx
│       │   │   ├── LatencyChart.tsx
│       │   │   ├── VolumeBarChart.tsx
│       │   │   ├── QualityGauge.tsx
│       │   │   ├── ModelPieChart.tsx
│       │   │   └── SparkLine.tsx
│       │   └── traces/
│       │       ├── TraceRow.tsx
│       │       ├── TraceFilters.tsx
│       │       ├── SpanTree.tsx
│       │       └── SpanNode.tsx
│       └── pages/
│           ├── Overview.tsx
│           ├── Traces.tsx
│           ├── TraceDetail.tsx
│           ├── Cost.tsx
│           ├── Quality.tsx
│           ├── Prompts.tsx
│           ├── Alerts.tsx
│           └── Settings.tsx
│
└── sdk/                             ← Python instrumentation SDK  ✅ built
    ├── aiobs_sdk/
    │   ├── __init__.py
    │   ├── client.py                ← AIOBSClient class
    │   ├── tracer.py                ← trace_llm() context manager
    │   └── integrations/
    │       ├── openai_patch.py      ← monkey-patch openai.chat.completions.create
    │       └── anthropic_patch.py   ← monkey-patch anthropic.messages.create
    └── setup.py
```

---

## Design System — Follow Exactly

### Color Palette

```css
/* Backgrounds */
--bg-base:    #070b14;   /* page background */
--bg-card:    #0d1220;   /* card / panel background */
--bg-raised:  #111827;   /* elevated elements, inputs */
--bg-hover:   #1a2234;   /* hover state */

/* Borders */
--border:     #1e2d42;
--border-light: #263548;

/* Accent colors */
--violet:  #7c3aed;   /* primary brand, sidebar active, CTA buttons */
--cyan:    #06b6d4;   /* links, secondary highlights, latency */
--green:   #22c55e;   /* success, completed status, positive delta */
--orange:  #f97316;   /* warnings, cost metric */
--red:     #ef4444;   /* errors, failed status, negative delta */
--yellow:  #eab308;   /* queued, caution */

/* Text */
--text-primary: #e2e8f0;
--text-secondary: #94a3b8;
--text-muted: #475569;

/* Chart colors (in order) */
--chart-1: #7c3aed;
--chart-2: #06b6d4;
--chart-3: #22c55e;
--chart-4: #f97316;
--chart-5: #a78bfa;
```

### Typography

```
Font family UI:   Inter (Google Fonts)
Font family mono: JetBrains Mono (Google Fonts — for token counts, IDs, latency values)
Base size: 14px
Line height: 1.6
```

### Component Rules

- All cards: `background: var(--bg-card)`, `border: 1px solid var(--border)`, `border-radius: 12px`, `padding: 20px`
- Metric cards: add a 3px top border in the accent color for that metric
- Status badges: pill shape, `border-radius: 9999px`, small padding, use accent bg at 10% opacity with accent text
- All data values in cards (numbers, IDs, latency): use monospace font
- Tables: no outside border, horizontal dividers only, alternating row bg at 3% opacity
- Sidebar: 240px wide, `background: #070b14`, icon + label nav items, active item has `background: rgba(124,58,237,0.12)` left border `3px solid #7c3aed`
- Sidebar sections: Overview, Traces, Cost, Quality, Prompts, Alerts, Settings
- TopBar: 56px tall, shows current page title left, global search center, time range selector + refresh right

### Chart Styling Rules

All Recharts components must use:
- Background: transparent (card provides the bg)
- Grid lines: `stroke="#1e2d42"` (subtle, no clutter)
- Axis labels: `fill="#475569"` (muted)
- Tooltips: dark bg `#111827`, border `#1e2d42`, white text
- No chart borders or outer boxes
- Area charts: use gradient fills with 20% opacity at the bottom, 60% at the top

---

## Data Models

### SQLite Schema — create all tables in `database.py` on startup

```sql
CREATE TABLE IF NOT EXISTS traces (
    id            TEXT PRIMARY KEY,           -- UUID
    session_id    TEXT,
    user_id       TEXT,
    app_name      TEXT,
    environment   TEXT DEFAULT 'production',  -- production | staging | development
    model         TEXT NOT NULL,              -- e.g. "gpt-4o", "claude-sonnet-4-6"
    provider      TEXT NOT NULL,              -- openai | anthropic | google | mistral | other
    status        TEXT NOT NULL,              -- success | error | timeout
    input_text    TEXT,                       -- full prompt (may be redacted if PII flagged)
    output_text   TEXT,                       -- full completion
    prompt_tokens   INTEGER DEFAULT 0,
    completion_tokens INTEGER DEFAULT 0,
    total_tokens  INTEGER DEFAULT 0,
    cost_usd      REAL DEFAULT 0.0,
    duration_ms   INTEGER DEFAULT 0,          -- end-to-end latency
    ttft_ms       INTEGER,                    -- time to first token
    tags          TEXT DEFAULT '{}',          -- JSON string: {"feature": "chat", "version": "v2"}
    pii_flagged   INTEGER DEFAULT 0,          -- 1 if PII detected
    created_at    TEXT NOT NULL               -- ISO8601
);

CREATE TABLE IF NOT EXISTS spans (
    id            TEXT PRIMARY KEY,
    trace_id      TEXT NOT NULL REFERENCES traces(id),
    parent_span_id TEXT,                      -- NULL for root span
    name          TEXT NOT NULL,              -- e.g. "llm_call", "tool:search", "retrieval"
    span_type     TEXT NOT NULL,              -- llm | tool | retrieval | chain | agent
    input_text    TEXT,
    output_text   TEXT,
    model         TEXT,
    prompt_tokens   INTEGER DEFAULT 0,
    completion_tokens INTEGER DEFAULT 0,
    cost_usd      REAL DEFAULT 0.0,
    start_time    TEXT NOT NULL,
    end_time      TEXT,
    duration_ms   INTEGER,
    status        TEXT DEFAULT 'success',
    metadata      TEXT DEFAULT '{}'           -- JSON string
);

CREATE TABLE IF NOT EXISTS scores (
    id            TEXT PRIMARY KEY,
    trace_id      TEXT NOT NULL REFERENCES traces(id),
    span_id       TEXT REFERENCES spans(id),
    name          TEXT NOT NULL,              -- "hallucination", "faithfulness", "relevance", "user_rating"
    value         REAL NOT NULL,              -- 0.0 – 1.0
    comment       TEXT,
    source        TEXT DEFAULT 'auto',        -- auto | human
    created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS prompts (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,              -- logical prompt name e.g. "customer-support-system"
    version       INTEGER NOT NULL,
    content       TEXT NOT NULL,
    variables     TEXT DEFAULT '[]',          -- JSON array of variable names
    tags          TEXT DEFAULT '[]',
    is_active     INTEGER DEFAULT 0,
    created_at    TEXT NOT NULL,
    UNIQUE(name, version)
);

CREATE TABLE IF NOT EXISTS alert_rules (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    metric        TEXT NOT NULL,              -- "error_rate" | "cost_usd" | "p95_latency" | "quality_score"
    condition     TEXT NOT NULL,              -- "gt" | "lt" | "gte" | "lte"
    threshold     REAL NOT NULL,
    window_minutes INTEGER DEFAULT 5,
    channels      TEXT DEFAULT '[]',          -- JSON: ["slack", "email"]
    webhook_url   TEXT,
    enabled       INTEGER DEFAULT 1,
    created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS alert_events (
    id            TEXT PRIMARY KEY,
    rule_id       TEXT NOT NULL REFERENCES alert_rules(id),
    metric_value  REAL NOT NULL,
    triggered_at  TEXT NOT NULL,
    resolved_at   TEXT
);

CREATE INDEX IF NOT EXISTS idx_traces_created_at ON traces(created_at);
CREATE INDEX IF NOT EXISTS idx_traces_model ON traces(model);
CREATE INDEX IF NOT EXISTS idx_traces_user_id ON traces(user_id);
CREATE INDEX IF NOT EXISTS idx_spans_trace_id ON spans(trace_id);
CREATE INDEX IF NOT EXISTS idx_scores_trace_id ON scores(trace_id);
```

---

## Backend — API Specification

Base URL: `http://localhost:8002` (local dev) · `http://localhost:8000` (Docker)  
All responses: `Content-Type: application/json`  
All timestamps: ISO8601 strings.

### Ingest Router (`/ingest`)

```
POST /ingest/trace
  Body: { id, session_id?, user_id?, app_name?, environment?, model, provider,
          status, input_text, output_text, prompt_tokens, completion_tokens,
          duration_ms, ttft_ms?, tags?, created_at }
  Action: compute cost_usd via cost_calculator, scan for PII, run alert_engine,
          broadcast to WebSocket clients, insert into DB.
  Response: { "trace_id": "<id>" }

POST /ingest/span
  Body: { id, trace_id, parent_span_id?, name, span_type, input_text?, output_text?,
          model?, prompt_tokens?, completion_tokens?, start_time, end_time?, metadata? }
  Action: compute cost if model+tokens present, insert into DB.
  Response: { "span_id": "<id>" }

POST /ingest/score
  Body: { trace_id, span_id?, name, value, comment?, source? }
  Action: insert score, update trace quality aggregate.
  Response: { "score_id": "<id>" }
```

### Traces Router (`/traces`)

```
GET /traces
  Query params: page=1, per_page=50, model, provider, status, user_id, app_name,
                environment, date_from, date_to, search (searches input_text/output_text),
                min_cost, max_cost, min_duration, max_duration, pii_flagged
  Response: { items: Trace[], total: int, page: int, per_page: int }

GET /traces/{id}
  Response: Trace object + spans: Span[] (tree structure) + scores: Score[]

DELETE /traces/{id}
  Response: 204
```

### Metrics Router (`/metrics`)

```
GET /metrics/summary?date_from=&date_to=
  Response: {
    total_requests: int,      requests_delta_pct: float,
    total_cost_usd: float,    cost_delta_pct: float,
    p95_latency_ms: int,      latency_delta_pct: float,
    error_rate_pct: float,    error_delta_pct: float,
    avg_quality_score: float, quality_delta_pct: float,
    active_users: int
  }

GET /metrics/volume?interval=hour|day|week&date_from=&date_to=
  Response: [{ timestamp: str, requests: int, errors: int }]

GET /metrics/cost?interval=hour|day&group_by=model|provider|user_id|app_name&date_from=&date_to=
  Response: [{ timestamp: str, group: str, cost_usd: float, tokens: int }]

GET /metrics/latency?date_from=&date_to=&model=
  Response: [{ timestamp: str, p50: int, p95: int, p99: int }]

GET /metrics/quality?date_from=&date_to=&score_name=
  Response: [{ timestamp: str, avg_score: float, score_name: str }]

GET /metrics/models?date_from=&date_to=
  Response: [{ model: str, provider: str, requests: int, cost_usd: float,
               avg_latency_ms: int, error_rate_pct: float }]

GET /metrics/errors?date_from=&date_to=
  Response: [{ timestamp: str, count: int, type: str }]
```

### Prompts Router (`/prompts`)

```
GET /prompts                   → list all prompt names with latest version
GET /prompts/{name}            → all versions of a named prompt
POST /prompts                  → create new version (auto-increments version number)
  Body: { name, content, variables?, tags? }
PUT /prompts/{name}/{version}/activate   → set is_active=1, deactivate others
DELETE /prompts/{name}/{version}
```

### Alerts Router (`/alerts`)

```
GET /alerts                    → list alert rules
POST /alerts                   → create alert rule
PUT /alerts/{id}               → update alert rule
DELETE /alerts/{id}
GET /alerts/events?resolved=true|false|all&date_from=&date_to=
```

### WebSocket (`/ws`)

```
GET /ws/live-feed
  On connect: send last 20 traces as initial payload
  On new trace ingest: broadcast { type: "trace", data: TraceRow }
  On alert fire: broadcast { type: "alert", data: AlertEvent }
```

### System

```
GET /health       → { status: "ok", db: "ok", traces_count: int }
GET /settings     → get stored settings (retention_days, redact_pii, etc.)
PUT /settings     → update settings
```

---

## Backend Implementation Details

### `services/cost_calculator.py`

Hardcode a `MODEL_PRICING` dict with pricing per 1M tokens (input and output separately).
Include at minimum:

```python
MODEL_PRICING = {
    # OpenAI
    "gpt-4o":                {"input": 2.50,  "output": 10.00},
    "gpt-4o-mini":           {"input": 0.15,  "output": 0.60},
    "gpt-4-turbo":           {"input": 10.00, "output": 30.00},
    "gpt-3.5-turbo":         {"input": 0.50,  "output": 1.50},
    # Anthropic
    "claude-opus-4-8":       {"input": 15.00, "output": 75.00},
    "claude-sonnet-4-6":     {"input": 3.00,  "output": 15.00},
    "claude-haiku-4-5":      {"input": 0.80,  "output": 4.00},
    # Google
    "gemini-1.5-pro":        {"input": 3.50,  "output": 10.50},
    "gemini-1.5-flash":      {"input": 0.075, "output": 0.30},
    # Mistral
    "mistral-large":         {"input": 2.00,  "output": 6.00},
    "mistral-small":         {"input": 0.20,  "output": 0.60},
}

def calculate_cost(model: str, prompt_tokens: int, completion_tokens: int) -> float:
    # Returns USD cost rounded to 6 decimal places. Returns 0.0 if model not in dict.
```

### `services/pii_scanner.py`

Use regex patterns only (no external dependencies). Scan `input_text` and `output_text`.
Return `True` if any pattern matches. If `redact_pii` setting is enabled, replace matches
with `[REDACTED]` before storing.

Patterns to detect:
- Email: `r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'`
- Phone (US): `r'\b(\+1[\s-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b'`
- SSN: `r'\b\d{3}-\d{2}-\d{4}\b'`
- Credit card: `r'\b(?:\d{4}[\s-]?){3}\d{4}\b'`
- IPv4: `r'\b(?:\d{1,3}\.){3}\d{1,3}\b'`

### `services/alert_engine.py`

Called synchronously during trace ingestion. Checks all enabled alert rules.
For time-window metrics (e.g., error rate over last 5 minutes), queries the DB directly.
If a rule fires: insert into `alert_events`, log it, and (if webhook_url configured)
send a POST to the webhook with the alert payload.

---

## Frontend — Page Specifications

### Page 1: Overview (`/`)

Layout: 2-column top section, full-width charts below.

**Row 1 — 5 Summary Metric Cards (horizontal)**
Each card shows: icon, metric name, large value, delta badge (vs previous period).

| Card | Metric | Accent Color | Icon |
|---|---|---|---|
| Requests | total_requests | violet | `Activity` |
| Total Cost | total_cost_usd formatted as $0.0000 | orange | `DollarSign` |
| P95 Latency | p95_latency_ms formatted as Xms | cyan | `Timer` |
| Error Rate | error_rate_pct formatted as X.X% | red | `AlertCircle` |
| Avg Quality | avg_quality_score formatted as X.XX | green | `Star` |

Delta badge: green with ↑ if positive (except error rate where green = ↓).

**Row 2 — 2 charts side by side**
- Left (60%): Request Volume — `VolumeBarChart` stacked bar (success=violet, error=red) over time
- Right (40%): Model Distribution — `ModelPieChart` donut chart, one slice per model

**Row 3 — 2 charts side by side**
- Left (50%): Cost Over Time — `CostAreaChart` area chart, one area per top-5 models
- Right (50%): P95 Latency Trend — `LatencyChart` line chart

**Row 4 — Live Feed panel (full width)**
WebSocket-connected live trace stream. Shows last 30 traces as rows, newest at top.
Auto-scrolls. Each row: status dot, model badge, user ID, cost, duration, timestamp.
New rows animate in from the top with a brief highlight flash.

**Global time range selector (TopBar)**
Options: Last 1h / 6h / 24h / 7d / 30d / Custom. Applies to all charts on every page.

---

### Page 2: Traces (`/traces`)

**Filters bar** (sticky below TopBar)
- Search box (searches prompt content)
- Model multi-select dropdown
- Provider multi-select
- Status multi-select (success / error / timeout)
- Environment select
- Date range pickers
- "More filters" expander: user_id, app_name, cost range, duration range, PII flagged toggle

**Trace table** — columns:
| Column | Notes |
|---|---|
| Status | Colored dot + text badge |
| Trace ID | First 8 chars in monospace, copy-on-click |
| Model | Provider icon + model name |
| User | user_id or "anonymous" |
| Input preview | First 80 chars of input_text, truncated |
| Cost | Monospace, orange tint if > $0.01 |
| Duration | Monospace, red tint if > 3000ms |
| Tokens | prompt_tokens → completion_tokens |
| Time | Relative (e.g. "2 min ago"), tooltip shows full ISO timestamp |

Click any row → navigate to TraceDetail. Pagination: 50 per page.

---

### Page 3: Trace Detail (`/traces/:id`)

**Header**: Trace ID, status badge, model, provider, created_at, duration, cost.

**Tab 1 — Overview**
- Two columns: Input (full prompt) | Output (full completion), monospace font, syntax-highlighted if JSON
- Metadata row: user_id, session_id, app_name, environment, tags

**Tab 2 — Span Tree**
Render as an indented tree using `SpanTree` / `SpanNode` components.
Each node shows: span type icon, span name, duration bar (proportional to total), cost, status.
Click to expand node and see its input/output.
Span type icons: 🤖 llm, 🔧 tool, 📚 retrieval, 🔗 chain, 🕵️ agent.

**Tab 3 — Quality Scores**
Table of all scores attached to this trace: name, value (0–1 with colored bar), source badge, comment.

**Tab 4 — Raw JSON**
Full trace + spans + scores as pretty-printed JSON in a scrollable monospace box.

**PII Warning Banner**: If `pii_flagged=true`, show red banner at top of page.

---

### Page 4: Cost (`/cost`)

**Row 1 — 4 Summary Cards**
Total spend, avg cost/request, most expensive model, spend vs last period.

**Row 2 — Cost Over Time (full width)**
Stacked area chart. Group by options: model / provider / app_name / user_id.
Toggle between absolute cost and per-request cost.

**Row 3 — 2 panels side by side**
- Left: Cost Breakdown Table — model, requests, total tokens, total cost, avg cost/req, % of total
- Right: Top 10 Users by Spend — horizontal bar chart

**Row 4 — Budget Tracker (full width)**
If any alert rules are set for cost, show progress bars: "X% of $Y monthly budget used".

---

### Page 5: Quality (`/quality`)

**Row 1 — 4 Summary Cards**
Avg quality score, hallucination rate, faithfulness score, user rating.

**Row 2 — Quality Trends (full width)**
Multi-line chart. One line per score name (hallucination, faithfulness, relevance, user_rating).
Y-axis: 0–1. Show as percentage.

**Row 3 — 2 panels**
- Left: Score Distribution — histogram of score values (0–1 in 10 buckets)
- Right: Worst Performing Traces — table of 10 lowest-scored traces with links to TraceDetail

**Row 4 — Guardrail Events**
List of traces where PII was detected. Shows trace ID, detected entities, timestamp.

---

### Page 6: Prompts (`/prompts`)

**Left panel (30%)**: List of prompt names. Click to open. Active version shown with green dot.

**Right panel (70%)**:
- Prompt name header
- Version history tabs (v1, v2, v3…)
- For each version: content display with variable highlighting (`{{variable}}` in violet), tags, created_at
- "Set Active" button, "New Version" button
- Variable list extracted from content

**New Prompt drawer**: Slide-in panel from right with name input, content textarea, variable auto-detection.

---

### Page 7: Alerts (`/alerts`)

**Alert Rules section**
Table: name, metric, condition (e.g., "error_rate > 5%"), window, status (enabled/disabled), actions.
"Create Alert" button opens a form:
- Name, Metric (dropdown), Condition (gt/lt), Threshold (number), Window (minutes), Webhook URL

**Alert Events section**
Timeline of fired alerts. Each event: rule name, metric value, triggered_at, resolved_at (or "Active" in red).

---

### Page 8: Settings (`/settings`)

Sections:
1. **Data Retention** — slider: keep traces for X days (1–365)
2. **Privacy** — toggle: Redact PII in stored traces
3. **Ingest** — copy-paste SDK setup snippet for Python/Node
4. **API Key** — generate/revoke API keys for SDK auth (stored in DB, bcrypt-hashed)
5. **About** — version, GitHub link

---

## SDK (`sdk/`)

### `aiobs_sdk/client.py`

```python
class AIOBSClient:
    def __init__(self, host: str = "http://localhost:8000", api_key: str = None):
        ...

    def log_trace(self, model: str, provider: str, input_text: str,
                  output_text: str, prompt_tokens: int, completion_tokens: int,
                  duration_ms: int, status: str = "success",
                  user_id: str = None, session_id: str = None,
                  app_name: str = None, tags: dict = None) -> str:
        # POST to /ingest/trace, returns trace_id
```

### `aiobs_sdk/tracer.py`

```python
@contextmanager
def trace_llm(client: AIOBSClient, model: str, provider: str, **kwargs):
    # Records start time, yields, records end time, calls client.log_trace()
    # Usage:
    # with trace_llm(client, model="gpt-4o", provider="openai", user_id="u123") as t:
    #     response = openai_client.chat.completions.create(...)
    #     t.set_output(response.choices[0].message.content)
    #     t.set_tokens(response.usage.prompt_tokens, response.usage.completion_tokens)
```

### `aiobs_sdk/integrations/openai_patch.py`

Auto-patch `openai.OpenAI.chat.completions.create` to log traces automatically:
```python
def patch_openai(client: AIOBSClient):
    # Wraps the create method to auto-log every call
```

---

## Backend `requirements.txt`

```
fastapi>=0.110.0
uvicorn[standard]>=0.27.0
aiosqlite>=0.19.0
pydantic>=2.5.0
python-multipart>=0.0.9
httpx>=0.26.0
pytest>=7.4.0
pytest-asyncio>=0.23.0
```

## Frontend `package.json` dependencies

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.22.0",
    "@tanstack/react-query": "^5.17.0",
    "recharts": "^2.10.0",
    "axios": "^1.6.0",
    "lucide-react": "^0.309.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0",
    "date-fns": "^3.3.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0"
  }
}
```

Install shadcn/ui components: `npx shadcn-ui@latest init` then add:
`button`, `card`, `badge`, `dialog`, `dropdown-menu`, `input`, `label`, `select`,
`separator`, `sheet`, `switch`, `table`, `tabs`, `tooltip`

---

## Build Phases

All phases are **complete**. Listed for reference if extending the project.

### Phase 1 — Backend Foundation ✅
- `database.py`: all tables on startup, `get_db()` dependency
- `models.py`: all Pydantic request/response models
- `services/cost_calculator.py`: MODEL_PRICING + `calculate_cost()`
- `services/pii_scanner.py`: regex PII scanner + redactor
- `routers/ingest.py`: POST /ingest/trace with cost calc, PII scan, WS broadcast, alert evaluation
- `main.py`: all routers wired, CORS for localhost:5173
- `GET /api/health` endpoint

### Phase 2 — More Backend Routes ✅
- `routers/traces.py`: GET /traces (filters + pagination) + GET /traces/{id} + DELETE
- `routers/metrics.py`: summary, volume, cost, models endpoints
- `routers/prompts.py`: full CRUD with version management
- `routers/alerts.py`: rules CRUD + events feed
- `services/alert_engine.py`: evaluates rules on every ingest (error_rate, cost_usd, p95_latency, quality_score)
- `routers/ws.py`: WebSocket `/ws/live-feed` — sends last 20 traces on connect, broadcasts each new trace

### Phase 3 — Frontend Shell ✅
- Vite + React 18 + TypeScript + Tailwind CSS
- `App.tsx`: React Router with Sidebar + TopBar layout
- `api/client.ts`: axios instance + all typed API functions
- `types/index.ts`: full TypeScript interfaces (Trace, Span, Score, TraceDetail, Metrics, Alerts, Prompts)

### Phase 4 — Overview Page + Charts ✅
- 5 operational metric cards + 4 AI safety/risk cards
- Volume bar chart, model distribution donut, cost area chart
- Model performance breakdown table

### Phase 5 — Traces Pages ✅
- Traces list with status/app filters + pagination, click-to-navigate
- `TraceDetail.tsx`: 4-tab detail page (Overview, Span Tree, Quality Scores, Raw JSON)
- Recursive span tree with duration bars, expand/collapse, inline IO

### Phase 6 — Cost, Quality, Prompts, Alerts Pages ✅
- All pages built per spec

### Phase 7 — Settings + SDK ✅
- Settings page
- `sdk/aiobs_sdk/`: `AIOBSClient`, `trace_llm()` context manager, OpenAI + Anthropic auto-patches

### Phase 8 — Seed Data ✅
- `backend/seed.py`: 500 realistic traces with spans, scores, PII flags, and failures
- Run with: `py seed.py` (from the `backend/` directory)

### Phase 9 — Docker ✅
- `Dockerfile`: multi-stage build (Node 20 → Python 3.13-slim), non-root user, healthcheck
- `docker-compose.yml`: single service, named volume for DB persistence
- `.dockerignore`: excludes node_modules, caches, local DB, SDK

---

## Running the Project

### Option A — Local dev (hot-reload)

```bash
# Backend (Terminal 1)
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8002

# Frontend (Terminal 2)
cd frontend
npm install
npm run dev          # dashboard at http://localhost:5173

# Seed demo data (run once)
cd backend
py seed.py
```

**Single URL for everything: `http://localhost:5173`**
Vite proxies `/api/*` → backend port 8002 and `/ws/*` → `ws://localhost:8002`.
Navigating to `http://localhost:8002/` redirects to the Swagger API docs at `/api/docs`.

#### Changing the backend port

Only two places need updating:
1. `vite.config.ts` → `server.proxy['/api'].target` and `server.proxy['/ws'].target`
2. `uvicorn main:app --port <new-port>`

Port 8000 is occupied by another service on this machine. Port 8001 may stay in
Windows TIME_WAIT for ~60 s after a restart. Use **8002** as the stable dev port.

---

### Option B — Docker (production-like, single URL)

```bash
# Build and start (first run takes ~2 min to build the frontend)
docker compose up --build -d

# Dashboard + API at http://localhost:8000
# API docs at http://localhost:8000/api/docs

# Seed demo data inside the container
docker compose exec aiobs python seed.py

# View logs
docker compose logs -f

# Stop
docker compose down
```

The SQLite database is stored in the `aiobs_data` named volume — data persists across restarts.

To expose on a different host port (e.g. 9000):
```bash
# In docker-compose.yml, change:
ports:
  - "9000:8000"
```

---

## Code Quality Rules

- TypeScript: strict mode, no `any` types, all API responses typed
- React: functional components only, no class components
- All DB queries in routers/services only — no raw SQL in main.py
- FastAPI: use `async def` for all route handlers
- Error handling: all API routes return structured `{ "detail": "..." }` on error
- No console.log left in production code
- All chart components accept typed props — no inline data transforms inside JSX
- Format Python with `black`, TypeScript with `prettier` (default config)

---

## What NOT to Build

- No authentication system (single-user local tool for now — Settings page shows API key only)
- No cloud deployment config (Kubernetes, Terraform, etc.)
- No mobile layout (desktop-only, min-width 1280px)
- No dark/light toggle (dark only)
