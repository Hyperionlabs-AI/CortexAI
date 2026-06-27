import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BookOpen, Tag, Variable, CheckCircle, Clock } from 'lucide-react'
import { getPrompts, getPromptVersions } from '../api/client'

const C = {
  violet: '#7c3aed', cyan: '#06b6d4', green: '#22c55e',
  orange: '#f97316', card: '#0d1220', border: '#1e2d42',
  textPrimary: '#e2e8f0', textSecondary: '#94a3b8', textMuted: '#475569',
  bgRaised: '#111827', bgHover: '#141e30',
}

function highlightVars(content: string) {
  const parts = content.split(/({{[^}]+}})/)
  return parts.map((part, i) =>
    /^{{.+}}$/.test(part)
      ? <span key={i} style={{ color: C.cyan, background: `${C.cyan}15`, borderRadius: 3, padding: '0 3px', fontFamily: '"JetBrains Mono",monospace', fontSize: '0.9em' }}>{part}</span>
      : <span key={i}>{part}</span>
  )
}

export default function Prompts() {
  const [selected, setSelected] = useState<string | null>(null)
  const [activeVersion, setActiveVersion] = useState<number | null>(null)

  const { data: promptList = [], isLoading } = useQuery({
    queryKey: ['prompts'],
    queryFn: getPrompts,
  })

  const { data: versions = [] } = useQuery({
    queryKey: ['prompt-versions', selected],
    queryFn: () => getPromptVersions(selected!),
    enabled: !!selected,
  })

  const currentVersion = versions.find(v => activeVersion !== null ? v.version === activeVersion : v.is_active) ?? versions[0]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: C.textPrimary, marginBottom: 4 }}>Prompt Library</h1>
        <p style={{ color: C.textSecondary, fontSize: 13 }}>
          Versioned prompt templates used across your AI applications. Click a prompt to inspect its versions.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16, minHeight: 500 }}>

        {/* Left: prompt list */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}` }}>
            <p style={{ color: C.textSecondary, fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              {promptList.length} Prompts
            </p>
          </div>
          {isLoading && <p style={{ color: C.textMuted, fontSize: 12, padding: 20 }}>Loading…</p>}
          {promptList.map(p => (
            <div
              key={p.name}
              onClick={() => { setSelected(p.name); setActiveVersion(null) }}
              style={{
                padding: '12px 16px', cursor: 'pointer',
                borderBottom: `1px solid ${C.border}33`,
                background: selected === p.name ? `${C.violet}18` : 'transparent',
                borderLeft: selected === p.name ? `3px solid ${C.violet}` : '3px solid transparent',
                transition: 'background 0.15s',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: C.textPrimary, fontSize: 13, fontWeight: selected === p.name ? 600 : 400 }}>{p.name}</span>
                <span style={{
                  fontSize: 10, padding: '1px 6px', borderRadius: 9999,
                  background: `${C.green}1a`, color: C.green, border: `1px solid ${C.green}33`,
                }}>v{p.active_version}</span>
              </div>
              <p style={{ color: C.textMuted, fontSize: 11, marginTop: 4 }}>
                {p.latest_version} version{p.latest_version > 1 ? 's' : ''}
              </p>
            </div>
          ))}
          {!isLoading && promptList.length === 0 && (
            <p style={{ color: C.textMuted, fontSize: 12, padding: 20 }}>No prompts seeded yet. Run seed.py.</p>
          )}
        </div>

        {/* Right: version viewer */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
          {!selected ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
              <BookOpen size={32} style={{ color: C.textMuted }} />
              <p style={{ color: C.textMuted, fontSize: 13 }}>Select a prompt to view its versions</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ color: C.textPrimary, fontWeight: 600, fontSize: 15 }}>{selected}</p>
                  <p style={{ color: C.textMuted, fontSize: 11, marginTop: 2 }}>
                    {versions.length} version{versions.length !== 1 ? 's' : ''}
                  </p>
                </div>
                {/* Version tabs */}
                <div style={{ display: 'flex', gap: 6 }}>
                  {versions.map(v => (
                    <button
                      key={v.version}
                      onClick={() => setActiveVersion(v.version)}
                      style={{
                        padding: '4px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                        border: `1px solid ${currentVersion?.version === v.version ? C.violet : C.border}`,
                        background: currentVersion?.version === v.version ? `${C.violet}25` : C.bgRaised,
                        color: currentVersion?.version === v.version ? C.violet : C.textSecondary,
                        display: 'flex', alignItems: 'center', gap: 5,
                      }}
                    >
                      v{v.version}
                      {v.is_active && <CheckCircle size={10} style={{ color: C.green }} />}
                    </button>
                  ))}
                </div>
              </div>

              {currentVersion && (
                <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Meta */}
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.textMuted, fontSize: 12 }}>
                      <Clock size={12} />
                      {new Date(currentVersion.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>
                    {currentVersion.is_active && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: C.green, fontSize: 12 }}>
                        <CheckCircle size={12} /> Active version
                      </span>
                    )}
                  </div>

                  {/* Variables */}
                  {currentVersion.variables.length > 0 && (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.textMuted, fontSize: 11, marginBottom: 8, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                        <Variable size={11} /> Variables
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {currentVersion.variables.map(v => (
                          <span key={v} style={{ padding: '2px 10px', borderRadius: 9999, background: `${C.cyan}15`, color: C.cyan, border: `1px solid ${C.cyan}30`, fontSize: 12, fontFamily: '"JetBrains Mono",monospace' }}>
                            {`{{${v}}}`}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tags */}
                  {currentVersion.tags.length > 0 && (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.textMuted, fontSize: 11, marginBottom: 8, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                        <Tag size={11} /> Tags
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {currentVersion.tags.map(t => (
                          <span key={t} style={{ padding: '2px 8px', borderRadius: 9999, background: `${C.violet}15`, color: C.violet, border: `1px solid ${C.violet}30`, fontSize: 11 }}>
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Content */}
                  <div>
                    <p style={{ color: C.textMuted, fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>Content</p>
                    <pre style={{
                      background: C.bgRaised, border: `1px solid ${C.border}`, borderRadius: 8,
                      padding: 16, fontSize: 12.5, lineHeight: 1.7, color: C.textPrimary,
                      whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0,
                    }}>
                      {highlightVars(currentVersion.content)}
                    </pre>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
