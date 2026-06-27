import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { DollarSign, TrendingUp, Cpu, CreditCard } from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend,
} from 'recharts'
import { getMetricsSummary, getCostBreakdown, getModelStats } from '../api/client'
import type { CostPoint } from '../types'

const C = {
  violet: '#7c3aed', cyan: '#06b6d4', green: '#22c55e',
  orange: '#f97316', red: '#ef4444', yellow: '#eab308', purple: '#a78bfa',
  card: '#0d1220', border: '#1e2d42',
  textPrimary: '#e2e8f0', textSecondary: '#94a3b8', textMuted: '#475569',
  bgRaised: '#111827',
}

const MODEL_COLORS = [C.violet, C.cyan, C.green, C.orange, C.yellow]

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

function MetricCard({ icon: Icon, label, value, sub, accent }: {
  icon: React.ElementType; label: string; value: string; sub?: string; accent: string
}) {
  return (
    <Card accent={accent}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ color: C.textSecondary, fontSize: 12, marginBottom: 8 }}>{label}</p>
          <p style={{ fontSize: 26, fontWeight: 700, color: C.textPrimary, fontFamily: '"JetBrains Mono",monospace', lineHeight: 1 }}>{value}</p>
          {sub && <p style={{ color: C.textMuted, fontSize: 11, marginTop: 6 }}>{sub}</p>}
        </div>
        <Icon size={20} style={{ color: accent }} />
      </div>
    </Card>
  )
}

function buildChartData(points: CostPoint[]) {
  const models = [...new Set(points.map(p => p.model))]
  const byDay = new Map<string, Record<string, number>>()
  for (const p of points) {
    if (!byDay.has(p.timestamp)) byDay.set(p.timestamp, {})
    byDay.get(p.timestamp)![p.model] = (byDay.get(p.timestamp)![p.model] ?? 0) + p.cost_usd
  }
  const days = [...byDay.keys()].sort()
  return {
    data: days.map(d => {
      const row: Record<string, string | number> = { day: d.slice(5) }
      for (const m of models) row[m] = parseFloat((byDay.get(d)![m] ?? 0).toFixed(4))
      return row
    }),
    models,
  }
}

