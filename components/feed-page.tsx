'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { supabase, type AgentLog } from '@/lib/supabase'
import { format } from 'date-fns'
import { Radio, Search, ToggleLeft, ToggleRight } from 'lucide-react'

type Props = {
  initialLogs: AgentLog[]
  activeSessions: number
}

const eventConfig: Record<string, { color: string; bg: string; border: string; label: string }> = {
  task_start: { color: '#00d4ff', bg: 'rgba(0,212,255,0.1)', border: 'rgba(0,212,255,0.3)', label: 'START' },
  task_complete: { color: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.3)', label: 'DONE' },
  tool_use: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)', label: 'TOOL' },
  message: { color: '#94a3b8', bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.2)', label: 'MSG' },
  error: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)', label: 'ERR' },
  info: { color: '#64748b', bg: 'rgba(100,116,139,0.08)', border: 'rgba(100,116,139,0.2)', label: 'INFO' },
}

const defaultEvent = { color: '#64748b', bg: 'rgba(100,116,139,0.08)', border: 'rgba(100,116,139,0.2)', label: 'LOG' }

const FILTERS = ['ALL', 'START', 'DONE', 'TOOL', 'ERROR'] as const
type Filter = typeof FILTERS[number]

const filterToType: Record<string, string> = {
  START: 'task_start',
  DONE: 'task_complete',
  TOOL: 'tool_use',
  ERROR: 'error',
}

export function FeedPage({ initialLogs, activeSessions }: Props) {
  const [logs, setLogs] = useState<AgentLog[]>(initialLogs)
  const [newIds, setNewIds] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState<Filter>('ALL')
  const [search, setSearch] = useState('')
  const [compact, setCompact] = useState(false)
  const notifPermAsked = useRef(false)

  const requestNotifPermission = useCallback(() => {
    if (notifPermAsked.current) return
    notifPermAsked.current = true
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  useEffect(() => {
    const channel = supabase
      .channel('feed-page')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'agent_logs' },
        (payload) => {
          const newLog = payload.new as AgentLog
          setLogs(prev => [newLog, ...prev.slice(0, 99)])
          setNewIds(prev => new Set(prev).add(newLog.id))
          setTimeout(() => {
            setNewIds(prev => {
              const next = new Set(prev)
              next.delete(newLog.id)
              return next
            })
          }, 600)

          // Browser notification for errors
          if (newLog.event_type === 'error') {
            requestNotifPermission()
            if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
              new Notification('Mission Control — Error', {
                body: newLog.message,
                icon: '/favicon.ico',
              })
            }
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [requestNotifPermission])

  const filtered = logs.filter(log => {
    if (filter !== 'ALL' && log.event_type !== filterToType[filter]) return false
    if (search && !log.message.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Radio size={20} style={{ color: '#00d4ff' }} />
            <h1 className="text-xl font-semibold text-white">Live Feed</h1>
          </div>
          <p className="font-terminal text-xs" style={{ color: '#475569' }}>
            {activeSessions} actieve sessie{activeSessions !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg font-terminal text-xs" style={{ background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.15)', color: '#00d4ff' }}>
          <span className="w-1.5 h-1.5 rounded-full pulse-dot" style={{ background: '#00d4ff' }} />
          REALTIME
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Filters */}
        <div className="flex items-center gap-1">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="font-terminal text-xs px-2.5 py-1.5 rounded transition-all"
              style={{
                background: filter === f ? 'rgba(0,212,255,0.15)' : 'rgba(255,255,255,0.03)',
                color: filter === f ? '#00d4ff' : '#475569',
                border: filter === f ? '1px solid rgba(0,212,255,0.3)' : '1px solid rgba(255,255,255,0.06)',
              }}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg flex-1 max-w-xs" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <Search size={12} style={{ color: '#475569' }} />
          <input
            type="text"
            placeholder="Zoek in berichten..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none font-terminal text-xs flex-1"
            style={{ color: '#cbd5e1' }}
          />
        </div>

        {/* Compact toggle */}
        <button
          onClick={() => setCompact(c => !c)}
          className="flex items-center gap-1.5 font-terminal text-xs transition-all"
          style={{ color: compact ? '#00d4ff' : '#475569' }}
        >
          {compact ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
          Compact
        </button>
      </div>

      {/* Log entries */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="font-terminal text-xs" style={{ color: '#334155' }}>Geen events gevonden</p>
          </div>
        ) : (
          filtered.map(log => {
            const cfg = eventConfig[log.event_type] ?? defaultEvent
            const isNew = newIds.has(log.id)
            return (
              <div
                key={log.id}
                className={`flex items-start gap-2.5 rounded-lg transition-all ${isNew ? 'slide-in-top' : ''}`}
                style={{
                  padding: compact ? '6px 10px' : '10px 12px',
                  background: isNew ? cfg.bg : 'rgba(255,255,255,0.015)',
                  border: '1px solid rgba(0,212,255,0.06)',
                }}
              >
                <span
                  className="font-terminal px-1.5 py-0.5 rounded shrink-0"
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
                <p className="font-terminal text-xs leading-relaxed flex-1 min-w-0" style={{ color: '#cbd5e1' }}>
                  {log.message}
                </p>
                {!compact && (
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-terminal text-xs" style={{ color: '#475569' }}>{log.agent_name}</span>
                    <span className="font-terminal text-xs tabular-nums" style={{ color: '#334155' }}>
                      {format(new Date(log.created_at), 'HH:mm:ss')}
                    </span>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
