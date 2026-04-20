export const dynamic = 'force-dynamic'

import { format } from 'date-fns'
import { AgentsClient } from '@/components/agents-client'
import { AgentEfficiency } from '@/components/agent-efficiency'

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SB_HEADERS = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` }

async function sbFetch(path: string) {
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, { headers: SB_HEADERS, cache: 'no-store' })
  if (!res.ok) return []
  return res.json()
}

async function getData() {
  const [sessions, logs] = await Promise.all([
    sbFetch('agent_sessions?select=*&order=last_seen_at.desc'),
    sbFetch('agent_logs?select=*&order=created_at.desc&limit=50'),
  ])
  return { sessions: sessions ?? [], logs: logs ?? [] }
}

const statusConfig = {
  active: { color: '#00d4ff', bg: 'rgba(0,212,255,0.1)', border: 'rgba(0,212,255,0.2)', label: 'Actief' },
  idle: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)', label: 'Inactief' },
  completed: { color: '#4f52a0', bg: 'rgba(79,82,160,0.1)', border: 'rgba(79,82,160,0.2)', label: 'Klaar' },
  error: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)', label: 'Fout' },
}

const eventColor: Record<string, string> = {
  task_start: '#00d4ff',
  task_complete: '#10b981',
  tool_use: '#f59e0b',
  message: '#94a3b8',
  error: '#ef4444',
  info: '#94a3b8',
}

export default async function AgentsPage() {
  const { sessions, logs } = await getData()

  const active = sessions.filter((s: { status: string }) => s.status === 'active')

  // Timeline calculations — last 24 hours
  const now = new Date()
  const h24Ago = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const h24Ms = 24 * 60 * 60 * 1000

  const timelineHours = Array.from({ length: 25 }, (_, i) => {
    const d = new Date(h24Ago.getTime() + i * 60 * 60 * 1000)
    return { label: format(d, 'HH'), pct: (i / 24) * 100 }
  })

  const nowPct = ((now.getTime() - h24Ago.getTime()) / h24Ms) * 100

  type TimelineSession = {
    id: string; status: 'active' | 'idle' | 'completed' | 'error';
    agent_name: string; started_at: string; last_seen_at: string
  }

  const timelineSessions = (sessions as TimelineSession[]).filter(s => {
    const lastSeen = new Date(s.last_seen_at).getTime()
    return lastSeen >= h24Ago.getTime()
  })

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Agents</h1>
        <p className="text-sm mt-0.5" style={{ color: '#94a3b8' }}>{sessions.length} sessies · {active.length} actief</p>
      </div>

      {/* Session timeline */}
      <div className="hud-card p-4">
        <div className="hud-corners-bottom" />
        <h2 className="hud-label mb-3">Sessie tijdlijn (24 uur)</h2>
        <div className="relative" style={{ height: Math.max(60, timelineSessions.length * 28 + 32) }}>
          {/* Hour markers */}
          <div className="absolute inset-x-0 top-0 flex justify-between" style={{ height: 16 }}>
            {timelineHours.filter((_, i) => i % 3 === 0).map(h => (
              <span
                key={h.label + h.pct}
                className="font-terminal absolute"
                style={{ left: `${h.pct}%`, fontSize: '9px', color: '#334155', transform: 'translateX(-50%)' }}
              >
                {h.label}:00
              </span>
            ))}
          </div>

          {/* Track area */}
          <div className="absolute inset-x-0 bottom-0" style={{ top: 20, background: 'rgba(255,255,255,0.02)', borderRadius: 4 }}>
            {/* Grid lines */}
            {timelineHours.filter((_, i) => i % 3 === 0).map(h => (
              <div
                key={'line' + h.pct}
                className="absolute top-0 bottom-0"
                style={{ left: `${h.pct}%`, width: 1, background: 'rgba(0,212,255,0.04)' }}
              />
            ))}

            {/* Session bars */}
            {timelineSessions.map((s, i) => {
              const startMs = Math.max(new Date(s.started_at).getTime(), h24Ago.getTime())
              const endMs = Math.min(new Date(s.last_seen_at).getTime(), now.getTime())
              const leftPct = ((startMs - h24Ago.getTime()) / h24Ms) * 100
              const widthPct = Math.max(0.5, ((endMs - startMs) / h24Ms) * 100)
              const cfg = statusConfig[s.status]

              return (
                <div
                  key={s.id}
                  className="absolute rounded-sm"
                  style={{
                    left: `${leftPct}%`,
                    width: `${widthPct}%`,
                    top: i * 28 + 4,
                    height: 20,
                    background: cfg.bg,
                    border: `1px solid ${cfg.border}`,
                    minWidth: 4,
                  }}
                  title={`${s.agent_name} — ${cfg.label}`}
                >
                  <span
                    className="font-terminal absolute inset-0 flex items-center px-1 truncate"
                    style={{ fontSize: '9px', color: cfg.color }}
                  >
                    {s.agent_name}
                  </span>
                </div>
              )
            })}

            {/* Current time indicator */}
            <div
              className="absolute top-0 bottom-0"
              style={{
                left: `${Math.min(nowPct, 100)}%`,
                width: 2,
                background: '#00d4ff',
                boxShadow: '0 0 6px #00d4ff',
                zIndex: 5,
              }}
            />
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-3">
          {Object.entries(statusConfig).map(([key, cfg]) => (
            <div key={key} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm" style={{ background: cfg.color }} />
              <span className="font-terminal" style={{ fontSize: '10px', color: '#475569' }}>{cfg.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Agent efficiency rapport */}
      <AgentEfficiency />

      {/* Session cards with replay — rendered client-side */}
      <AgentsClient sessions={sessions} />

      {/* Activity log */}
      <div className="space-y-3">
        <h2 className="hud-label">Activiteitslog</h2>
        <div className="hud-card p-4 space-y-3">
          <div className="hud-corners-bottom" />
          {logs.map((log: { id: string; event_type: string; agent_name: string; message: string; created_at: string }) => (
            <div key={log.id} className="flex items-start gap-3 text-xs font-terminal">
              <span className="shrink-0 mt-0.5 tabular-nums" style={{ color: '#475569', minWidth: '80px' }}>
                {format(new Date(log.created_at), 'HH:mm:ss')}
              </span>
              <span className="shrink-0 font-medium" style={{ color: eventColor[log.event_type] ?? '#94a3b8', minWidth: '70px' }}>
                {log.event_type.replace('_', ' ')}
              </span>
              <span className="shrink-0" style={{ color: '#00d4ff', minWidth: '90px' }}>{log.agent_name}</span>
              <span style={{ color: '#94a3b8' }}>{log.message}</span>
            </div>
          ))}
          {logs.length === 0 && (
            <p className="text-sm font-terminal text-center py-4" style={{ color: '#475569' }}>Geen logregels</p>
          )}
        </div>
      </div>
    </div>
  )
}
