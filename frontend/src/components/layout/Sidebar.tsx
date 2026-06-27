import { NavLink } from 'react-router-dom'
import {
  Activity, GitBranch, DollarSign, Star,
  FileText, Bell, Settings, Cpu,
} from 'lucide-react'

const NAV = [
  { to: '/',         icon: Activity,    label: 'Overview'  },
  { to: '/traces',   icon: GitBranch,   label: 'Traces'    },
  { to: '/cost',     icon: DollarSign,  label: 'Cost'      },
  { to: '/quality',  icon: Star,        label: 'Quality'   },
  { to: '/prompts',  icon: FileText,    label: 'Prompts'   },
  { to: '/alerts',   icon: Bell,        label: 'Alerts'    },
  { to: '/settings', icon: Settings,    label: 'Settings'  },
]

export default function Sidebar() {
  return (
    <aside
      style={{ width: 240, background: '#070b14', borderRight: '1px solid #1e2d42' }}
      className="flex flex-col h-full flex-shrink-0"
    >
      {/* Logo */}
      <div className="flex items-center gap-2 px-5 py-5" style={{ borderBottom: '1px solid #1e2d42' }}>
        <Cpu size={20} style={{ color: '#7c3aed' }} />
        <div>
          <span className="font-semibold text-sm tracking-wide" style={{ color: '#e2e8f0' }}>
            cortex<span style={{ color: '#7c3aed' }}>AI</span>
          </span>
          <p style={{ fontSize: 9, color: '#475569', letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 1 }}>
            Observability &amp; Monitoring
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1 px-3 pt-4 flex-1">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 12px',
              borderRadius: 8,
              borderLeft: isActive ? '3px solid #7c3aed' : '3px solid transparent',
              background: isActive ? 'rgba(124,58,237,0.12)' : 'transparent',
              color: isActive ? '#e2e8f0' : '#94a3b8',
              textDecoration: 'none',
              fontSize: 13,
              fontWeight: isActive ? 500 : 400,
              transition: 'all 0.15s',
            })}
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4" style={{ borderTop: '1px solid #1e2d42' }}>
        <span className="text-xs" style={{ color: '#475569' }}>cortexAI v0.1.0</span>
      </div>
    </aside>
  )
}
