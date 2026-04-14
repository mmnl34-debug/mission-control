export const dynamic = 'force-dynamic'

import { Bot, Clock, Cpu, AlertCircle, CheckCircle, Pause } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { nl } from 'date-fns/locale'

const SB_URL = 'https://logkkueavewqmaquuwfw.supabase.co'
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvZ2trdWVhdmV3cW1hcXV1d2Z3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0NjQ1NzksImV4cCI6MjA5MTA0MDU3OX0.3H-HBY7RTIfp72mEUbV-hztaLn58V4z1M3ot-rl_mms'
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
  active: { color: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)', label: 'Actief', icon: CheckCircle },
  idle: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)', label: 'Inactief', icon: Pause },
  completed: { color: '#6366f1', bg: 'rgba(99,102,241,0.1)', border: 'rgba(99,102,241,0.2)', label: 'Klaar', icon: CheckCircle },
  error: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)', label: 'Fout', icon: AlertCircle },
}

const eventColor: Record<string, string> = {
  task_start: '#6366f1',
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

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Agents</h1>
        <p className="text-sm mt-0.5" style={{ color: '#94a3b8' }}>{sessions.length} sessies · {active.length} actief</p>
      </div>

      {/* Active agents */}
      {active.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-medium uppercase tracking-wider" style={{ color: '#475569' }}>Actief</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {active.map((session: {
              id: string; session_id: string; status: 'active' | 'idle' | 'completed' | 'error';
              agent_name: string; current_task: string | null; project: string | null;
              model: string; started_at: string; last_seen_at: string
            }) => {
              const cfg = statusConfig[session.status]
              return (
                <div key={session.id} className="rounded-xl p-4" style={{ background: '#1a1a26', border: `1px solid ${cfg.border}` }}>
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
                    <div className="px-2 py-1 rounded-md text-xs flex items-center gap-1.5" style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                      <span className="w-1.5 h-1.5 rounded-full pulse-dot inline-block" style={{ background: cfg.color }} />
                      {cfg.label}
                    </div>
                  </div>

                  {session.current_task && (
                    <div className="mb-3 p-2.5 rounded-lg text-xs" style={{ background: '#13131c', color: '#94a3b8' }}>
                      {session.current_task}
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-xs" style={{ color: '#475569' }}>
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
          <h2 className="text-xs font-medium uppercase tracking-wider" style={{ color: '#475569' }}>Overige sessies</h2>
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #2a2a3d' }}>
            {other.map((session: {
              id: string; status: 'active' | 'idle' | 'completed' | 'error';
              agent_name: string; current_task: string | null; project: string | null;
              model: string; last_seen_at: string
            }, i: number) => {
              const cfg = statusConfig[session.status]
              return (
                <div key={session.id} className="flex items-center gap-4 px-4 py-3" style={{ background: '#1a1a26', borderTop: i > 0 ? '1px solid #2a2a3d' : 'none' }}>
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: cfg.color }} />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-white">{session.agent_name}</span>
                    {session.project && <span className="text-xs ml-2" style={{ color: '#475569' }}>{session.project}</span>}
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                  <span className="text-xs shrink-0" style={{ color: '#475569' }}>
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
        <h2 className="text-xs font-medium uppercase tracking-wider" style={{ color: '#475569' }}>Activiteitslog</h2>
        <div className="rounded-xl p-4 space-y-3" style={{ background: '#1a1a26', border: '1px solid #2a2a3d' }}>
          {logs.map((log: { id: string; event_type: string; agent_name: string; message: string; created_at: string }) => (
            <div key={log.id} className="flex items-start gap-3 text-xs">
              <span className="shrink-0 font-mono mt-0.5" style={{ color: '#475569', minWidth: '80px' }}>
                {format(new Date(log.created_at), 'HH:mm:ss')}
              </span>
              <span className="shrink-0 font-medium" style={{ color: eventColor[log.event_type] ?? '#94a3b8', minWidth: '70px' }}>
                {log.event_type.replace('_', ' ')}
              </span>
              <span className="shrink-0" style={{ color: '#6366f1', minWidth: '90px' }}>{log.agent_name}</span>
              <span style={{ color: '#94a3b8' }}>{log.message}</span>
            </div>
          ))}
          {logs.length === 0 && (
            <p className="text-sm text-center py-4" style={{ color: '#475569' }}>Geen logregels</p>
          )}
        </div>
      </div>
    </div>
  )
}
