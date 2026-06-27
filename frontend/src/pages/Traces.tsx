import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Eye, ChevronLeft, ChevronRight, Filter } from 'lucide-react'
import { getTraces } from '../api/client'

const C = {
  violet: '#7c3aed', cyan: '#06b6d4', green: '#22c55e',
  orange: '#f97316', red: '#ef4444', yellow: '#eab308',
  card: '#0d1220', border: '#1e2d42',
  textPrimary: '#e2e8f0', textSecondary: '#94a3b8', textMuted: '#475569',
  bgRaised: '#111827',
}

const PROVIDER_COLORS: Record<string, string> = {
  openai: '#10a37f', anthropic: '#d97706', google: '#3b82f6',
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string }> = {
    success: { bg: '#22c55e1a', text: '#22c55e' },
    error:   { bg: '#ef44441a', text: '#ef4444' },
    timeout: { bg: '#eab3081a', text: '#eab308' },
  }
  const s = map[status] ?? map.error
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '2px 8px', borderRadius: 9999,
      background: s.bg, color: s.text, fontSize: 11, fontWeight: 500,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.text }} />
      {status}
    </span>
  )
}

function ModelBadge({ model, provider }: { model: string; provider: string }) {
  const color = PROVIDER_COLORS[provider] ?? C.violet
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 6, fontSize: 11,
      background: `${color}1a`, color, border: `1px solid ${color}33`,
      fontFamily: '"JetBrains Mono", monospace',
    }}>
      {model}
    </span>
  )
}

const STATUS_OPTS = ['', 'success', 'error', 'timeout']
const APP_OPTS = ['', 'customer-support', 'code-assistant', 'document-summarizer', 'content-classifier', 'chatbot']

export default function Traces() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [appFilter, setAppFilter] = useState('')

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['traces', page, statusFilter, appFilter],
    queryFn: () => getTraces(page, 20, {
      status: statusFilter || undefined,
      app_name: appFilter || undefined,
    }),
    placeholderData: (prev) => prev,
    refetchInterval: 15_000,
  })

  const totalPages = data ? Math.ceil(data.total / data.per_page) : 1

  const selStyle = {
    background: C.bgRaised, color: C.textSecondary, border: `1px solid ${C.border}`,
    borderRadius: 6, padding: '5px 10px', fontSize: 12, cursor: 'pointer',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: C.textPrimary, marginBottom: 4 }}>Traces</h1>
        <p style={{ color: C.textSecondary, fontSize: 13 }}>
          Every LLM call logged by your applications — searchable, filterable, paginated.
        </p>
      </div>

      {/* Filter bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 16px',
      }}>
        <Filter size={14} style={{ color: C.textMuted }} />
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }} style={selStyle}>
          {STATUS_OPTS.map(o => <option key={o} value={o}>{o || 'All statuses'}</option>)}
        </select>
        <select value={appFilter} onChange={e => { setAppFilter(e.target.value); setPage(1) }} style={selStyle}>
          {APP_OPTS.map(o => <option key={o} value={o}>{o || 'All apps'}</option>)}
        </select>
        <span style={{ marginLeft: 'auto', color: C.textMuted, fontSize: 12 }}>
          {data ? `${data.total.toLocaleString()} traces` : '—'}
          {isFetching && !isLoading && <span style={{ marginLeft: 8, color: C.violet }}>↻</span>}
        </span>
      </div>

      {/* Table */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.border}` }}>
              {['Time', 'Model', 'Status', 'App', 'User', 'Tokens', 'Cost', 'Latency', 'Flags', 'Preview'].map(h => (
                <th key={h} style={{
                  textAlign: 'left', color: C.textMuted, fontWeight: 500,
                  padding: '10px 14px', whiteSpace: 'nowrap',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={10} style={{ padding: 40, textAlign: 'center', color: C.textMuted }}>Loading…</td></tr>
            )}
            {!isLoading && data?.items.length === 0 && (
              <tr><td colSpan={10} style={{ padding: 40, textAlign: 'center', color: C.textMuted }}>No traces found</td></tr>
            )}
            {data?.items.map((t, i) => (
              <tr
                key={t.id}
                onClick={() => navigate(`/traces/${t.id}`)}
                style={{ borderBottom: `1px solid ${C.border}33`, background: i % 2 === 1 ? 'rgba(255,255,255,0.015)' : 'transparent', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#1a2234')}
                onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 1 ? 'rgba(255,255,255,0.015)' : 'transparent')}
              >
                <td style={{ padding: '9px 14px', color: C.textMuted, whiteSpace: 'nowrap', fontFamily: '"JetBrains Mono",monospace', fontSize: 11 }}>
                  {new Date(t.created_at).toLocaleString('en-GB', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </td>
                <td style={{ padding: '9px 14px' }}>
                  <ModelBadge model={t.model} provider={t.provider} />
                </td>
                <td style={{ padding: '9px 14px' }}>
                  <StatusBadge status={t.status} />
                </td>
                <td style={{ padding: '9px 14px', color: C.textSecondary }}>{t.app_name ?? '—'}</td>
                <td style={{ padding: '9px 14px', color: C.textMuted, fontFamily: '"JetBrains Mono",monospace', fontSize: 11 }}>{t.user_id ?? '—'}</td>
                <td style={{ padding: '9px 14px', color: C.cyan, fontFamily: '"JetBrains Mono",monospace' }}>{t.total_tokens.toLocaleString()}</td>
                <td style={{ padding: '9px 14px', color: C.orange, fontFamily: '"JetBrains Mono",monospace' }}>${t.cost_usd.toFixed(4)}</td>
                <td style={{ padding: '9px 14px', color: C.textSecondary, fontFamily: '"JetBrains Mono",monospace' }}>{t.duration_ms}ms</td>
                <td style={{ padding: '9px 14px' }}>
                  <span style={{ display: 'flex', gap: 4 }}>
                    {t.pii_flagged && <Eye size={13} style={{ color: C.orange }} aria-label="PII detected" />}
                  </span>
                </td>
                <td style={{ padding: '9px 14px', color: C.textMuted, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {t.input_preview ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
        <button
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '6px 12px', borderRadius: 6, border: `1px solid ${C.border}`,
            background: C.bgRaised, color: page === 1 ? C.textMuted : C.textSecondary,
            cursor: page === 1 ? 'not-allowed' : 'pointer', fontSize: 12,
          }}
        >
          <ChevronLeft size={14} /> Prev
        </button>
        <span style={{ color: C.textMuted, fontSize: 12 }}>Page {page} of {totalPages}</span>
        <button
          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '6px 12px', borderRadius: 6, border: `1px solid ${C.border}`,
            background: C.bgRaised, color: page >= totalPages ? C.textMuted : C.textSecondary,
            cursor: page >= totalPages ? 'not-allowed' : 'pointer', fontSize: 12,
          }}
        >
          Next <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}
