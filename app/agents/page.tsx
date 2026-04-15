export const dynamic = 'force-dynamic'

import { Bot, Clock, Cpu, AlertCircle, CheckCircle, Pause } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { nl } from 'date-fns/locale'

const SB_URL = 'https://logkkueavewqmaquuwfw.supabase.co'
const SB_KEY = 'sb_publishable_nqPICLQDoaXGb8hshPIYYg_uv9GRuid'
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
  active: { color: '#00d4ff', bg: 'rgba(0,212,255,0.1)', border: 'rgba(0,212,255,0.2)', label: 'Actief', icon: CheckCircle },
  idle: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)', label: 'Inactief', icon: Pause },
  completed: { color: '#4f52a0', bg: 'rgba(79,82,160,0.1)', border: 'rgba(79,82,160,0.2)', label: 'Klaar', icon: CheckCircle },
  error: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)', label: 'Fout', icon: AlertCircle },
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
  const other = sessions.filter((s: { status: string }) => s.status !== 'active')

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

      {/* Active agents */}
      {active.length > 0 && (
        <div className="space-y-3">
          <h2 className="hud-label">Actief</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {active.map((session: {
              id: string; session_id: string; status: 'active' | 'idle' | 'completed' | 'error';
              agent_name: string; current_task: string | null; project: string | null;
              model: string; started_at: string; last_seen_at: string
            }) => {
              const cfg = statusConfig[session.status]
              return (
                <div key={session.id} className="hud-card p-4">
                  <div className="hud-corners-bottom" />
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: cfg.bg }}>
                        <Bot size={16} style={{ color: cfg.color }} />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">{session.agent_name}</div>
                        {session.project && (
                          <div className="text-xs mt-0.5" style={{ color: '#475569' }}>{session.project}</div>
                        )}
                      </div>
                    </div>
                    <div className="px-2 py-1 rounded-md text-xs font-terminal flex items-center gap-1.5" style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                      <span className="w-1.5 h-1.5 rounded-full pulse-dot inline-block" style={{ background: cfg.color }} />
                      {cfg.label}
                    </div>
                  </div>

                  {session.current_task && (
                    <div className="mb-3 p-2.5 rounded-lg text-xs font-terminal" style={{ background: 'rgba(0,212,255,0.03)', color: '#94a3b8' }}>
                      {session.current_task}
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-xs font-terminal" style={{ color: '#475569' }}>
                    <span className="flex items-center gap-1"><Cpu size={10} /> {session.model}</span>
                    <span className="flex items-center gap-1">
                      <Clock size={10} /> Gestart {formatDistanceToNow(new Date(session.started_at), { locale: nl, addSuffix: true })}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Other sessions */}
      {other.length > 0 && (
        <div className="space-y-3">
          <h2 className="hud-label">Overige sessies</h2>
          <div className="hud-card overflow-hidden">
            <div className="hud-corners-bottom" />
            {other.map((session: {
              id: string; status: 'active' | 'idle' | 'completed' | 'error';
              agent_name: string; current_task: string | null; project: string | null;
              model: string; last_seen_at: string
            }, i: number) => {
              const cfg = statusConfig[session.status]
              return (
                <div key={session.id} className="flex items-center gap-4 px-4 py-3" style={{ borderTop: i > 0 ? '1px solid rgba(0,212,255,0.06)' : 'none' }}>
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: cfg.color }} />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-white">{session.agent_name}</span>
                    {session.project && <span className="text-xs ml-2 font-terminal" style={{ color: '#475569' }}>{session.project}</span>}
                  </div>
                  <span className="text-xs font-terminal px-2 py-0.5 rounded" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                  <span className="text-xs font-terminal shrink-0" style={{ color: '#475569' }}>
                    {formatDistanceToNow(new Date(session.last_seen_at), { locale: nl, addSuffix: true })}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

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
