'use client'

import { useState } from 'react'
import { Bot, Clock, Cpu } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { nl } from 'date-fns/locale'
import type { AgentSession } from '@/lib/supabase'
import { SessionReplayModal } from '@/components/session-replay-modal'

const statusConfig = {
  active: { color: '#00d4ff', bg: 'rgba(0,212,255,0.1)', border: 'rgba(0,212,255,0.2)', label: 'Actief' },
  idle: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)', label: 'Inactief' },
  completed: { color: '#4f52a0', bg: 'rgba(79,82,160,0.1)', border: 'rgba(79,82,160,0.2)', label: 'Klaar' },
  error: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)', label: 'Fout' },
} as const

interface ReplayState {
  sessionId: string
  agentName: string
  project?: string | null
  model?: string
  startedAt?: string
  lastSeenAt?: string
}

interface Props {
  sessions: AgentSession[]
}

export function AgentsClient({ sessions }: Props) {
  const [replay, setReplay] = useState<ReplayState | null>(null)

  const active = sessions.filter((s) => s.status === 'active')
  const other = sessions.filter((s) => s.status !== 'active')

  return (
    <>
      {replay && (
        <SessionReplayModal
          sessionId={replay.sessionId}
          agentName={replay.agentName}
          onClose={() => setReplay(null)}
          sessionMeta={{
            project: replay.project,
            model: replay.model,
            startedAt: replay.startedAt,
            lastSeenAt: replay.lastSeenAt,
          }}
        />
      )}

      {/* Active agents */}
      {active.length > 0 && (
        <div className="space-y-3">
          <h2 className="hud-label">Actief</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {active.map((session) => {
              const cfg = statusConfig[session.status] ?? statusConfig.idle
              return (
                <div key={session.id} className="hud-card p-4 relative">
                  <div className="hud-corners-bottom" />
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center"
                        style={{ background: cfg.bg }}
                      >
                        <Bot size={16} style={{ color: cfg.color }} />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">{session.agent_name}</div>
                        {session.project && (
                          <div className="text-xs mt-0.5" style={{ color: '#475569' }}>{session.project}</div>
                        )}
                      </div>
                    </div>
                    <div
                      className="px-2 py-1 rounded-md text-xs font-terminal flex items-center gap-1.5"
                      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full pulse-dot inline-block"
                        style={{ background: cfg.color }}
                      />
                      {cfg.label}
                    </div>
                  </div>

                  {session.current_task && (
                    <div
                      className="mb-3 p-2.5 rounded-lg text-xs font-terminal"
                      style={{ background: 'rgba(0,212,255,0.03)', color: '#94a3b8' }}
                    >
                      {session.current_task}
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-xs font-terminal" style={{ color: '#475569' }}>
                      <span className="flex items-center gap-1">
                        <Cpu size={10} /> {session.model}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={10} /> Gestart{' '}
                        {formatDistanceToNow(new Date(session.started_at), { locale: nl, addSuffix: true })}
                      </span>
                    </div>
                    <button
                      onClick={() => setReplay({
                        sessionId: session.session_id,
                        agentName: session.agent_name,
                        project: session.project,
                        model: session.model,
                        startedAt: session.started_at,
                        lastSeenAt: session.last_seen_at,
                      })}
                      className="font-terminal text-xs px-2 py-1 rounded"
                      style={{
                        background: 'rgba(0,212,255,0.08)',
                        color: '#00d4ff',
                        border: '1px solid rgba(0,212,255,0.2)',
                        fontSize: '10px',
                      }}
                    >
                      Replay
                    </button>
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
            {other.map((session, i) => {
              const cfg = statusConfig[session.status] ?? statusConfig.idle
              return (
                <div
                  key={session.id}
                  className="flex items-center gap-4 px-4 py-3"
                  style={{ borderTop: i > 0 ? '1px solid rgba(0,212,255,0.06)' : 'none' }}
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: cfg.color }} />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-white">{session.agent_name}</span>
                    {session.project && (
                      <span className="text-xs ml-2 font-terminal" style={{ color: '#475569' }}>
                        {session.project}
                      </span>
                    )}
                  </div>
                  <span
                    className="text-xs font-terminal px-2 py-0.5 rounded"
                    style={{ background: cfg.bg, color: cfg.color }}
                  >
                    {cfg.label}
                  </span>
                  <span className="text-xs font-terminal shrink-0" style={{ color: '#475569' }}>
                    {formatDistanceToNow(new Date(session.last_seen_at), { locale: nl, addSuffix: true })}
                  </span>
                  <button
                    onClick={() => setReplay({
                      sessionId: session.session_id,
                      agentName: session.agent_name,
                      project: session.project,
                      model: session.model,
                      startedAt: session.started_at,
                      lastSeenAt: session.last_seen_at,
                    })}
                    className="font-terminal text-xs px-2 py-1 rounded shrink-0"
                    style={{
                      background: 'rgba(0,212,255,0.06)',
                      color: '#475569',
                      border: '1px solid rgba(0,212,255,0.12)',
                      fontSize: '10px',
                    }}
                  >
                    Replay
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}
