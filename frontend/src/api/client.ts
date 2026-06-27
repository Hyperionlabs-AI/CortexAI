import axios from 'axios'
import type {
  AlertEvent, AlertRule, CostPoint,
  HealthResponse, MetricsSummary, ModelStat,
  PromptListItem, PromptVersion,
  SpanIn, ScoreIn, TraceDetail, TraceIn, TraceIngestResponse,
  TracesListResponse, VolumePoint,
} from '../types'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  headers: { 'Content-Type': 'application/json' },
})

// ── System ────────────────────────────────────────────────────────────────────

export const getHealth = (): Promise<HealthResponse> =>
  api.get<HealthResponse>('/health').then(r => r.data)

// ── Ingest ────────────────────────────────────────────────────────────────────

export const ingestTrace = (trace: TraceIn): Promise<TraceIngestResponse> =>
  api.post<TraceIngestResponse>('/ingest/trace', trace).then(r => r.data)

export const ingestSpan = (span: SpanIn): Promise<{ span_id: string }> =>
  api.post<{ span_id: string }>('/ingest/span', span).then(r => r.data)

export const ingestScore = (score: ScoreIn): Promise<{ score_id: string }> =>
  api.post<{ score_id: string }>('/ingest/score', score).then(r => r.data)

// ── Metrics ───────────────────────────────────────────────────────────────────

export const getMetricsSummary = (dateFrom?: string, dateTo?: string): Promise<MetricsSummary> => {
  const p = new URLSearchParams()
  if (dateFrom) p.set('date_from', dateFrom)
  if (dateTo)   p.set('date_to', dateTo)
  return api.get<MetricsSummary>(`/metrics/summary?${p}`).then(r => r.data)
}

export const getVolume = (dateFrom?: string, dateTo?: string): Promise<VolumePoint[]> => {
  const p = new URLSearchParams({ interval: 'day' })
  if (dateFrom) p.set('date_from', dateFrom)
  if (dateTo)   p.set('date_to', dateTo)
  return api.get<VolumePoint[]>(`/metrics/volume?${p}`).then(r => r.data)
}

export const getModelStats = (dateFrom?: string, dateTo?: string): Promise<ModelStat[]> => {
  const p = new URLSearchParams()
  if (dateFrom) p.set('date_from', dateFrom)
  if (dateTo)   p.set('date_to', dateTo)
  return api.get<ModelStat[]>(`/metrics/models?${p}`).then(r => r.data)
}

export const getCostBreakdown = (dateFrom?: string, dateTo?: string): Promise<CostPoint[]> => {
  const p = new URLSearchParams()
  if (dateFrom) p.set('date_from', dateFrom)
  if (dateTo)   p.set('date_to', dateTo)
  return api.get<CostPoint[]>(`/metrics/cost?${p}`).then(r => r.data)
}

// ── Traces ────────────────────────────────────────────────────────────────────

export const getTrace = (id: string): Promise<TraceDetail> =>
  api.get<TraceDetail>(`/traces/${encodeURIComponent(id)}`).then(r => r.data)

export const getTraces = (
  page = 1,
  perPage = 20,
  filters?: { model?: string; status?: string; app_name?: string; pii_flagged?: boolean }
): Promise<TracesListResponse> => {
  const p = new URLSearchParams({ page: String(page), per_page: String(perPage) })
  if (filters?.model)    p.set('model', filters.model)
  if (filters?.status)   p.set('status', filters.status)
  if (filters?.app_name) p.set('app_name', filters.app_name)
  if (filters?.pii_flagged !== undefined) p.set('pii_flagged', String(filters.pii_flagged))
  return api.get<TracesListResponse>(`/traces?${p}`).then(r => r.data)
}

// ── Prompts ───────────────────────────────────────────────────────────────────

export const getPrompts = (): Promise<PromptListItem[]> =>
  api.get<PromptListItem[]>('/prompts').then(r => r.data)

export const getPromptVersions = (name: string): Promise<PromptVersion[]> =>
  api.get<PromptVersion[]>(`/prompts/${encodeURIComponent(name)}`).then(r => r.data)

// ── Alerts ────────────────────────────────────────────────────────────────────

export const getAlerts = (): Promise<AlertRule[]> =>
  api.get<AlertRule[]>('/alerts').then(r => r.data)

export const getAlertEvents = (): Promise<AlertEvent[]> =>
  api.get<AlertEvent[]>('/alerts/events').then(r => r.data)

export const toggleAlert = (id: string): Promise<AlertRule> =>
  api.put<AlertRule>(`/alerts/${id}/toggle`).then(r => r.data)

export default api
