'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Bot, FolderKanban, DollarSign, Activity, Zap } from 'lucide-react'

const nav = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/agents', label: 'Agents', icon: Bot },
  { href: '/projects', label: 'Projecten', icon: FolderKanban },
  { href: '/costs', label: 'Kosten', icon: DollarSign },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 shrink-0 flex flex-col" style={{ background: '#13131c', borderRight: '1px solid #2a2a3d' }}>
      {/* Logo */}
      <div className="px-4 py-5 flex items-center gap-2" style={{ borderBottom: '1px solid #2a2a3d' }}>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#6366f1' }}>
          <Zap size={14} color="white" />
        </div>
        <div>
          <div className="text-sm font-semibold text-white leading-none">Mission</div>
          <div className="text-xs leading-none mt-0.5" style={{ color: '#6366f1' }}>Control</div>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 pulse-dot" />
          <span className="text-xs" style={{ color: '#94a3b8' }}>live</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-0.5">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all"
              style={{
                background: active ? 'rgba(99,102,241,0.15)' : 'transparent',
                color: active ? '#818cf8' : '#94a3b8',
                border: active ? '1px solid rgba(99,102,241,0.2)' : '1px solid transparent',
              }}
            >
              <Icon size={15} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="px-4 py-4" style={{ borderTop: '1px solid #2a2a3d' }}>
        <div className="flex items-center gap-2">
          <Activity size={12} style={{ color: '#6366f1' }} />
          <span className="text-xs" style={{ color: '#475569' }}>claude-sonnet-4-6</span>
        </div>
      </div>
    </aside>
  )
}
