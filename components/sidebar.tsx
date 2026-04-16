'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard, Bot, Radio, ListTodo, FolderKanban,
  DollarSign, Activity, Zap, Menu, X, GitMerge,
} from 'lucide-react'

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
  const [time, setTime] = useState('')
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])
  return <span className="font-terminal text-xs tabular-nums" style={{ color: '#00d4ff' }}>{time || '--:--:--'}</span>
}

function SidebarContent({ onClose, isMobile }: { onClose?: () => void; isMobile?: boolean }) {
  const pathname = usePathname()
  return (
    <aside style={{
      width: 240, height: '100%',
      background: 'rgba(7,7,15,0.97)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderRight: '1px solid rgba(0,212,255,0.08)',
      display: 'flex', flexDirection: 'column',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Scan line */}
      <div style={{
        position: 'absolute', left: 0, right: 0, top: 0, height: 1, zIndex: 10,
        background: 'linear-gradient(90deg, transparent, rgba(0,212,255,0.4), rgba(79,82,160,0.3), transparent)',
      }} />

      {/* Logo */}
      <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid rgba(0,212,255,0.08)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(135deg, #00d4ff, #4f52a0)',
          boxShadow: '0 0 16px rgba(0,212,255,0.5)',
        }}>
          <Zap size={14} color="white" />
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'white', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Mission</div>
          <div className="font-terminal" style={{ fontSize: 11, color: '#00d4ff', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Control</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 6px #4ade80', display: 'inline-block' }} />
          <span className="font-terminal" style={{ fontSize: 11, color: '#64748b' }}>live</span>
        </div>
        {isMobile && onClose && (
          <button onClick={onClose} style={{ marginLeft: 8, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }} aria-label="Sluit">
            <X size={16} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '16px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link key={href} href={href} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: active ? '10px 12px 10px 10px' : '10px 12px',
              borderRadius: 8, fontSize: 14, textDecoration: 'none', position: 'relative',
              background: active ? 'rgba(0,212,255,0.1)' : 'transparent',
              color: active ? '#00d4ff' : '#64748b',
              borderLeft: active ? '2px solid #00d4ff' : '2px solid transparent',
              boxShadow: active ? '0 0 12px rgba(0,212,255,0.1)' : 'none',
              transition: 'all 0.15s ease',
            }}>
              <Icon size={15} />
              {label}
              {active && <span style={{ marginLeft: 'auto', width: 4, height: 4, borderRadius: '50%', background: '#00d4ff', boxShadow: '0 0 6px #00d4ff' }} />}
            </Link>
          )
        })}
      </nav>

      {/* System status */}
      <div style={{ margin: '0 8px 8px', padding: '12px', borderRadius: 8, background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.1)' }}>
        <div className="font-terminal" style={{ fontSize: 10, letterSpacing: '0.12em', color: '#334155', textTransform: 'uppercase', marginBottom: 8 }}>System Status</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981', flexShrink: 0 }} />
          <span className="font-terminal" style={{ fontSize: 11, color: '#10b981' }}>All systems operational</span>
        </div>
      </div>

      {/* Clock */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(0,212,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Activity size={12} style={{ color: '#00d4ff' }} />
          <span className="font-terminal" style={{ fontSize: 11, color: '#334155' }}>claude-sonnet-4-6</span>
        </div>
        <LiveClock />
      </div>
    </aside>
  )
}

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => { setMobileOpen(false) }, [pathname])

  return (
    <>
      {/* CSS: desktop sidebar zichtbaar, mobile hamburger verborgen op ≥1024px */}
      <style>{`
        .mc-sidebar-desktop { display: flex; height: 100%; width: 240px; flex-shrink: 0; }
        .mc-hamburger       { display: none; }
        @media (max-width: 1023px) {
          .mc-sidebar-desktop { display: none; }
          .mc-hamburger       { display: flex; }
          #main-content       { padding-top: 64px; }
        }
      `}</style>

      {/* Desktop sidebar */}
      <div className="mc-sidebar-desktop">
        <SidebarContent />
      </div>

      {/* Mobile hamburger */}
      <button
        className="mc-hamburger"
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
        style={{
          position: 'fixed', top: 14, left: 14, zIndex: 60,
          width: 40, height: 40, borderRadius: 8,
          background: 'rgba(7,7,15,0.9)',
          border: '1px solid rgba(0,212,255,0.2)',
          alignItems: 'center', justifyContent: 'center',
          color: '#00d4ff', cursor: 'pointer',
          boxShadow: '0 0 12px rgba(0,212,255,0.1)',
        }}
      >
        <Menu size={18} />
      </button>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 49,
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(4px)',
          }}
        />
      )}

      {/* Mobile drawer */}
      <div style={{
        position: 'fixed', top: 0, left: 0, bottom: 0,
        width: 240, zIndex: 50,
        transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
      }}>
        <SidebarContent onClose={() => setMobileOpen(false)} isMobile />
      </div>
    </>
  )
}
