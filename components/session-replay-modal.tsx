'use client'

import { useEffect, useState, useCallback } from 'react'
import { format } from 'date-fns'
import { X } from 'lucide-react'
import type { AgentLog } from '@/lib/supabase'

const eventColors: Record<string, string> = {
  task_start: '#00d4ff',
  task_complete: '#10b981',
  tool_use: '#f59e0b',
  error: '#ef4444',
  message: '#94a3b8',
  info: '#94a3b8',
}

function eventLabel(type: string): string {
  switch (type) {
    case 'task_start': return 'START'
    case 'task_complete': return 'DONE'
    case 'tool_use': return 'TOOL'
    case 'error': return 'ERR'
    default: return type.toUpperCase().slice(0, 4)
  }
}

interface Props {
  sessionId: string
  agentName: string
  onClose: () => void
}

export function SessionReplayModal({ sessionId, agentName, onClose }: Props) {
  const [logs, setLogs] = useState<AgentLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/session-logs?session_id=${encodeURIComponent(sessionId)}`)
        if (res.ok) {
          const data = await res.json()
          setLogs(Array.isArray(data) ? data : [])
        }
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [sessionId])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl mx-4 rounded-lg overflow-hidden"
        style={{
          background: 'rgba(4,4,12,0.98)',
          border: '1px solid rgba(0,212,255,0.2)',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 shrink-0"
          style={{ borderBottom: '1px solid rgba(0,212,255,0.1)' }}
        >
          <div>
            <span className="hud-label">Session Replay</span>
            <span className="font-terminal text-xs ml-3" style={{ color: '#475569' }}>{agentName}</span>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center rounded"
            style={{ color: '#475569', width: 28, height: 28 }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Timeline */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <span className="font-terminal text-xs" style={{ color: '#475569' }}>Laden...</span>
            </div>
          )}

          {!loading && logs.length === 0 && (
            <div className="flex items-center justify-center py-8">
              <span className="font-terminal text-xs" style={{ color: '#475569' }}>Geen logs gevonden</span>
            </div>
          )}

          {!loading && logs.length > 0 && (
            <div className="relative pl-4">
              {/* Vertical line */}
              <div
                className="absolute top-2 bottom-2 left-0"
                style={{ width: 1, background: 'rgba(0,212,255,0.12)' }}
              />

              <div className="space-y-3">
                {logs.map((log) => {
                  const color = eventColors[log.event_type] ?? '#94a3b8'
                  return (
                    <div key={log.id} className="relative flex items-start gap-3">
                      {/* Dot on vertical line */}
                      <div
                        className="absolute -left-4 flex items-center justify-center"
                        style={{ top: 4, width: 8, height: 8, marginLeft: '-3px' }}
                      >
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ background: color, boxShadow: `0 0 4px ${color}` }}
                        />
                      </div>

                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <span
                          className="font-terminal shrink-0 tabular-nums"
                          style={{ color: '#475569', fontSize: '10px', minWidth: 56, paddingTop: 1 }}
                        >
                          {format(new Date(log.created_at), 'HH:mm:ss')}
                        </span>
                        <span
                          className="font-terminal shrink-0 px-1.5 py-0.5 rounded"
                          style={{
                            background: `${color}18`,
                            color,
                            fontSize: '9px',
                            letterSpacing: '0.08em',
                            border: `1px solid ${color}30`,
                          }}
                        >
                          {eventLabel(log.event_type)}
                        </span>
                        <span
                          className="font-terminal text-xs flex-1 min-w-0"
                          style={{ color: '#94a3b8', lineHeight: 1.5 }}
                        >
                          {log.message}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-4 py-2 shrink-0 flex items-center justify-between"
          style={{ borderTop: '1px solid rgba(0,212,255,0.06)' }}
        >
          <span className="font-terminal" style={{ color: '#334155', fontSize: '10px' }}>
            {logs.length} events
          </span>
          <span className="font-terminal" style={{ color: '#334155', fontSize: '10px' }}>
            ESC om te sluiten
          </span>
        </div>
      </div>
    </div>
  )
}
