import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Activity, DollarSign, Timer, AlertCircle, Star,
  ShieldAlert, Bug, Eye, Users, TrendingUp, TrendingDown,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { getMetricsSummary, getVolume, getModelStats } from '../api/client'

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  violet: '#7c3aed', cyan: '#06b6d4', green: '#22c55e',
  orange: '#f97316', red: '#ef4444', yellow: '#eab308',
  purple: '#a78bfa', card: '#0d1220', border: '#1e2d42',
  textPrimary: '#e2e8f0', textSecondary: '#94a3b8', textMuted: '#475569',
  bgRaised: '#111827',
}

const CHART_COLORS = [C.violet, C.cyan, C.green, C.orange, C.purple]

// ── Shared components ─────────────────────────────────────────────────────────

function Card({ accent, children }: { accent: string; children: ReactNode }) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`,
      borderTop: `3px solid ${accent}`, borderRadius: 12, padding: 20,
    }}>
      {children}
    </div>
  )
}

function DeltaBadge({ value, invertGood = false }: { value: number; invertGood?: boolean }) {
  const positive = invertGood ? value < 0 : value > 0
  const color = positive ? C.green : C.red
  const Icon = positive ? TrendingUp : TrendingDown
  if (value === 0) return null
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      padding: '2px 7px', borderRadius: 9999, fontSize: 11, fontWeight: 500,
      background: `${color}1a`, color, border: `1px solid ${color}33`,
    }}>
      <Icon size={10} />
      {Math.abs(value).toFixed(1)}%
    </span>
  )
}

function MetricCard({
  icon: Icon, label, value, delta, accent, invertGood = false, mono = true,
}: {
  icon: React.ElementType; label: string; value: string
  delta?: number; accent: string; invertGood?: boolean; mono?: boolean
}) {
  return (
    <Card accent={accent}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <p style={{ color: C.textSecondary, fontSize: 12, marginBottom: 8 }}>{label}</p>
          <p style={{
            fontSize: 26, fontWeight: 700, color: C.textPrimary, lineHeight: 1,
            fontFamily: mono ? '"JetBrains Mono", monospace' : 'Inter, sans-serif',
          }}>{value}</p>
          {delta !== undefined && (
            <div style={{ marginTop: 8 }}>
              <DeltaBadge value={delta} invertGood={invertGood} />
            </div>
          )}
        </div>
        <Icon size={20} style={{ color: accent, flexShrink: 0 }} />
      </div>
    </Card>
  )
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 style={{ fontSize: 13, fontWeight: 600, color: C.textSecondary, marginBottom: 12, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
      {children}
    </h2>
  )
}

// ── Custom tooltip ────────────────────────────────────────────────────────────
function DarkTooltip({ active, payload, label }: { active?: boolean; payload?: {name: string; value: number; color: string}[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: C.bgRaised, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
      <p style={{ color: C.textSecondary, marginBottom: 6 }}>{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color, fontFamily: '"JetBrains Mono", monospace' }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Overview() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400_000).toISOString().replace(/\.\d+Z$/, 'Z')
  const now = new Date().toISOString().replace(/\.\d+Z$/, 'Z')

  const { data: m, isLoading: mLoading } = useQuery({
    queryKey: ['metrics-summary', sevenDaysAgo],
    queryFn: () => getMetricsSummary(sevenDaysAgo, now),
    refetchInterval: 30_000,
  })

  const { data: volume = [] } = useQuery({
    queryKey: ['metrics-volume', sevenDaysAgo],
    queryFn: () => getVolume(sevenDaysAgo, now),
    refetchInterval: 60_000,
  })

  const { data: modelStats = [] } = useQuery({
    queryKey: ['metrics-models', sevenDaysAgo],
    queryFn: () => getModelStats(sevenDaysAgo, now),
    refetchInterval: 60_000,
  })

  const fmt = (n?: number, digits = 0) =>
    n === undefined ? '—' : n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })

  const volData = volume.map(v => ({
    day: v.timestamp.slice(5, 10), // MM-DD
    Success: v.requests - v.errors,
    Errors: v.errors,
  }))

  const pieData = modelStats.slice(0, 5).map((s, i) => ({
    name: s.model, value: s.requests, fill: CHART_COLORS[i],
  }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* ── App description ─────────────────────────────────────────── */}
      <div style={{ borderLeft: `3px solid ${C.violet}`, paddingLeft: 14 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: C.textPrimary, marginBottom: 6 }}>Overview</h1>
        <p style={{ color: C.textSecondary, fontSize: 13, lineHeight: 1.6 }}>
          CortexAI monitors every LLM call, agent step, cost, and safety event across your AI applications in real time —
          giving engineering and product teams a single pane of glass for latency, spend, quality, hallucination risk,
          PII exposure, and security threats.
        </p>
      </div>

      {/* ── Row 1: Core operational ─────────────────────────────────── */}
      <div>
        <SectionTitle>Core Operations — Last 7 Days</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14 }}>
          <MetricCard icon={Activity}    label="Total Requests"  value={fmt(m?.total_requests)}                  delta={m?.requests_delta_pct}                accent={C.violet} />
          <MetricCard icon={DollarSign}  label="Total Cost"      value={m ? `$${m.total_cost_usd.toFixed(4)}` : '—'} delta={m?.cost_delta_pct}            accent={C.orange} />
          <MetricCard icon={Timer}       label="P95 Latency"     value={m ? `${fmt(m.p95_latency_ms)}ms` : '—'} delta={m?.latency_delta_pct}  invertGood   accent={C.cyan}   />
          <MetricCard icon={AlertCircle} label="Error Rate"      value={m ? `${m.error_rate_pct.toFixed(1)}%` : '—'} delta={m?.error_delta_pct} invertGood  accent={C.red}    />
          <MetricCard icon={Star}        label="Avg Quality"     value={fmt(m?.avg_quality_score, 2)}            delta={m?.quality_delta_pct}              accent={C.green}  />
        </div>
      </div>

      {/* ── Row 2: AI safety ────────────────────────────────────────── */}
      <div>
        <SectionTitle>AI Safety &amp; Risk Signals</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          <MetricCard icon={ShieldAlert} label="Avg Risk Score"     value={fmt(m?.avg_risk_score, 3)}                accent={C.red}    invertGood />
          <MetricCard icon={Bug}         label="Security Events"    value={fmt(m?.security_events)}                  accent={C.yellow} invertGood />
          <MetricCard icon={Eye}         label="PII Events"         value={fmt(m?.pii_events)}                        accent={C.orange} invertGood />
          <MetricCard icon={Users}       label="Active Users"       value={fmt(m?.active_users)}                      accent={C.purple} />
        </div>
      </div>

      {/* ── Row 3: Hallucination + toxicity breakdown ────────────────── */}
      <div>
        <SectionTitle>Quality Breakdown</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          <Card accent={C.cyan}>
            <p style={{ color: C.textSecondary, fontSize: 12, marginBottom: 8 }}>Hallucination Rate</p>
            <p style={{ fontSize: 26, fontWeight: 700, fontFamily: '"JetBrains Mono",monospace', color: m && m.hallucination_rate_pct > 15 ? C.red : C.green }}>
              {m ? `${m.hallucination_rate_pct.toFixed(1)}%` : '—'}
            </p>
            <p style={{ color: C.textMuted, fontSize: 11, marginTop: 8 }}>% of responses with factual drift</p>
          </Card>
          <Card accent={C.orange}>
            <p style={{ color: C.textSecondary, fontSize: 12, marginBottom: 8 }}>Avg Toxicity Score</p>
            <p style={{ fontSize: 26, fontWeight: 700, fontFamily: '"JetBrains Mono",monospace', color: m && m.avg_toxicity > 0.15 ? C.red : C.green }}>
              {m ? m.avg_toxicity.toFixed(3) : '—'}
            </p>
            <p style={{ color: C.textMuted, fontSize: 11, marginTop: 8 }}>0 = clean · 1 = highly toxic</p>
          </Card>
          <Card accent={C.red}>
            <p style={{ color: C.textSecondary, fontSize: 12, marginBottom: 8 }}>High-Risk Traces</p>
            <p style={{ fontSize: 26, fontWeight: 700, fontFamily: '"JetBrains Mono",monospace', color: m && (m.high_risk_count ?? 0) > 0 ? C.red : C.green }}>
              {fmt(m?.high_risk_count)}
            </p>
            <p style={{ color: C.textMuted, fontSize: 11, marginTop: 8 }}>risk_score &gt; 0.7 in window</p>
          </Card>
        </div>
      </div>

      {/* ── Row 4: Charts ───────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '60fr 40fr', gap: 16 }}>

        {/* Volume bar chart */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
          <p style={{ color: C.textPrimary, fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
            Request Volume — Daily
          </p>
          {volData.length === 0 ? (
            <p style={{ color: C.textMuted, fontSize: 12, textAlign: 'center', paddingTop: 60 }}>No data</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={volData} barCategoryGap="30%">
                <CartesianGrid vertical={false} stroke={C.border} />
                <XAxis dataKey="day" tick={{ fill: C.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: C.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<DarkTooltip />} />
                <Bar dataKey="Success" stackId="v" fill={C.violet} radius={[0, 0, 0, 0]} />
                <Bar dataKey="Errors"  stackId="v" fill={C.red}    radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Model distribution donut */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
          <p style={{ color: C.textPrimary, fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
            Model Distribution
          </p>
          {pieData.length === 0 ? (
            <p style={{ color: C.textMuted, fontSize: 12, textAlign: 'center', paddingTop: 60 }}>No data</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80}
                     dataKey="value" paddingAngle={3}>
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => [`${v} reqs`, '']}
                  contentStyle={{ background: C.bgRaised, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }} />
                <Legend iconType="circle" iconSize={8}
                  formatter={(v: string) => <span style={{ color: C.textSecondary, fontSize: 11 }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Row 5: Model table ───────────────────────────────────────── */}
      {modelStats.length > 0 && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
          <p style={{ color: C.textPrimary, fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
            Model Performance Breakdown
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                {['Model', 'Provider', 'Requests', 'Total Cost', 'Avg Latency', 'Error Rate'].map(h => (
                  <th key={h} style={{ textAlign: 'left', color: C.textMuted, padding: '4px 12px 10px 0', fontWeight: 500, borderBottom: `1px solid ${C.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {modelStats.map((s, i) => (
                <tr key={s.model} style={{ background: i % 2 === 1 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                  <td style={{ padding: '9px 12px 9px 0', fontFamily: '"JetBrains Mono",monospace', color: C.textPrimary, borderBottom: `1px solid ${C.border}33` }}>{s.model}</td>
                  <td style={{ padding: '9px 12px 9px 0', color: C.textSecondary, borderBottom: `1px solid ${C.border}33` }}>{s.provider}</td>
                  <td style={{ padding: '9px 12px 9px 0', fontFamily: '"JetBrains Mono",monospace', color: C.textPrimary, borderBottom: `1px solid ${C.border}33` }}>{s.requests.toLocaleString()}</td>
                  <td style={{ padding: '9px 12px 9px 0', fontFamily: '"JetBrains Mono",monospace', color: C.orange, borderBottom: `1px solid ${C.border}33` }}>${s.cost_usd.toFixed(4)}</td>
                  <td style={{ padding: '9px 12px 9px 0', fontFamily: '"JetBrains Mono",monospace', color: C.cyan, borderBottom: `1px solid ${C.border}33` }}>{s.avg_latency_ms}ms</td>
                  <td style={{ padding: '9px 12px 9px 0', fontFamily: '"JetBrains Mono",monospace', color: s.error_rate_pct > 15 ? C.red : C.textPrimary, borderBottom: `1px solid ${C.border}33` }}>{s.error_rate_pct.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {mLoading && (
        <p style={{ color: C.textMuted, fontSize: 12, textAlign: 'center' }}>Loading metrics…</p>
      )}
    </div>
  )
}
