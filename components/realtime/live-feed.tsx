'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase, type AgentLog } from '@/lib/supabase'
import { format } from 'date-fns'

type Props = {
  initialLogs: AgentLog[]
}

const eventConfig: Record<string, { color: string; bg: string; border: string; label: string }> = {
  task_start: {
    color: '#06b6d4',
    bg: 'rgba(6,182,212,0.1)',
    border: 'rgba(6,182,212,0.3)',
    label: 'START',
  },
  task_complete: {
    color: '#10b981',
    bg: 'rgba(16,185,129,0.1)',
    border: 'rgba(16,185,129,0.3)',
    label: 'DONE',
  },
  tool_use: {
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.1)',
    border: 'rgba(245,158,11,0.3)',
    label: 'TOOL',
  },
  message: {
    color: '#94a3b8',
    bg: 'rgba(148,163,184,0.08)',
    border: 'rgba(148,163,184,0.2)',
    label: 'MSG',
  },
  error: {
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.1)',
    border: 'rgba(239,68,68,0.3)',
    label: 'ERR',
  },
  info: {
    color: '#64748b',
    bg: 'rgba(100,116,139,0.08)',
    border: 'rgba(100,116,139,0.2)',
    label: 'INFO',
  },
}

const defaultEvent = {
  color: '#64748b',
  bg: 'rgba(100,116,139,0.08)',
  border: 'rgba(100,116,139,0.2)',
  label: 'LOG',
}

export function LiveFeed({ initialLogs }: Props) {
  const [logs, setLogs] = useState<AgentLog[]>(initialLogs)
  const listRef = useRef<HTMLDivElement>(null)
  const [newIds, setNewIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    const channel = supabase
      .channel('live-feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'agent_logs' },
        (payload) => {
          const newLog = payload.new as AgentLog
          setLogs(prev => [newLog, ...prev.slice(0, 49)])
          setNewIds(prev => new Set(prev).add(newLog.id))
          setTimeout(() => {
            setNewIds(prev => {
              const next = new Set(prev)
              next.delete(newLog.id)
              return next
            })
          }, 600)
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
            style={{ background: 'linear-gradient(180deg, #10b981, #06b6d4)', boxShadow: '0 0 8px rgba(16,185,129,0.6)' }}
          />
          <h2 className="text-sm font-semibold tracking-widest uppercase font-terminal" style={{ color: '#34d399' }}>
            Live Feed
          </h2>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full pulse-dot" style={{ background: '#10b981' }} />
          <span className="font-terminal text-xs" style={{ color: '#334155' }}>
            {logs.length} events
          </span>
        </div>
      </div>

      {/* Log entries */}
      <div ref={listRef} className="flex-1 p-3 space-y-2 overflow-auto">
        {logs.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <p className="font-terminal text-xs" style={{ color: '#334155' }}>No activity yet</p>
          </div>
        ) : (
          logs.map(log => {
            const cfg = eventConfig[log.event_type] ?? defaultEvent
            const isNew = newIds.has(log.id)
            return (
              <div
                key={log.id}
                className={`flex items-start gap-2.5 p-2.5 rounded-lg transition-all ${isNew ? 'slide-in-top' : ''}`}
                style={{
                  background: isNew ? `${cfg.bg}` : 'rgba(255,255,255,0.015)',
                  border: '1px solid rgba(255,255,255,0.04)',
                }}
              >
                {/* Event type badge */}
                <div className="shrink-0 mt-0.5">
                  <span
                    className="font-terminal px-1.5 py-0.5 rounded text-xs"
                    style={{
                      background: cfg.bg,
                      color: cfg.color,
                      border: `1px solid ${cfg.border}`,
                      fontSize: '9px',
                      letterSpacing: '0.1em',
                    }}
                  >
                    {cfg.label}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="font-terminal text-xs leading-relaxed" style={{ color: '#cbd5e1' }}>
                    {log.message}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-terminal text-xs" style={{ color: '#475569' }}>
                      {log.agent_name}
                    </span>
                    <span style={{ color: '#1e293b' }}>·</span>
                    <span className="font-terminal text-xs tabular-nums" style={{ color: '#334155' }}>
                      {format(new Date(log.created_at), 'HH:mm:ss')}
                    </span>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
