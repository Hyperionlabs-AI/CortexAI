export interface HealthResponse {
  status: string
  db: string
  traces_count: number
}

export interface TraceIn {
  id: string
  session_id?: string
  user_id?: string
  app_name?: string
  environment?: string
  model: string
  provider: string
  status: string
  input_text?: string
  output_text?: string
  prompt_tokens: number
  completion_tokens: number
  duration_ms: number
  ttft_ms?: number
  tags?: Record<string, string>
  created_at: string
}

export interface TraceIngestResponse {
  trace_id: string
}

export interface SpanIn {
  id: string
  trace_id: string
  parent_span_id?: string
  name: string
  span_type: string
  input_text?: string
  output_text?: string
  model?: string
  prompt_tokens?: number
  completion_tokens?: number
  start_time: string
  end_time?: string
  metadata?: Record<string, unknown>
}

export interface ScoreIn {
  trace_id: string
  span_id?: string
  name: string
  value: number
  comment?: string
  source?: string
}

// ── Metrics ──────────────────────────────────────────────────────────────────

export interface MetricsSummary {
  total_requests: number
  requests_delta_pct: number
  total_cost_usd: number
  cost_delta_pct: number
  p95_latency_ms: number
  latency_delta_pct: number
  error_rate_pct: number
  error_delta_pct: number
  avg_quality_score: number
  quality_delta_pct: number
  hallucination_rate_pct: number
  avg_toxicity: number
  avg_risk_score: number
  high_risk_count: number
  security_events: number
  pii_events: number
  active_users: number
}

export interface VolumePoint {
  timestamp: string
  requests: number
  errors: number
}

export interface ModelStat {
  model: string
  provider: string
  requests: number
  cost_usd: number
  avg_latency_ms: number
  error_rate_pct: number
}

// ── Traces ────────────────────────────────────────────────────────────────────

export interface TraceRow {
  id: string
  model: string
  provider: string
  status: string
  user_id: string | null
  app_name: string | null
  cost_usd: number
  duration_ms: number
  total_tokens: number
  pii_flagged: boolean
  created_at: string
  input_preview: string | null
}

export interface TracesListResponse {
  items: TraceRow[]
  total: number
  page: number
  per_page: number
}

// ── Cost time-series ──────────────────────────────────────────────────────────

export interface CostPoint {
  timestamp: string
  model: string
  cost_usd: number
  tokens: number
}

// ── Prompts ───────────────────────────────────────────────────────────────────

export interface PromptVersion {
  id: string
  name: string
  version: number
  content: string
  variables: string[]
  tags: string[]
  is_active: boolean
  created_at: string
}

export interface PromptListItem {
  name: string
  latest_version: number
  active_version: number
  created_at: string
}

// ── Alerts ────────────────────────────────────────────────────────────────────

export interface AlertRule {
  id: string
  name: string
  metric: string
  condition: string
  threshold: number
  window_minutes: number
  channels: string[]
  webhook_url: string | null
  enabled: boolean
  created_at: string
}

export interface AlertEvent {
  id: string
  rule_id: string
  rule_name: string
  metric: string
  metric_value: number
  triggered_at: string
  resolved_at: string | null
}

// ── Trace detail ──────────────────────────────────────────────────────────────

export interface Span {
  id: string
  trace_id: string
  parent_span_id: string | null
  name: string
  span_type: string
  input_text: string | null
  output_text: string | null
  model: string | null
  prompt_tokens: number
  completion_tokens: number
  cost_usd: number
  start_time: string
  end_time: string | null
  duration_ms: number | null
  status: string
  metadata: Record<string, unknown>
}

export interface Score {
  id: string
  trace_id: string
  span_id: string | null
  name: string
  value: number
  comment: string | null
  source: string
  created_at: string
}

export interface TraceDetail {
  id: string
  session_id: string | null
  user_id: string | null
  app_name: string | null
  environment: string
  model: string
  provider: string
  status: string
  input_text: string | null
  output_text: string | null
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
  cost_usd: number
  duration_ms: number
  ttft_ms: number | null
  tags: Record<string, string>
  pii_flagged: boolean
  created_at: string
  spans: Span[]
  scores: Score[]
}
