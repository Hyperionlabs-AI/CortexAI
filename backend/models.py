from pydantic import BaseModel, Field
from typing import Optional


# ── Ingest request bodies ────────────────────────────────────────────────────

class TraceIn(BaseModel):
    id: str
    session_id: Optional[str] = None
    user_id: Optional[str] = None
    app_name: Optional[str] = None
    environment: str = "production"
    model: str
    provider: str
    status: str  # success | error | timeout
    input_text: Optional[str] = None
    output_text: Optional[str] = None
    prompt_tokens: int = 0
    completion_tokens: int = 0
    duration_ms: int = 0
    ttft_ms: Optional[int] = None
    tags: dict = Field(default_factory=dict)
    created_at: str


class SpanIn(BaseModel):
    id: str
    trace_id: str
    parent_span_id: Optional[str] = None
    name: str
    span_type: str  # llm | tool | retrieval | chain | agent
    input_text: Optional[str] = None
    output_text: Optional[str] = None
    model: Optional[str] = None
    prompt_tokens: int = 0
    completion_tokens: int = 0
    start_time: str
    end_time: Optional[str] = None
    metadata: dict = Field(default_factory=dict)


class ScoreIn(BaseModel):
    trace_id: str
    span_id: Optional[str] = None
    name: str
    value: float  # 0.0 – 1.0
    comment: Optional[str] = None
    source: str = "auto"  # auto | human


# ── Ingest responses ─────────────────────────────────────────────────────────

class TraceIngestResponse(BaseModel):
    trace_id: str


class SpanIngestResponse(BaseModel):
    span_id: str


class ScoreIngestResponse(BaseModel):
    score_id: str


# ── System responses ─────────────────────────────────────────────────────────

class HealthResponse(BaseModel):
    status: str
    db: str
    traces_count: int


# ── Metrics responses ─────────────────────────────────────────────────────────

class MetricsSummaryResponse(BaseModel):
    # Core operational
    total_requests: int
    requests_delta_pct: float
    total_cost_usd: float
    cost_delta_pct: float
    p95_latency_ms: int
    latency_delta_pct: float
    error_rate_pct: float
    error_delta_pct: float
    # Quality
    avg_quality_score: float
    quality_delta_pct: float
    hallucination_rate_pct: float
    avg_toxicity: float
    # Safety / security
    avg_risk_score: float
    high_risk_count: int
    security_events: int
    pii_events: int
    # Activity
    active_users: int


class VolumePoint(BaseModel):
    timestamp: str
    requests: int
    errors: int


class ModelStat(BaseModel):
    model: str
    provider: str
    requests: int
    cost_usd: float
    avg_latency_ms: int
    error_rate_pct: float


# ── Traces list ───────────────────────────────────────────────────────────────

class TraceRow(BaseModel):
    id: str
    model: str
    provider: str
    status: str
    user_id: Optional[str]
    app_name: Optional[str]
    cost_usd: float
    duration_ms: int
    total_tokens: int
    pii_flagged: bool
    created_at: str
    input_preview: Optional[str]


class TracesListResponse(BaseModel):
    items: list[TraceRow]
    total: int
    page: int
    per_page: int


# ── Prompts ───────────────────────────────────────────────────────────────────

class PromptVersion(BaseModel):
    id: str
    name: str
    version: int
    content: str
    variables: list[str]
    tags: list[str]
    is_active: bool
    created_at: str


class PromptListItem(BaseModel):
    name: str
    latest_version: int
    active_version: int
    created_at: str


# ── Alerts ────────────────────────────────────────────────────────────────────

class AlertRule(BaseModel):
    id: str
    name: str
    metric: str
    condition: str
    threshold: float
    window_minutes: int
    channels: list[str]
    webhook_url: Optional[str]
    enabled: bool
    created_at: str


class AlertEvent(BaseModel):
    id: str
    rule_id: str
    rule_name: str
    metric: str
    metric_value: float
    triggered_at: str
    resolved_at: Optional[str]


# ── Cost time-series ──────────────────────────────────────────────────────────

class CostPoint(BaseModel):
    timestamp: str
    model: str
    cost_usd: float
    tokens: int


# ── Trace detail (spans + scores) ─────────────────────────────────────────────

class SpanOut(BaseModel):
    id: str
    trace_id: str
    parent_span_id: Optional[str]
    name: str
    span_type: str
    input_text: Optional[str]
    output_text: Optional[str]
    model: Optional[str]
    prompt_tokens: int
    completion_tokens: int
    cost_usd: float
    start_time: str
    end_time: Optional[str]
    duration_ms: Optional[int]
    status: str
    metadata: dict


class ScoreOut(BaseModel):
    id: str
    trace_id: str
    span_id: Optional[str]
    name: str
    value: float
    comment: Optional[str]
    source: str
    created_at: str


class TraceDetailResponse(BaseModel):
    id: str
    session_id: Optional[str]
    user_id: Optional[str]
    app_name: Optional[str]
    environment: str
    model: str
    provider: str
    status: str
    input_text: Optional[str]
    output_text: Optional[str]
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    cost_usd: float
    duration_ms: int
    ttft_ms: Optional[int]
    tags: dict
    pii_flagged: bool
    created_at: str
    spans: list[SpanOut]
    scores: list[ScoreOut]
