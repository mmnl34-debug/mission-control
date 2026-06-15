'use client'

import { useEffect, useState } from 'react'
import { X, Keyboard } from 'lucide-react'

const SHORTCUTS = [
  { key: 'Ctrl+K',   desc: 'Command palette openen' },
  { key: 'Alt+J',    desc: 'JARVIS activeren' },
  { key: 'Alt+N',    desc: 'Quick Capture (notitie of taak)' },
  { key: '?',        desc: 'Dit overzicht tonen' },
  { key: 'Esc',      desc: 'Overlay / modal sluiten' },
  { key: '↑ / ↓',   desc: 'Navigeren in command palette' },
  { key: '↵ Enter',  desc: 'Commando uitvoeren / opslaan' },
]

export function KeyboardShortcuts() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === '?') { e.preventDefault(); setOpen(o => !o) }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[9997] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-sm mx-4 rounded-lg overflow-hidden"
        style={{
          background: 'rgba(7,7,15,0.97)',
          border: '1px solid rgba(0,212,255,0.25)',
          boxShadow: '0 0 60px rgba(0,212,255,0.1)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: '1px solid rgba(0,212,255,0.1)' }}
        >
          <div className="flex items-center gap-2">
            <Keyboard size={13} style={{ color: '#00d4ff' }} />
            <span className="font-terminal text-sm font-bold" style={{ color: '#f1f5f9' }}>
              Keyboard Shortcuts
            </span>
          </div>
          <button onClick={() => setOpen(false)} style={{ color: '#475569' }}>
            <X size={14} />
          </button>
        </div>

        <div className="p-4 space-y-2.5">
          {SHORTCUTS.map(s => (
            <div key={s.key} className="flex items-center justify-between gap-4">
              <span className="font-terminal text-xs" style={{ color: '#94a3b8' }}>{s.desc}</span>
              <kbd
                className="font-terminal shrink-0 px-2 py-0.5 rounded text-xs"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: '#00d4ff',
                  whiteSpace: 'nowrap',
                }}
              >
                {s.key}
              </kbd>
            </div>
          ))}
        </div>

        <div
          className="px-4 py-2 text-center"
          style={{ borderTop: '1px solid rgba(0,212,255,0.06)' }}
        >
          <span className="font-terminal" style={{ fontSize: 10, color: '#334155' }}>
            Druk op <kbd style={{ color: '#475569' }}>?</kbd> of <kbd style={{ color: '#475569' }}>ESC</kbd> om te sluiten
          </span>
        </div>
      </div>
    </div>
  )
}
