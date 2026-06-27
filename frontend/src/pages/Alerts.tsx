import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, BellOff, CheckCircle, AlertTriangle, Clock, Zap } from 'lucide-react'
import { getAlerts, getAlertEvents, toggleAlert } from '../api/client'

const C = {
  violet: '#7c3aed', cyan: '#06b6d4', green: '#22c55e',
  orange: '#f97316', red: '#ef4444', yellow: '#eab308',
  card: '#0d1220', border: '#1e2d42',
  textPrimary: '#e2e8f0', textSecondary: '#94a3b8', textMuted: '#475569',
  bgRaised: '#111827',
}

const CONDITION_LABELS: Record<string, string> = {
  gt: 'exceeds', lt: 'falls below', eq: 'equals',
}

const METRIC_UNITS: Record<string, string> = {
  error_rate_pct: '%', cost_usd: '$', quality_score: '', security_events: '',
  p95_latency_ms: 'ms',
}

function formatMetricValue(metric: string, value: number) {
  const unit = METRIC_UNITS[metric] ?? ''
  if (unit === '$') return `$${value.toFixed(2)}`
  if (unit === '%') return `${value.toFixed(1)}%`
  if (unit === 'ms') return `${value}ms`
  return String(value)
}

function timeSince(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3600_000)
  const d = Math.floor(h / 24)
  if (d > 0) return `${d}d ago`
  if (h > 0) return `${h}h ago`
  return `${Math.floor(diff / 60_000)}m ago`
}

