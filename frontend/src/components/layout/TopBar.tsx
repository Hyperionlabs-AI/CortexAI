import { useLocation } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'

const PAGE_TITLES: Record<string, string> = {
  '/':         'Overview',
  '/traces':   'Traces',
  '/cost':     'Cost',
  '/quality':  'Quality',
  '/prompts':  'Prompts',
  '/alerts':   'Alerts',
  '/settings': 'Settings',
}

export default function TopBar() {
  const { pathname } = useLocation()
  const qc = useQueryClient()
  const title = PAGE_TITLES[pathname] ?? 'Overview'

  return (
    <header
      style={{
        height: 56,
        background: '#070b14',
        borderBottom: '1px solid #1e2d42',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        flexShrink: 0,
      }}
    >
      <h1 style={{ fontSize: 15, fontWeight: 600, color: '#e2e8f0' }}>{title}</h1>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <select
          style={{
            background: '#111827',
            border: '1px solid #1e2d42',
            color: '#94a3b8',
            borderRadius: 6,
            padding: '4px 10px',
            fontSize: 12,
            cursor: 'pointer',
          }}
          defaultValue="24h"
        >
          <option value="1h">Last 1h</option>
          <option value="6h">Last 6h</option>
          <option value="24h">Last 24h</option>
          <option value="7d">Last 7d</option>
          <option value="30d">Last 30d</option>
        </select>

        <button
          onClick={() => qc.invalidateQueries()}
          style={{
            background: '#111827',
            border: '1px solid #1e2d42',
            color: '#94a3b8',
            borderRadius: 6,
            padding: '5px 8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
          }}
          title="Refresh all"
        >
          <RefreshCw size={13} />
        </button>
      </div>
    </header>
  )
}
