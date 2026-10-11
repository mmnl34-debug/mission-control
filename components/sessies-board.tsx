'use client'

import { useEffect, useState } from 'react'
import { MonitorPlay } from 'lucide-react'
import type { LiveSession, SessionState } from '@/lib/mc/local-sessions'

const POLL_MS = 3000
// Aanname: 200k contextvenster. Bij een groter venster is de balk een overschatting.
const CONTEXT_WINDOW = 200_000

const STATE_STYLE: Record<SessionState, { color: string; label: string }> = {
  needs_you: { color: '#f59e0b', label: 'Wacht op jou' },
  stalled: { color: '#ef4444', label: 'Vastgelopen?' },
  working: { color: '#00d4ff', label: 'Aan het werk' },
  idle: { color: '#10b981', label: 'Klaar' },
  done: { color: '#64748b', label: 'Inactief' },
}
const ORDER: SessionState[] = ['needs_you', 'stalled', 'working', 'idle', 'done']

function fmtAge(sec: number) {
  if (sec < 60) return `${sec}s`
  if (sec < 3600) return `${Math.floor(sec / 60)}m`
  return `${Math.floor(sec / 3600)}u ${Math.floor((sec % 3600) / 60)}m`
}

const fmtTok = (n: number) => (n >= 1000 ? `${Math.round(n / 1000)}k` : String(n))

export function SessiesBoard() {
  const [sessions, setSessions] = useState<LiveSession[]>([])
  const [status, setStatus] = useState<'loading' | 'ok' | 'unavailable' | 'error'>('loading')

  useEffect(() => {
    let alive = true
    const load = async () => {
      if (document.visibilityState === 'hidden') return
      try {
        const res = await fetch('/api/sessies', { cache: 'no-store' })
        if (!alive) return
        if (res.status === 404) return setStatus('unavailable')
        if (!res.ok) return setStatus('error')
        const data = (await res.json()) as { sessions: LiveSession[] }
        setSessions(data.sessions)
        setStatus('ok')
      } catch {
        if (alive) setStatus('error')
      }
    }
    void load()
    const t = setInterval(load, POLL_MS)
    return () => {
      alive = false
      clearInterval(t)
    }
  }, [])

  const counts = ORDER.map((s) => ({ s, n: sessions.filter((x) => x.state === s).length })).filter((c) => c.n > 0)

  return (
    <div style={{ padding: '24px', maxWidth: 1100 }}>
      <h1 style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 22, fontWeight: 600, margin: 0 }}>
        <MonitorPlay size={22} /> Live sessies
      </h1>
      <p style={{ color: '#94a3b8', fontSize: 13, margin: '6px 0 16px' }}>
        Lokale Claude Code-sessies, elke {POLL_MS / 1000}s ververst. Read-only, niets verlaat deze machine.
      </p>

      {status === 'unavailable' && (
        <p style={{ color: '#f59e0b' }}>Deze pagina werkt alleen lokaal (localhost), niet op Vercel.</p>
      )}
      {status === 'error' && <p style={{ color: '#ef4444' }}>Kon sessies niet laden.</p>}
      {status === 'ok' && sessions.length === 0 && (
        <p style={{ color: '#94a3b8' }}>Geen sessies met activiteit in de afgelopen 24 uur.</p>
      )}

      {counts.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {counts.map(({ s, n }) => (
            <span
              key={s}
              style={{
                fontSize: 12,
                padding: '3px 10px',
                borderRadius: 999,
                color: STATE_STYLE[s].color,
                border: `1px solid ${STATE_STYLE[s].color}55`,
                background: `${STATE_STYLE[s].color}14`,
              }}
            >
              {n} {STATE_STYLE[s].label.toLowerCase()}
            </span>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gap: 10 }}>
        {sessions.map((s) => {
          const c = STATE_STYLE[s.state].color
          const pct = Math.min(100, Math.round((s.contextTokens / CONTEXT_WINDOW) * 100))
          return (
            <div
              key={s.id}
              style={{
                padding: '12px 14px',
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.08)',
                borderLeft: `3px solid ${c}`,
                background: 'rgba(255,255,255,0.03)',
                opacity: s.state === 'done' ? 0.6 : 1,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ fontWeight: 500 }}>
                  {s.project}
                  {s.branch && <span style={{ color: '#64748b', fontWeight: 400 }}> · {s.branch}</span>}
                </div>
                <div style={{ color: c, fontSize: 13 }}>
                  {s.stateLabel} <span style={{ color: '#64748b' }}>· {fmtAge(s.ageSec)} geleden</span>
                </div>
              </div>
              {s.title && <div style={{ color: '#94a3b8', fontSize: 13, marginTop: 2 }}>{s.title}</div>}
              {s.lastAction && (
                <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#cbd5e1', marginTop: 6, wordBreak: 'break-all' }}>
                  ▸ {s.lastAction}
                </div>
              )}
              {s.subagents.length > 0 && (
                <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 12, color: '#94a3b8' }}>
                  {s.subagents.map((a, i) => (
                    <li key={i}>
                      sub-agent: {a.name} <span style={{ color: '#64748b' }}>({fmtAge(a.ageSec)})</span>
                    </li>
                  ))}
                </ul>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                <div style={{ flex: 1, maxWidth: 220, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)' }}>
                  <div
                    style={{
                      width: `${pct}%`,
                      height: '100%',
                      borderRadius: 2,
                      background: pct > 85 ? '#ef4444' : pct > 60 ? '#f59e0b' : '#00d4ff',
                    }}
                  />
                </div>
                <span style={{ fontSize: 11, color: '#64748b' }} title={`t.o.v. ${fmtTok(CONTEXT_WINDOW)} venster (aanname)`}>
                  ctx {fmtTok(s.contextTokens)} · {pct}%{s.model ? ` · ${s.model}` : ''}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