export default function Alerts() {
  const qc = useQueryClient()

  const { data: rules = [], isLoading: rulesLoading } = useQuery({
    queryKey: ['alerts'],
    queryFn: getAlerts,
    refetchInterval: 30_000,
  })

  const { data: events = [] } = useQuery({
    queryKey: ['alert-events'],
    queryFn: getAlertEvents,
    refetchInterval: 30_000,
  })

  const { mutate: toggle, isPending } = useMutation({
    mutationFn: toggleAlert,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
  })

  const openCount = events.filter(e => !e.resolved_at).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: C.textPrimary, marginBottom: 4 }}>Alerts</h1>
        <p style={{ color: C.textSecondary, fontSize: 13 }}>
          Threshold-based rules that fire when a metric crosses a boundary. {openCount > 0 && <span style={{ color: C.red, fontWeight: 600 }}>{openCount} currently open.</span>}
        </p>
      </div>

      {/* Summary strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        {[
          { label: 'Total Rules', value: rules.length, icon: Bell, color: C.violet },
          { label: 'Enabled Rules', value: rules.filter(r => r.enabled).length, icon: Zap, color: C.green },
          { label: 'Open Incidents', value: openCount, icon: AlertTriangle, color: openCount > 0 ? C.red : C.green },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} style={{ background: C.card, border: `1px solid ${C.border}`, borderTop: `3px solid ${color}`, borderRadius: 12, padding: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ color: C.textSecondary, fontSize: 12, marginBottom: 6 }}>{label}</p>
              <p style={{ fontSize: 28, fontWeight: 700, color: C.textPrimary, fontFamily: '"JetBrains Mono",monospace', lineHeight: 1 }}>{value}</p>
            </div>
            <Icon size={22} style={{ color }} />
          </div>
        ))}
      </div>

      {/* Alert rules table */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}` }}>
          <p style={{ color: C.textPrimary, fontSize: 13, fontWeight: 600 }}>Alert Rules</p>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.border}` }}>
              {['Name', 'Condition', 'Window', 'Channels', 'Status', ''].map(h => (
                <th key={h} style={{ textAlign: 'left', color: C.textMuted, fontWeight: 500, padding: '9px 16px' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rulesLoading && (
              <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: C.textMuted }}>Loading…</td></tr>
            )}
            {rules.map((rule, i) => (
              <tr key={rule.id} style={{ borderBottom: `1px solid ${C.border}33`, background: i % 2 === 1 ? 'rgba(255,255,255,0.015)' : 'transparent' }}>
                <td style={{ padding: '10px 16px', color: C.textPrimary, fontWeight: 500 }}>{rule.name}</td>
                <td style={{ padding: '10px 16px', color: C.textSecondary, fontFamily: '"JetBrains Mono",monospace', fontSize: 11 }}>
                  {rule.metric} {CONDITION_LABELS[rule.condition] ?? rule.condition} {formatMetricValue(rule.metric, rule.threshold)}
                </td>
                <td style={{ padding: '10px 16px', color: C.textMuted }}>{rule.window_minutes}m window</td>
                <td style={{ padding: '10px 16px' }}>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {rule.channels.map(ch => (
                      <span key={ch} style={{ padding: '1px 6px', borderRadius: 9999, background: `${C.cyan}15`, color: C.cyan, fontSize: 10, border: `1px solid ${C.cyan}30` }}>{ch}</span>
                    ))}
                  </div>
                </td>
                <td style={{ padding: '10px 16px' }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '2px 8px', borderRadius: 9999, fontSize: 11,
                    background: rule.enabled ? `${C.green}1a` : `${C.textMuted}1a`,
                    color: rule.enabled ? C.green : C.textMuted,
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: rule.enabled ? C.green : C.textMuted }} />
                    {rule.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </td>
                <td style={{ padding: '10px 16px' }}>
                  <button
                    onClick={() => toggle(rule.id)}
                    disabled={isPending}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
                      border: `1px solid ${C.border}`, background: C.bgRaised,
                      color: rule.enabled ? C.red : C.green, fontSize: 11,
                    }}
                  >
                    {rule.enabled ? <><BellOff size={11} /> Disable</> : <><Bell size={11} /> Enable</>}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Events timeline */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
        <p style={{ color: C.textPrimary, fontSize: 13, fontWeight: 600, marginBottom: 20 }}>
          Recent Alert Events
          <span style={{ marginLeft: 8, color: C.textMuted, fontWeight: 400, fontSize: 12 }}>({events.length} total)</span>
        </p>
        {events.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px 0', color: C.textMuted, fontSize: 13 }}>
            <CheckCircle size={28} style={{ color: C.green, marginBottom: 8 }} />
            <p>No alert events — all clear.</p>
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {events.map(ev => {
            const open = !ev.resolved_at
            return (
              <div key={ev.id} style={{
                display: 'flex', alignItems: 'flex-start', gap: 14,
                padding: '12px 16px', borderRadius: 8,
                background: open ? `${C.red}0a` : C.bgRaised,
                border: `1px solid ${open ? C.red + '30' : C.border}`,
              }}>
                <div style={{ marginTop: 2 }}>
                  {open
                    ? <AlertTriangle size={15} style={{ color: C.red }} />
                    : <CheckCircle size={15} style={{ color: C.green }} />
                  }
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: C.textPrimary, fontWeight: 500, fontSize: 13 }}>{ev.rule_name}</span>
                    <span style={{ color: open ? C.red : C.green, fontSize: 11, padding: '1px 8px', borderRadius: 9999, background: open ? `${C.red}15` : `${C.green}15` }}>
                      {open ? 'OPEN' : 'RESOLVED'}
                    </span>
                  </div>
                  <p style={{ color: C.textMuted, fontSize: 12, marginTop: 3 }}>
                    {ev.metric} = <span style={{ color: open ? C.red : C.textSecondary, fontFamily: '"JetBrains Mono",monospace' }}>
                      {formatMetricValue(ev.metric, ev.metric_value)}
                    </span>
                  </p>
                  <div style={{ display: 'flex', gap: 16, marginTop: 6 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: C.textMuted, fontSize: 11 }}>
                      <Clock size={10} /> Fired {timeSince(ev.triggered_at)}
                    </span>
                    {ev.resolved_at && (
                      <span style={{ color: C.textMuted, fontSize: 11 }}>
                        · Resolved {timeSince(ev.resolved_at)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
