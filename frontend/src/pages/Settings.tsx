import { useQuery } from '@tanstack/react-query'
import { Activity, Database, Shield, Code, Info } from 'lucide-react'
import { getHealth } from '../api/client'

const C = {
  violet: '#7c3aed', cyan: '#06b6d4', green: '#22c55e',
  orange: '#f97316', red: '#ef4444', card: '#0d1220', border: '#1e2d42',
  textPrimary: '#e2e8f0', textSecondary: '#94a3b8', textMuted: '#475569',
  bgRaised: '#111827',
}

function Section({ icon: Icon, title, color, children }: {
  icon: React.ElementType; title: string; color: string; children: React.ReactNode
}) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 20px', borderBottom: `1px solid ${C.border}`, borderTop: `3px solid ${color}` }}>
        <Icon size={16} style={{ color }} />
        <p style={{ color: C.textPrimary, fontSize: 13, fontWeight: 600 }}>{title}</p>
      </div>
      <div style={{ padding: 20 }}>{children}</div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${C.border}33` }}>
      <span style={{ color: C.textSecondary, fontSize: 13 }}>{label}</span>
      <span style={{ color: C.textPrimary, fontSize: 13, fontFamily: '"JetBrains Mono",monospace' }}>{value}</span>
    </div>
  )
}

const PYTHON_SNIPPET = `import httpx, uuid
from datetime import datetime, timezone

CORTEXAI_URL = "http://localhost:8002/api"   # or your Docker URL

def now(): return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

def log_trace(model, provider, prompt, response, tokens_in, tokens_out, ms):
    httpx.post(f"{CORTEXAI_URL}/ingest/trace", json={
        "id": str(uuid.uuid4()),
        "model": model,
        "provider": provider,
        "status": "success",
        "input_text": prompt,
        "output_text": response,
        "prompt_tokens": tokens_in,
        "completion_tokens": tokens_out,
        "duration_ms": ms,
        "created_at": now(),
    })

# Example usage:
log_trace(
    model="gpt-4o", provider="openai",
    prompt="Summarise the quarterly results.",
    response="Q3 revenue grew 18% YoY...",
    tokens_in=120, tokens_out=80, ms=1430,
)`

const TS_SNIPPET = `import { ingestTrace } from './cortexai-client'

await ingestTrace({
  id: crypto.randomUUID(),
  model: 'claude-sonnet-4-6',
  provider: 'anthropic',
  status: 'success',
  input_text: prompt,
  output_text: response,
  prompt_tokens: usage.input_tokens,
  completion_tokens: usage.output_tokens,
  duration_ms: Date.now() - start,
  created_at: new Date().toISOString(),
})`

export default function Settings() {
  const { data: health } = useQuery({
    queryKey: ['health-settings'],
    queryFn: getHealth,
    refetchInterval: 10_000,
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: C.textPrimary, marginBottom: 4 }}>Settings</h1>
        <p style={{ color: C.textSecondary, fontSize: 13 }}>
          System status, integration snippets, and configuration reference.
        </p>
      </div>

      {/* System status */}
      <Section icon={Activity} title="System Status" color={C.green}>
        <Row label="API Status" value={
          <span style={{ color: health?.status === 'ok' ? C.green : C.red }}>
            {health?.status === 'ok' ? '● Online' : '● Offline'}
          </span>
        } />
        <Row label="Database" value={
          <span style={{ color: health?.db === 'ok' ? C.green : C.red }}>
            {health?.db === 'ok' ? '● Connected (SQLite)' : '● Error'}
          </span>
        } />
        <Row label="Total Traces" value={health?.traces_count?.toLocaleString() ?? '—'} />
        <Row label="Backend Version" value="0.1.0" />
        <Row label="Stack" value="FastAPI + SQLite + React + Vite" />
      </Section>

      {/* Data retention */}
      <Section icon={Database} title="Data Retention" color={C.cyan}>
        <Row label="Trace Retention" value="Unlimited (local SQLite)" />
        <Row label="Score Retention" value="Linked to traces" />
        <Row label="Database Location" value="backend/aiobs.db" />
        <Row label="Docker Volume" value="/app/data/aiobs.db" />
        <p style={{ color: C.textMuted, fontSize: 12, marginTop: 16 }}>
          To purge old data: <code style={{ background: C.bgRaised, padding: '1px 5px', borderRadius: 4, color: C.cyan }}>DELETE FROM traces WHERE created_at &lt; date('now', '-30 days')</code>
        </p>
      </Section>

      {/* Privacy */}
      <Section icon={Shield} title="Privacy &amp; PII" color={C.orange}>
        <Row label="PII Scanning" value="Enabled (all ingest)" />
        <Row label="Patterns" value="email, phone, SSN, credit card, IP" />
        <Row label="Action on detect" value="Auto-redact + flag" />
        <Row label="Storage of raw PII" value="Never — redacted before DB write" />
        <p style={{ color: C.textMuted, fontSize: 12, marginTop: 16 }}>
          Add custom patterns in <code style={{ background: C.bgRaised, padding: '1px 5px', borderRadius: 4, color: C.cyan }}>backend/services/pii_scanner.py</code>
        </p>
      </Section>

      {/* SDK snippets */}
      <Section icon={Code} title="Integration — Python" color={C.violet}>
        <p style={{ color: C.textMuted, fontSize: 12, marginBottom: 12 }}>
          Call the ingest API directly from any Python application. No SDK required — just an HTTP POST.
        </p>
        <pre style={{
          background: C.bgRaised, border: `1px solid ${C.border}`, borderRadius: 8,
          padding: 16, fontSize: 12, lineHeight: 1.7, color: C.textPrimary,
          overflowX: 'auto', margin: 0,
        }}>
          <code>{PYTHON_SNIPPET}</code>
        </pre>
      </Section>

      <Section icon={Code} title="Integration — TypeScript / Node" color={C.cyan}>
        <p style={{ color: C.textMuted, fontSize: 12, marginBottom: 12 }}>
          Use the same API with the typed client included in this repo.
        </p>
        <pre style={{
          background: C.bgRaised, border: `1px solid ${C.border}`, borderRadius: 8,
          padding: 16, fontSize: 12, lineHeight: 1.7, color: C.textPrimary,
          overflowX: 'auto', margin: 0,
        }}>
          <code>{TS_SNIPPET}</code>
        </pre>
      </Section>

      {/* About */}
      <Section icon={Info} title="About CortexAI" color={C.textMuted}>
        <Row label="Project" value="CortexAI — Observability & Monitoring" />
        <Row label="License" value="MIT" />
        <Row label="Docs URL (dev)" value="localhost:8002/api/docs" />
        <p style={{ color: C.textMuted, fontSize: 12, marginTop: 16 }}>
          CortexAI is a self-hostable observability platform for AI applications. Track every LLM call, cost, quality score, and security event — with zero cloud dependency.
        </p>
      </Section>

    </div>
  )
}