export default function Cost() {
  const sevenAgo = new Date(Date.now() - 7 * 86400_000).toISOString().replace(/\.\d+Z$/, 'Z')
  const now = new Date().toISOString().replace(/\.\d+Z$/, 'Z')

  const { data: m } = useQuery({
    queryKey: ['metrics-summary-cost', sevenAgo],
    queryFn: () => getMetricsSummary(sevenAgo, now),
    refetchInterval: 30_000,
  })

  const { data: costPts = [] } = useQuery({
    queryKey: ['metrics-cost', sevenAgo],
    queryFn: () => getCostBreakdown(sevenAgo, now),
    refetchInterval: 60_000,
  })

  const { data: modelStats = [] } = useQuery({
    queryKey: ['metrics-models-cost', sevenAgo],
    queryFn: () => getModelStats(sevenAgo, now),
    refetchInterval: 60_000,
  })

  const { data: chartData, models } = buildChartData(costPts)

  const avgCostPerReq = m && m.total_requests > 0
    ? (m.total_cost_usd / m.total_requests * 100).toFixed(3)
    : '0.000'

  const topModel = modelStats.length > 0
    ? modelStats.reduce((a, b) => a.cost_usd > b.cost_usd ? a : b)
    : null

  const projectedMonthly = m
    ? (m.total_cost_usd / 7 * 30).toFixed(2)
    : '0.00'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: C.textPrimary, marginBottom: 4 }}>Cost Analysis</h1>
        <p style={{ color: C.textSecondary, fontSize: 13 }}>
          Token spend and cost efficiency across models and applications — last 7 days.
        </p>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <MetricCard icon={DollarSign} label="Total Spend (7d)" value={`$${m?.total_cost_usd.toFixed(4) ?? '—'}`} accent={C.orange} />
        <MetricCard icon={CreditCard} label="Avg Cost / Request" value={`¢${avgCostPerReq}`} sub="US cents per call" accent={C.yellow} />
        <MetricCard icon={Cpu}        label="Most Expensive Model" value={topModel?.model ?? '—'} sub={topModel ? `$${topModel.cost_usd.toFixed(4)} total` : undefined} accent={C.violet} />
        <MetricCard icon={TrendingUp} label="Projected Monthly" value={`$${projectedMonthly}`} sub="at current 7-day rate" accent={C.cyan} />
      </div>

      {/* Stacked area chart */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
        <p style={{ color: C.textPrimary, fontSize: 13, fontWeight: 600, marginBottom: 16 }}>Daily Cost by Model</p>
        {chartData.length === 0 ? (
          <p style={{ color: C.textMuted, fontSize: 12, textAlign: 'center', padding: 60 }}>No cost data</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData}>
              <defs>
                {models.map((m, i) => (
                  <linearGradient key={m} id={`grad${i}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={MODEL_COLORS[i % MODEL_COLORS.length]} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={MODEL_COLORS[i % MODEL_COLORS.length]} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid vertical={false} stroke={C.border} />
              <XAxis dataKey="day" tick={{ fill: C.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: C.textMuted, fontSize: 11 }} axisLine={false} tickLine={false}
                tickFormatter={(v: number) => `$${v.toFixed(3)}`} />
              <Tooltip
                contentStyle={{ background: C.bgRaised, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }}
                formatter={(v: number) => [`$${v.toFixed(4)}`, '']}
              />
              <Legend iconType="circle" iconSize={8}
                formatter={(v: string) => <span style={{ color: C.textSecondary, fontSize: 11 }}>{v}</span>} />
              {models.map((model, i) => (
                <Area
                  key={model} type="monotone" dataKey={model} stackId="cost"
                  stroke={MODEL_COLORS[i % MODEL_COLORS.length]}
                  fill={`url(#grad${i})`}
                  strokeWidth={1.5}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Per-model breakdown table */}
      {modelStats.length > 0 && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
          <p style={{ color: C.textPrimary, fontSize: 13, fontWeight: 600, marginBottom: 16 }}>Model Cost Breakdown</p>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                {['Model', 'Provider', 'Requests', 'Total Cost', '% of Spend', 'Avg Cost/Req'].map(h => (
                  <th key={h} style={{ textAlign: 'left', color: C.textMuted, padding: '4px 12px 10px 0', fontWeight: 500, borderBottom: `1px solid ${C.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {modelStats.map((s, i) => {
                const pct = m && m.total_cost_usd > 0 ? (s.cost_usd / m.total_cost_usd * 100).toFixed(1) : '0.0'
                const avgPerReq = s.requests > 0 ? (s.cost_usd / s.requests * 100).toFixed(3) : '0.000'
                return (
                  <tr key={s.model} style={{ background: i % 2 === 1 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                    <td style={{ padding: '9px 12px 9px 0', color: C.textPrimary, fontFamily: '"JetBrains Mono",monospace', borderBottom: `1px solid ${C.border}33` }}>{s.model}</td>
                    <td style={{ padding: '9px 12px 9px 0', color: C.textSecondary, borderBottom: `1px solid ${C.border}33` }}>{s.provider}</td>
                    <td style={{ padding: '9px 12px 9px 0', color: C.textPrimary, fontFamily: '"JetBrains Mono",monospace', borderBottom: `1px solid ${C.border}33` }}>{s.requests.toLocaleString()}</td>
                    <td style={{ padding: '9px 12px 9px 0', color: C.orange, fontFamily: '"JetBrains Mono",monospace', borderBottom: `1px solid ${C.border}33` }}>${s.cost_usd.toFixed(4)}</td>
                    <td style={{ padding: '9px 12px 9px 0', borderBottom: `1px solid ${C.border}33` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 4, background: C.border, borderRadius: 2 }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: C.violet, borderRadius: 2 }} />
                        </div>
                        <span style={{ color: C.textSecondary, fontFamily: '"JetBrains Mono",monospace', fontSize: 11, minWidth: 36 }}>{pct}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '9px 12px 9px 0', color: C.cyan, fontFamily: '"JetBrains Mono",monospace', borderBottom: `1px solid ${C.border}33` }}>¢{avgPerReq}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
