import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, AlertTriangle, ChevronRight, ChevronDown, Copy, Check } from 'lucide-react'
import { getTrace } from '../api/client'
import type { Span, TraceDetail } from '../types'

const C = {
  violet: '#7c3aed', cyan: '#06b6d4', green: '#22c55e',
  orange: '#f97316', red: '#ef4444', yellow: '#eab308', purple: '#a78bfa',
  card: '#0d1220', border: '#1e2d42',
  textPrimary: '#e2e8f0', textSecondary: '#94a3b8', textMuted: '#475569',
  bgRaised: '#111827', bgHover: '#1a2234',
}

const STATUS_COLORS: Record<string, string> = {
  success: C.green, error: C.red, timeout: C.yellow,
}

const SPAN_ICONS: Record<string, string> = {
  llm: '🤖', tool: '🔧', retrieval: '📚', chain: '🔗', agent: '🕵️',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? C.red
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '2px 10px', borderRadius: 9999,
      background: `${color}1a`, color, border: `1px solid ${color}33`, fontSize: 12, fontWeight: 500,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
      {status}
    </span>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button onClick={copy} style={{
      background: 'none', border: 'none', cursor: 'pointer',
      color: copied ? C.green : C.textMuted, display: 'flex', alignItems: 'center', gap: 4, fontSize: 11,
    }}>
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

// ── Span tree ─────────────────────────────────────────────────────────────────

interface SpanNode extends Span { children: SpanNode[] }

function buildTree(spans: Span[]): SpanNode[] {
  const map = new Map<string, SpanNode>()
  spans.forEach(s => map.set(s.id, { ...s, children: [] }))
  const roots: SpanNode[] = []
  spans.forEach(s => {
    if (s.parent_span_id && map.has(s.parent_span_id)) {
      map.get(s.parent_span_id)!.children.push(map.get(s.id)!)
    } else {
      roots.push(map.get(s.id)!)
    }
  })
  return roots
}

function SpanNodeRow({ node, depth, totalMs }: { node: SpanNode; depth: number; totalMs: number }) {
  const [open, setOpen] = useState(depth === 0)
  const [expanded, setExpanded] = useState(false)
  const hasChildren = node.children.length > 0
  const durationMs = node.duration_ms ?? 0
  const barPct = totalMs > 0 ? Math.max(2, (durationMs / totalMs) * 100) : 2
  const statusColor = STATUS_COLORS[node.status] ?? C.green
  const icon = SPAN_ICONS[node.span_type] ?? '◆'

  return (
    <div>
      <div
        onClick={() => setExpanded(e => !e)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 12px', paddingLeft: 12 + depth * 20,
          cursor: 'pointer', borderBottom: `1px solid ${C.border}33`,
          background: expanded ? C.bgHover : 'transparent',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = C.bgHover)}
        onMouseLeave={e => (e.currentTarget.style.background = expanded ? C.bgHover : 'transparent')}
      >
        {/* expand/collapse children */}
        {hasChildren ? (
          <button onClick={e => { e.stopPropagation(); setOpen(o => !o) }} style={{
            background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted,
            padding: 0, display: 'flex', flexShrink: 0,
          }}>
            {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </button>
        ) : (
          <span style={{ width: 13, flexShrink: 0 }} />
        )}

        <span style={{ fontSize: 14, flexShrink: 0 }}>{icon}</span>
        <span style={{ color: C.textPrimary, fontSize: 12, fontWeight: 500, minWidth: 120 }}>{node.name}</span>

        {/* duration bar */}
        <div style={{ flex: 1, height: 4, background: C.border, borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ width: `${barPct}%`, height: '100%', background: C.cyan, borderRadius: 2 }} />
        </div>

        <span style={{ color: C.cyan, fontFamily: '"JetBrains Mono",monospace', fontSize: 11, width: 60, textAlign: 'right', flexShrink: 0 }}>
          {durationMs}ms
        </span>
        {node.cost_usd > 0 && (
          <span style={{ color: C.orange, fontFamily: '"JetBrains Mono",monospace', fontSize: 11, width: 70, textAlign: 'right', flexShrink: 0 }}>
            ${node.cost_usd.toFixed(5)}
          </span>
        )}
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor, flexShrink: 0 }} />
      </div>

      {/* expanded IO */}
      {expanded && (node.input_text || node.output_text) && (
        <div style={{ paddingLeft: 12 + depth * 20 + 33, paddingRight: 12, paddingBottom: 10, background: `${C.bgRaised}88` }}>
          {node.input_text && (
            <div style={{ marginTop: 8 }}>
              <p style={{ color: C.textMuted, fontSize: 10, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Input</p>
              <pre style={{
                fontFamily: '"JetBrains Mono",monospace', fontSize: 11, color: C.textSecondary,
                whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0,
                background: C.bgRaised, padding: '8px 10px', borderRadius: 6, border: `1px solid ${C.border}`,
                maxHeight: 120, overflowY: 'auto',
              }}>{node.input_text}</pre>
            </div>
          )}
          {node.output_text && (
            <div style={{ marginTop: 8 }}>
              <p style={{ color: C.textMuted, fontSize: 10, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Output</p>
              <pre style={{
                fontFamily: '"JetBrains Mono",monospace', fontSize: 11, color: C.textSecondary,
                whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0,
                background: C.bgRaised, padding: '8px 10px', borderRadius: 6, border: `1px solid ${C.border}`,
                maxHeight: 120, overflowY: 'auto',
              }}>{node.output_text}</pre>
            </div>
          )}
        </div>
      )}

      {open && node.children.map(child => (
        <SpanNodeRow key={child.id} node={child} depth={depth + 1} totalMs={totalMs} />
      ))}
    </div>
  )
}

// ── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = ['Overview', 'Span Tree', 'Quality Scores', 'Raw JSON']

// ── Main page ─────────────────────────────────────────────────────────────────

export default function TraceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState(0)

  const { data: trace, isLoading, error } = useQuery<TraceDetail>({
    queryKey: ['trace', id],
    queryFn: () => getTrace(id!),
    enabled: !!id,
  })

  if (isLoading) {
    return <div style={{ color: C.textMuted, padding: 40, textAlign: 'center' }}>Loading trace…</div>
  }
  if (error || !trace) {
    return <div style={{ color: C.red, padding: 40, textAlign: 'center' }}>Trace not found.</div>
  }

  const statusColor = STATUS_COLORS[trace.status] ?? C.red
  const spanTree = buildTree(trace.spans)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1100 }}>

      {/* Back button */}
      <button onClick={() => navigate('/traces')} style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, width: 'fit-content',
        background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, fontSize: 13,
        padding: 0,
      }}>
        <ArrowLeft size={14} /> Back to Traces
      </button>

      {/* PII banner */}
      {trace.pii_flagged && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 16px', borderRadius: 8, border: `1px solid ${C.red}66`,
          background: `${C.red}12`, color: C.red, fontSize: 13,
        }}>
          <AlertTriangle size={15} />
          PII detected in this trace. Sensitive data has been redacted from stored text.
        </div>
      )}

      {/* Header card */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderTop: `3px solid ${statusColor}`, borderRadius: 12, padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <StatusBadge status={trace.status} />
              <span style={{ fontFamily: '"JetBrains Mono",monospace', fontSize: 12, color: C.textMuted }}>
                {trace.id}
              </span>
              <CopyButton text={trace.id} />
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
              {[
                { label: 'Model', value: trace.model, color: C.violet },
                { label: 'Provider', value: trace.provider, color: C.cyan },
                { label: 'Environment', value: trace.environment, color: C.textSecondary },
                { label: 'App', value: trace.app_name ?? '—', color: C.textSecondary },
                { label: 'User', value: trace.user_id ?? 'anonymous', color: C.textSecondary },
              ].map(({ label, value, color }) => (
                <div key={label}>
                  <p style={{ color: C.textMuted, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{label}</p>
                  <p style={{ color, fontSize: 13, fontFamily: '"JetBrains Mono",monospace' }}>{value}</p>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 24, flexShrink: 0 }}>
            {[
              { label: 'Duration', value: `${trace.duration_ms}ms`, color: trace.duration_ms > 3000 ? C.red : C.cyan },
              { label: 'Cost', value: `$${trace.cost_usd.toFixed(5)}`, color: C.orange },
              { label: 'Tokens', value: `${trace.prompt_tokens} → ${trace.completion_tokens}`, color: C.textSecondary },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ textAlign: 'right' }}>
                <p style={{ color: C.textMuted, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{label}</p>
                <p style={{ color, fontSize: 14, fontFamily: '"JetBrains Mono",monospace', fontWeight: 600 }}>{value}</p>
              </div>
            ))}
          </div>
        </div>
        <p style={{ color: C.textMuted, fontSize: 11, marginTop: 12, fontFamily: '"JetBrains Mono",monospace' }}>
          {new Date(trace.created_at).toLocaleString()}
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${C.border}` }}>
        {TABS.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveTab(i)}
            style={{
              padding: '10px 20px', background: 'none', border: 'none', cursor: 'pointer',
              color: activeTab === i ? C.violet : C.textMuted,
              borderBottom: activeTab === i ? `2px solid ${C.violet}` : '2px solid transparent',
              fontSize: 13, fontWeight: activeTab === i ? 600 : 400, transition: 'color 0.15s',
            }}
          >
            {tab}
            {tab === 'Span Tree' && trace.spans.length > 0 && (
              <span style={{ marginLeft: 6, fontSize: 10, background: `${C.violet}22`, color: C.violet, padding: '1px 6px', borderRadius: 9999 }}>
                {trace.spans.length}
              </span>
            )}
            {tab === 'Quality Scores' && trace.scores.length > 0 && (
              <span style={{ marginLeft: 6, fontSize: 10, background: `${C.green}22`, color: C.green, padding: '1px 6px', borderRadius: 9999 }}>
                {trace.scores.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab 1 — Overview */}
      {activeTab === 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {(['input_text', 'output_text'] as const).map(field => {
            const label = field === 'input_text' ? 'Input / Prompt' : 'Output / Completion'
            const text = trace[field] ?? ''
            return (
              <div key={field} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <p style={{ color: C.textSecondary, fontSize: 12, fontWeight: 600 }}>{label}</p>
                  {text && <CopyButton text={text} />}
                </div>
                <pre style={{
                  fontFamily: '"JetBrains Mono",monospace', fontSize: 12, color: C.textPrimary,
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0,
                  maxHeight: 400, overflowY: 'auto', lineHeight: 1.7,
                }}>
                  {text || <span style={{ color: C.textMuted, fontStyle: 'italic' }}>empty</span>}
                </pre>
              </div>
            )
          })}
          {/* Tags row */}
          {Object.keys(trace.tags).length > 0 && (
            <div style={{ gridColumn: '1 / -1', background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
              <p style={{ color: C.textSecondary, fontSize: 12, fontWeight: 600, marginBottom: 10 }}>Tags</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {Object.entries(trace.tags).map(([k, v]) => (
                  <span key={k} style={{
                    padding: '3px 10px', borderRadius: 6, fontSize: 11,
                    background: `${C.violet}15`, color: C.violet, border: `1px solid ${C.violet}33`,
                    fontFamily: '"JetBrains Mono",monospace',
                  }}>
                    {k}: {v}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2 — Span Tree */}
      {activeTab === 1 && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
          {trace.spans.length === 0 ? (
            <p style={{ color: C.textMuted, padding: 32, textAlign: 'center', fontSize: 13 }}>No spans recorded for this trace.</p>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 8, padding: '10px 12px', borderBottom: `1px solid ${C.border}`, color: C.textMuted, fontSize: 11 }}>
                <span style={{ flex: 1, paddingLeft: 21 }}>Span</span>
                <span style={{ width: 60, textAlign: 'right' }}>Duration</span>
                <span style={{ width: 70, textAlign: 'right' }}>Cost</span>
                <span style={{ width: 6 }} />
              </div>
              {spanTree.map(node => (
                <SpanNodeRow key={node.id} node={node} depth={0} totalMs={trace.duration_ms || 1} />
              ))}
            </>
          )}
        </div>
      )}

      {/* Tab 3 — Quality Scores */}
      {activeTab === 2 && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
          {trace.scores.length === 0 ? (
            <p style={{ color: C.textMuted, padding: 32, textAlign: 'center', fontSize: 13 }}>No quality scores attached to this trace.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  {['Score Name', 'Value', 'Bar', 'Source', 'Comment'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: C.textMuted, fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {trace.scores.map((s, i) => {
                  const pct = Math.round(s.value * 100)
                  const barColor = s.value >= 0.7 ? C.green : s.value >= 0.4 ? C.yellow : C.red
                  return (
                    <tr key={s.id} style={{ borderBottom: `1px solid ${C.border}33`, background: i % 2 === 1 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                      <td style={{ padding: '10px 16px', fontFamily: '"JetBrains Mono",monospace', color: C.textPrimary, fontWeight: 500 }}>{s.name}</td>
                      <td style={{ padding: '10px 16px', fontFamily: '"JetBrains Mono",monospace', color: barColor }}>{s.value.toFixed(3)}</td>
                      <td style={{ padding: '10px 16px', minWidth: 120 }}>
                        <div style={{ height: 6, background: C.border, borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: barColor, borderRadius: 3 }} />
                        </div>
                        <span style={{ fontSize: 10, color: C.textMuted }}>{pct}%</span>
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <span style={{
                          padding: '2px 8px', borderRadius: 9999, fontSize: 10,
                          background: s.source === 'human' ? `${C.cyan}1a` : `${C.violet}1a`,
                          color: s.source === 'human' ? C.cyan : C.violet,
                          border: `1px solid ${s.source === 'human' ? C.cyan : C.violet}33`,
                        }}>
                          {s.source}
                        </span>
                      </td>
                      <td style={{ padding: '10px 16px', color: C.textMuted, maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s.comment ?? '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab 4 — Raw JSON */}
      {activeTab === 3 && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
            <CopyButton text={JSON.stringify(trace, null, 2)} />
          </div>
          <pre style={{
            fontFamily: '"JetBrains Mono",monospace', fontSize: 11, color: C.textSecondary,
            whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0,
            maxHeight: 600, overflowY: 'auto', lineHeight: 1.6,
          }}>
            {JSON.stringify(trace, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
