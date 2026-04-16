'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { LayoutDashboard, Bot, Radio, ListTodo, FolderKanban, DollarSign, Activity, Zap, Menu, X, GitMerge } from 'lucide-react'

const nav = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/agents', label: 'Agents', icon: Bot },
  { href: '/feed', label: 'Live Feed', icon: Radio },
  { href: '/tasks', label: 'Taken', icon: ListTodo },
  { href: '/projects', label: 'Projecten', icon: FolderKanban },
  { href: '/pipeline', label: 'Pipeline', icon: GitMerge },
  { href: '/costs', label: 'Kosten', icon: DollarSign },
]

function LiveClock() {
  const [time, setTime] = useState<string>('')

  useEffect(() => {
    function tick() {
      const now = new Date()
      setTime(now.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <span className="font-terminal text-xs tabular-nums" style={{ color: '#00d4ff' }}>
      {time || '--:--:--'}
    </span>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  // Sluit sidebar bij navigatie
  useEffect(() => { setOpen(false) }, [pathname])

  const sidebarContent = (
    <aside
      style={{
        width: 240,
        background: 'rgba(7,7,15,0.97)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRight: '1px solid rgba(0,212,255,0.08)',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
        height: '100%',
      }}
    >
      {/* Scan line */}
      <div className="scan-line absolute left-0 right-0 pointer-events-none z-10" style={{
        height: '1px',
        background: 'linear-gradient(90deg, transparent, rgba(0,212,255,0.4), rgba(79,82,160,0.3), transparent)',
        top: 0,
      }} />

      {/* Logo */}
      <div className="px-4 py-5 flex items-center gap-3 relative" style={{ borderBottom: '1px solid rgba(0,212,255,0.08)' }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{
          background: 'linear-gradient(135deg, #00d4ff, #4f52a0)',
          boxShadow: '0 0 16px rgba(0,212,255,0.5)',
        }}>
          <Zap size={14} color="white" />
        </div>
        <div>
          <div className="text-sm font-bold text-white tracking-widest leading-none uppercase">Mission</div>
          <div className="text-xs leading-none mt-0.5 tracking-widest uppercase font-terminal" style={{ color: '#00d4ff' }}>Control</div>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 pulse-dot" />
          <span className="text-xs font-terminal" style={{ color: '#64748b' }}>live</span>
        </div>
        {/* Sluitknop — alleen op mobile */}
        <button
          onClick={() => setOpen(false)}
          className="lg:hidden ml-2 p-1 rounded"
          style={{ color: '#64748b' }}
          aria-label="Sluit menu"
        >
          <X size={16} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-0.5">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all relative"
              style={{
                background: active ? 'rgba(0,212,255,0.1)' : 'transparent',
                color: active ? '#00d4ff' : '#64748b',
                borderLeft: active ? '2px solid #00d4ff' : '2px solid transparent',
                boxShadow: active ? '0 0 12px rgba(0,212,255,0.1)' : 'none',
                paddingLeft: active ? '10px' : '12px',
              }}
            >
              <Icon size={15} />
              {label}
              {active && (
                <span className="ml-auto w-1 h-1 rounded-full" style={{ background: '#00d4ff', boxShadow: '0 0 6px #00d4ff' }} />
              )}
            </Link>
          )
        })}
      </nav>

      {/* System Status */}
      <div className="px-3 py-3 mx-2 mb-2 rounded-lg" style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.1)' }}>
        <div className="text-xs tracking-widest uppercase mb-2 font-terminal" style={{ color: '#334155' }}>System Status</div>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#10b981', boxShadow: '0 0 6px #10b981' }} />
          <span className="text-xs font-terminal" style={{ color: '#10b981' }}>All systems operational</span>
        </div>
      </div>

      {/* Bottom clock */}
      <div className="px-4 py-4" style={{ borderTop: '1px solid rgba(0,212,255,0.08)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity size={12} style={{ color: '#00d4ff' }} />
            <span className="text-xs font-terminal" style={{ color: '#334155' }}>claude-sonnet-4-6</span>
          </div>
          <LiveClock />
        </div>
      </div>
    </aside>
  )

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <div className="hidden lg:flex h-full w-60 shrink-0">
        {sidebarContent}
      </div>

      {/* ── Mobile: hamburger knop ── */}
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden"
        style={{
          position: 'fixed', top: 14, left: 14, zIndex: 60,
          width: 40, height: 40, borderRadius: 8,
          background: 'rgba(7,7,15,0.9)',
          border: '1px solid rgba(0,212,255,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#00d4ff', cursor: 'pointer',
          boxShadow: '0 0 12px rgba(0,212,255,0.1)',
        }}
        aria-label="Open menu"
      >
        <Menu size={18} />
      </button>

      {/* ── Mobile: overlay backdrop ── */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="lg:hidden"
          style={{
            position: 'fixed', inset: 0, zIndex: 49,
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(4px)',
          }}
        />
      )}

      {/* ── Mobile: slide-in drawer ── */}
      <div
        className="lg:hidden"
        style={{
          position: 'fixed', top: 0, left: 0, bottom: 0,
          width: 240, zIndex: 50,
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        {sidebarContent}
      </div>
    </>
  )
}
