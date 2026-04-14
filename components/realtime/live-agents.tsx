'use client'

import { useEffect, useState } from 'react'
import { supabase, type AgentSession } from '@/lib/supabase'
import { formatDistanceToNow } from 'date-fns'
import { nl } from 'date-fns/locale'
import { Clock } from 'lucide-react'

type Props = {
  initialSessions: AgentSession[]
}

const statusConfig: Record<string, { color: string; label: string; glow: string }> = {
  active: { color: '#06b6d4', label: 'ACTIVE', glow: 'rgba(6,182,212,0.5)' },
  idle: { color: '#f59e0b', label: 'IDLE', glow: 'rgba(245,158,11,0.5)' },
  completed: { color: '#6366f1', label: 'DONE', glow: 'rgba(99,102,241,0.5)' },
  error: { color: '#ef4444', label: 'ERROR', glow: 'rgba(239,68,68,0.5)' },
}

function AgentAvatar({ name, status }: { name: string; status: string }) {
  const config = statusConfig[status] ?? statusConfig.idle
  const initials = name.slice(0, 2).toUpperCase()
  const isActive = status === 'active'

  return (
    <div className="relative shrink-0">
      {isActive && (
        <>
          <span
            className="pulse-ring absolute inset-0 rounded-full"
            style={{ border: `1px solid ${config.color}`, boxSizing: 'border-box' }}
          />
          <span
            className="pulse-ring absolute inset-0 rounded-full"
            style={{ border: `1px solid ${config.color}`, boxSizing: 'border-box', animationDelay: '0.5s' }}
          />
        </>
      )}
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center font-terminal text-xs font-bold relative z-10"
        style={{
          background: `${config.color}18`,
          border: `1px solid ${config.color}50`,
          color: config.color,
          boxShadow: isActive ? `0 0 12px ${config.glow}` : 'none',
        }}
      >
        {initials}
      </div>
    </div>
  )
}

export function LiveAgents({ initialSessions }: Props) {
  const [sessions, setSessions] = useState<AgentSession[]>(initialSessions)

  useEffect(() => {
    const channel = supabase
      .channel('live-agents')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'agent_sessions' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setSessions(prev => [payload.new as AgentSession, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            setSessions(prev =>
              prev.map(s => s.id === (payload.new as AgentSession).id ? payload.new as AgentSession : s)
            )
          } else if (payload.eventType === 'DELETE') {
            setSessions(prev => prev.filter(s => s.id !== (payload.old as { id: string }).id))
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  return (
    <div className="glass-card flex flex-col overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-1.5 h-4 rounded-full"
            style={{ background: 'linear-gradient(180deg, #6366f1, #06b6d4)', boxShadow: '0 0 8px rgba(99,102,241,0.6)' }}
          />
          <h2 className="text-sm font-semibold tracking-widest uppercase font-terminal" style={{ color: '#818cf8' }}>
            Agents
          </h2>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full pulse-dot" style={{ background: '#06b6d4' }} />
          <span className="font-terminal text-xs" style={{ color: '#334155' }}>
            {sessions.filter(s => s.status === 'active').length} active
          </span>
        </div>
      </div>

      {/* Agent list */}
      <div className="flex-1 p-3 space-y-2 overflow-auto">
        {sessions.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <p className="font-terminal text-xs" style={{ color: '#334155' }}>No active sessions</p>
          </div>
        ) : (
          sessions.map(session => {
            const config = statusConfig[session.status] ?? statusConfig.idle
            return (
              <div
                key={session.id}
                className="slide-in flex items-center gap-3 p-3 rounded-lg transition-all"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.05)',
                }}
              >
                <AgentAvatar name={session.agent_name} status={session.status} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-terminal text-sm font-medium truncate" style={{ color: '#f1f5f9' }}>
                      {session.agent_name}
                    </span>
                    <span
                      className="font-terminal text-xs px-1.5 py-0.5 rounded shrink-0"
                      style={{
                        background: `${config.color}15`,
                        color: config.color,
                        border: `1px solid ${config.color}30`,
                        fontSize: '10px',
                        letterSpacing: '0.08em',
                      }}
                    >
                      {config.label}
                    </span>
                  </div>
                  {session.current_task && (
                    <p className="font-terminal text-xs truncate" style={{ color: '#475569' }}>
                      {session.current_task}
                    </p>
                  )}
                  {session.project && (
                    <p className="font-terminal text-xs mt-0.5" style={{ color: '#334155' }}>
                      {session.project}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0 font-terminal text-xs" style={{ color: '#334155' }}>
                  <Clock size={10} />
                  {formatDistanceToNow(new Date(session.last_seen_at), { locale: nl })}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
