import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Star, AlertTriangle, ShieldAlert, Zap } from 'lucide-react'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts'
import { getMetricsSummary, getModelStats } from '../api/client'

const C = {
  violet: '#7c3aed', cyan: '#06b6d4', green: '#22c55e',
  orange: '#f97316', red: '#ef4444', yellow: '#eab308',
  card: '#0d1220', border: '#1e2d42',
  textPrimary: '#e2e8f0', textSecondary: '#94a3b8', textMuted: '#475569',
  bgRaised: '#111827',
}

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

function ScoreGauge({ label, value, good = true }: { label: string; value: number; good?: boolean }) {
  const pct = Math.round(value * 100)
  const color = good ? (pct > 75 ? C.green : pct > 50 ? C.yellow : C.red) : (pct < 10 ? C.green : pct < 30 ? C.yellow : C.red)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
        <span style={{ color: C.textSecondary }}>{label}</span>
        <span style={{ color, fontFamily: '"JetBrains Mono",monospace', fontWeight: 600 }}>{value.toFixed(3)}</span>
      </div>
      <div style={{ height: 6, background: C.border, borderRadius: 3 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.5s' }} />
      </div>
    </div>
  )
}

export default function Quality() {
  const sevenAgo = new Date(Date.now() - 7 * 86400_000).toISOString().replace(/\.\d+Z$/, 'Z')
  const now = new Date().toISOString().replace(/\.\d+Z$/, 'Z')

  const { data: m } = useQuery({
    queryKey: ['metrics-summary-quality', sevenAgo],
    queryFn: () => getMetricsSummary(sevenAgo, now),
    refetchInterval: 30_000,
  })

  const { data: modelStats = [] } = useQuery({
    queryKey: ['metrics-models-quality', sevenAgo],
    queryFn: () => getModelStats(sevenAgo, now),
    refetchInterval: 60_000,
  })

  const radarData = m ? [
    { metric: 'Quality',      value: Math.round(m.avg_quality_score * 100) },
    { metric: 'Faithfulness', value: 100 - Math.round(m.hallucination_rate_pct) },
    { metric: 'Safety',       value: Math.round((1 - m.avg_risk_score) * 100) },
    { metric: 'Cleanliness',  value: Math.round((1 - m.avg_toxicity) * 100) },
    { metric: 'Reliability',  value: Math.round(100 - m.error_rate_pct) },
  ] : []

  const errorBarData = modelStats.map(s => ({
    model: s.model.replace('claude-', 'c-').replace('gemini-', 'g-'),
    'Error %': s.error_rate_pct,
  }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: C.textPrimary, marginBottom: 4 }}>Quality</h1>
        <p style={{ color: C.textSecondary, fontSize: 13 }}>
          Hallucination, faithfulness, toxicity, and risk scores across all models — last 7 days.
        </p>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <Card accent={C.green}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <p style={{ color: C.textSecondary, fontSize: 12, marginBottom: 8 }}>Avg Quality Score</p>
              <p style={{ fontSize: 26, fontWeight: 700, color: C.textPrimary, fontFamily: '"JetBrains Mono",monospace', lineHeight: 1 }}>
                {m?.avg_quality_score.toFixed(3) ?? '—'}
              </p>
              <p style={{ color: C.textMuted, fontSize: 11, marginTop: 6 }}>0 = irrelevant · 1 = perfect</p>
            </div>
            <Star size={20} style={{ color: C.green }} />
          </div>
        </Card>
        <Card accent={C.yellow}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <p style={{ color: C.textSecondary, fontSize: 12, marginBottom: 8 }}>Hallucination Rate</p>
              <p style={{ fontSize: 26, fontWeight: 700, fontFamily: '"JetBrains Mono",monospace', lineHeight: 1,
                color: m && m.hallucination_rate_pct > 15 ? C.red : C.green }}>
                {m ? `${m.hallucination_rate_pct.toFixed(1)}%` : '—'}
              </p>
              <p style={{ color: C.textMuted, fontSize: 11, marginTop: 6 }}>% with factual drift</p>
            </div>
            <AlertTriangle size={20} style={{ color: C.yellow }} />
          </div>
        </Card>
        <Card accent={C.orange}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <p style={{ color: C.textSecondary, fontSize: 12, marginBottom: 8 }}>Avg Toxicity</p>
              <p style={{ fontSize: 26, fontWeight: 700, fontFamily: '"JetBrains Mono",monospace', lineHeight: 1,
                color: m && m.avg_toxicity > 0.15 ? C.red : C.green }}>
                {m?.avg_toxicity.toFixed(3) ?? '—'}
              </p>
              <p style={{ color: C.textMuted, fontSize: 11, marginTop: 6 }}>0 = clean · 1 = toxic</p>
            </div>
            <Zap size={20} style={{ color: C.orange }} />
          </div>
        </Card>
        <Card accent={C.red}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <p style={{ color: C.textSecondary, fontSize: 12, marginBottom: 8 }}>High-Risk Traces</p>
              <p style={{ fontSize: 26, fontWeight: 700, fontFamily: '"JetBrains Mono",monospace', lineHeight: 1,
                color: m && (m.high_risk_count ?? 0) > 0 ? C.red : C.green }}>
                {m?.high_risk_count ?? '—'}
              </p>
              <p style={{ color: C.textMuted, fontSize: 11, marginTop: 6 }}>risk_score &gt; 0.7</p>
            </div>
            <ShieldAlert size={20} style={{ color: C.red }} />
          </div>
        </Card>
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Radar chart */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
          <p style={{ color: C.textPrimary, fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Overall Health Radar</p>
          <p style={{ color: C.textMuted, fontSize: 11, marginBottom: 16 }}>Composite view of five quality dimensions (higher = better)</p>
          {radarData.length === 0 ? (
            <p style={{ color: C.textMuted, fontSize: 12, textAlign: 'center', padding: 60 }}>No data</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                <PolarGrid stroke={C.border} />
                <PolarAngleAxis dataKey="metric" tick={{ fill: C.textSecondary, fontSize: 11 }} />
                <Radar dataKey="value" stroke={C.violet} fill={C.violet} fillOpacity={0.25} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Error rate by model */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
          <p style={{ color: C.textPrimary, fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Error Rate by Model</p>
          <p style={{ color: C.textMuted, fontSize: 11, marginBottom: 16 }}>% of requests that returned error or timeout</p>
          {errorBarData.length === 0 ? (
            <p style={{ color: C.textMuted, fontSize: 12, textAlign: 'center', padding: 60 }}>No data</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={errorBarData} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid horizontal={false} stroke={C.border} />
                <XAxis type="number" tick={{ fill: C.textMuted, fontSize: 11 }} axisLine={false} tickLine={false}
                  tickFormatter={(v: number) => `${v}%`} />
                <YAxis type="category" dataKey="model" tick={{ fill: C.textSecondary, fontSize: 11 }} axisLine={false} tickLine={false} width={90} />
                <Tooltip
                  contentStyle={{ background: C.bgRaised, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number) => [`${v.toFixed(1)}%`, 'Error rate']}
                />
                <Bar dataKey="Error %" fill={C.red} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Score gauges */}
      {m && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
          <p style={{ color: C.textPrimary, fontSize: 13, fontWeight: 600, marginBottom: 20 }}>Score Distribution — Current Period</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 40px' }}>
            <ScoreGauge label="Avg Quality (Relevance)" value={m.avg_quality_score} good />
            <ScoreGauge label="Avg Risk Score"          value={m.avg_risk_score}    good={false} />
            <ScoreGauge label="Avg Toxicity"            value={m.avg_toxicity}      good={false} />
            <ScoreGauge label="Clean Responses (1 - hall. rate)" value={1 - m.hallucination_rate_pct / 100} good />
          </div>
        </div>
      )}
    </div>
  )
}
