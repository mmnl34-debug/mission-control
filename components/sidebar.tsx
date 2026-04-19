'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard, Bot, Radio, ListTodo, FolderKanban,
  DollarSign, Activity, Zap, Menu, X, GitMerge, Search,
  StickyNote, CalendarDays,
} from 'lucide-react'

const nav = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/agents', label: 'Agents', icon: Bot },
  { href: '/feed', label: 'Live Feed', icon: Radio },
  { href: '/tasks', label: 'Taken', icon: ListTodo },
  { href: '/notes', label: 'Notities', icon: StickyNote },
  { href: '/planner', label: 'Planner', icon: CalendarDays },
  { href: '/projects', label: 'Projecten', icon: FolderKanban },
  { href: '/pipeline', label: 'Pipeline', icon: GitMerge },
  { href: '/costs', label: 'Kosten', icon: DollarSign },
  { href: '/search', label: 'Log Search', icon: Search },
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

      {/* Logo area */}
      <div style={{
        padding: '18px 16px',
        borderBottom: '1px solid rgba(0,212,255,0.08)',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
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

        {/* Live dot — desktop only */}
        {!isMobile && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 6px #4ade80', display: 'inline-block' }} />
            <span className="font-terminal" style={{ fontSize: 11, color: '#64748b' }}>live</span>
          </div>
        )}

        {/* Close button — mobile only, top-right */}
        {isMobile && onClose && (
          <button
            onClick={onClose}
            aria-label="Sluit menu"
            style={{
              marginLeft: 'auto',
              width: 32, height: 32, borderRadius: 6,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,212,255,0.06)',
              border: '1px solid rgba(0,212,255,0.15)',
              color: '#00d4ff', cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 1 }}>
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link key={href} href={href} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 12px',
              borderRadius: 8, fontSize: 14, textDecoration: 'none', position: 'relative',
              background: active ? 'rgba(0,212,255,0.13)' : 'transparent',
              color: active ? '#00d4ff' : '#64748b',
              transition: 'background 0.15s ease, color 0.15s ease',
            }}>
              <Icon size={15} strokeWidth={active ? 2 : 1.5} />
              <span style={{ fontWeight: active ? 500 : 400 }}>{label}</span>
              {active && (
                <span style={{
                  marginLeft: 'auto',
                  width: 5, height: 5, borderRadius: '50%',
                  background: '#00d4ff',
                  boxShadow: '0 0 6px #00d4ff',
                }} />
              )}
            </Link>
          )
        })}
      </nav>

      {/* System status */}
      <div style={{ margin: '0 8px 8px', padding: '10px 12px', borderRadius: 8, background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.1)' }}>
        <div className="font-terminal" style={{ fontSize: 10, letterSpacing: '0.12em', color: '#334155', textTransform: 'uppercase', marginBottom: 6 }}>System Status</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981', flexShrink: 0 }} />
          <span className="font-terminal" style={{ fontSize: 11, color: '#10b981' }}>All systems operational</span>
        </div>
      </div>

      {/* Clock */}
      <div style={{ padding: '10px 16px', borderTop: '1px solid rgba(0,212,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
      <style>{`
        .mc-sidebar-desktop { display: flex; height: 100%; width: 240px; flex-shrink: 0; }
        .mc-topbar           { display: none; }

        @media (max-width: 1023px) {
          .mc-sidebar-desktop { display: none; }
          .mc-topbar          { display: flex; }
          #main-content       { padding-top: 56px; }
        }
      `}</style>

      {/* Desktop sidebar */}
      <div className="mc-sidebar-desktop">
        <SidebarContent />
      </div>

      {/* Mobile top bar */}
      <div
        className="mc-topbar"
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 60,
          height: 56,
          background: 'rgba(7,7,15,0.96)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(0,212,255,0.1)',
          alignItems: 'center',
          padding: '0 16px',
          gap: 12,
        }}
      >
        {/* Hamburger */}
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          style={{
            width: 36, height: 36, borderRadius: 8, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,212,255,0.06)',
            border: '1px solid rgba(0,212,255,0.18)',
            color: '#00d4ff', cursor: 'pointer',
          }}
        >
          <Menu size={16} />
        </button>

        {/* Logo centered */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <div style={{
            width: 24, height: 24, borderRadius: 6, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, #00d4ff, #4f52a0)',
            boxShadow: '0 0 10px rgba(0,212,255,0.4)',
          }}>
            <Zap size={11} color="white" />
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'white', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
            Mission Control
          </span>
        </div>

        {/* Live dot right */}
        <div style={{ width: 36, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 8px #4ade80', display: 'inline-block' }} />
        </div>
      </div>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 49,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
          }}
        />
      )}

      {/* Mobile drawer */}
      <div style={{
        position: 'fixed', top: 0, left: 0, bottom: 0,
        width: 240, zIndex: 50,
        transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
      }}>
        <SidebarContent onClose={() => setMobileOpen(false)} isMobile />
      </div>
    </>
  )
}
