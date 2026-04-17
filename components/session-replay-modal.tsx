'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { format, formatDistanceStrict } from 'date-fns'
import { nl } from 'date-fns/locale'
import { X, Search, Clock, Zap, AlertTriangle, ChevronDown, ChevronRight, Terminal } from 'lucide-react'
import type { AgentLog } from '@/lib/supabase'

// ─── Helpers ────────────────────────────────────────────────

const EVENT_COLORS: Record<string, string> = {
  task_start:    '#00d4ff',
  task_complete: '#10b981',
  tool_use:      '#f59e0b',
  error:         '#ef4444',
  message:       '#94a3b8',
  info:          '#64748b',
}

const TOOL_COLORS: Record<string, string> = {
  Bash:   '#f59e0b',
  Read:   '#6366f1',
  Write:  '#10b981',
  Edit:   '#ec4899',
  Glob:   '#8b5cf6',
  Grep:   '#06b6d4',
  WebFetch: '#f97316',
  Agent:  '#00d4ff',
}

function parseTool(message: string): string | null {
  const m = message.match(/^([A-Za-z]+):/)
  if (!m) return null
  const tool = m[1]
  const known = ['Bash', 'Read', 'Write', 'Edit', 'Glob', 'Grep', 'WebFetch', 'Agent', 'Task']
  return known.includes(tool) ? tool : null
}

function eventLabel(type: string, tool: string | null): string {
  if (type === 'task_start')    return 'START'
  if (type === 'task_complete') return 'DONE'
  if (type === 'error')         return 'ERR'
  if (type === 'tool_use')      return tool ?? 'TOOL'
  return type.toUpperCase().slice(0, 4)
}

function eventColor(type: string, tool: string | null): string {
  if (type === 'tool_use' && tool && TOOL_COLORS[tool]) return TOOL_COLORS[tool]
  return EVENT_COLORS[type] ?? '#64748b'
}

function fmtDelta(ms: number): string {
  if (ms < 1000)  return `+${ms}ms`
  if (ms < 60000) return `+${Math.round(ms / 1000)}s`
  return `+${Math.round(ms / 60000)}m`
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n) + '…' : s
}

type FilterType = 'all' | 'tool' | 'task' | 'error'

// ─── Mini timeline scrubber ──────────────────────────────────

function MiniTimeline({ logs, onSeek }: { logs: AgentLog[]; onSeek: (index: number) => void }) {
  if (logs.length < 2) return null

  const start = new Date(logs[0].created_at).getTime()
  const end   = new Date(logs[logs.length - 1].created_at).getTime()
  const span  = end - start || 1

  return (
    <div
      className="relative mx-4 mb-3 rounded"
      style={{ height: 24, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(0,212,255,0.08)', cursor: 'pointer' }}
      title="Klik op de tijdlijn om naar dat event te springen"
    >
      {logs.map((log, i) => {
        const pct = ((new Date(log.created_at).getTime() - start) / span) * 100
        const c   = eventColor(log.event_type, parseTool(log.message))
        return (
          <button
            key={log.id}
            onClick={() => onSeek(i)}
            style={{
              position: 'absolute',
              left: `${Math.min(pct, 98)}%`,
              top: '50%', transform: 'translateY(-50%)',
              width: log.event_type === 'error' ? 6 : 4,
              height: log.event_type === 'error' ? 6 : 4,
              borderRadius: '50%',
              background: c,
              boxShadow: log.event_type === 'error' ? `0 0 6px ${c}` : 'none',
              border: 'none', padding: 0, cursor: 'pointer',
            }}
            title={`${log.event_type}: ${log.message.slice(0, 60)}`}
          />
        )
      })}
    </div>
  )
}

// ─── Single event row ────────────────────────────────────────

function EventRow({ log, prevTime, highlight }: { log: AgentLog; prevTime: number | null; highlight: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const tool  = parseTool(log.message)
  const color = eventColor(log.event_type, tool)
  const label = eventLabel(log.event_type, tool)
  const delta = prevTime ? new Date(log.created_at).getTime() - prevTime : null
  const isLong = log.message.length > 100

  // Strip "ToolName: " prefix for cleaner display
  const displayMsg = tool ? log.message.replace(/^[A-Za-z]+:\s*/, '').trim() : log.message

  return (
    <div
      className="relative flex items-start gap-0 group"
      style={{
        background: highlight ? 'rgba(0,212,255,0.04)' : 'transparent',
        transition: 'background 0.2s',
      }}
    >
      {/* Timeline dot + connector */}
      <div className="flex flex-col items-center shrink-0" style={{ width: 24, paddingTop: 12 }}>
        <span
          style={{
            width: 7, height: 7, borderRadius: '50%', background: color,
            boxShadow: `0 0 ${log.event_type === 'error' ? 8 : 4}px ${color}`,
            flexShrink: 0,
          }}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 py-2 pr-3">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Timestamp */}
          <span className="font-terminal tabular-nums shrink-0" style={{ fontSize: 10, color: '#334155' }}>
            {format(new Date(log.created_at), 'HH:mm:ss')}
          </span>

          {/* Delta */}
          {delta !== null && (
            <span className="font-terminal shrink-0" style={{ fontSize: 9, color: '#1e293b', minWidth: 36 }}>
              {fmtDelta(delta)}
            </span>
          )}

          {/* Event badge */}
          <span
            className="font-terminal shrink-0 px-1.5 py-0.5 rounded"
            style={{ background: `${color}18`, color, fontSize: 9, letterSpacing: '0.08em', border: `1px solid ${color}28` }}
          >
            {label}
          </span>

          {/* Expand toggle for long messages */}
          {isLong && (
            <button
              onClick={() => setExpanded(e => !e)}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#334155', display: 'flex', alignItems: 'center' }}
            >
              {expanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
            </button>
          )}
        </div>

        {/* Message */}
        <p
          className="font-terminal mt-0.5"
          style={{
            fontSize: 11, color: '#94a3b8', lineHeight: 1.5,
            wordBreak: 'break-all',
            whiteSpace: expanded ? 'pre-wrap' : 'nowrap',
            overflow: expanded ? 'visible' : 'hidden',
            textOverflow: expanded ? 'clip' : 'ellipsis',
          }}
        >
          {expanded ? displayMsg : truncate(displayMsg, 110)}
        </p>
      </div>
    </div>
  )
}

// ─── Main modal ──────────────────────────────────────────────

interface Props {
  sessionId: string
  agentName: string
  onClose: () => void
  sessionMeta?: {
    project?: string | null
    model?: string
    startedAt?: string
    lastSeenAt?: string
  }
}

export function SessionReplayModal({ sessionId, agentName, onClose, sessionMeta }: Props) {
  const [logs, setLogs]       = useState<AgentLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState<FilterType>('all')
  const [search, setSearch]   = useState('')
  const [seekIdx, setSeekIdx] = useState<number | null>(null)
  const listRef               = useRef<HTMLDivElement>(null)

  // Load logs
  useEffect(() => {
    setLoading(true)
    fetch(`/api/session-logs?session_id=${encodeURIComponent(sessionId)}`)
      .then(r => r.ok ? r.json() : [])
      .then(d => setLogs(Array.isArray(d) ? d : []))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false))
  }, [sessionId])

  // ESC to close
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Scroll to seeked event
  useEffect(() => {
    if (seekIdx === null || !listRef.current) return
    const rows = listRef.current.querySelectorAll('[data-event-idx]')
    rows[seekIdx]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setTimeout(() => setSeekIdx(null), 1200)
  }, [seekIdx])

  // Filtered logs
  const filtered = useMemo(() => {
    let result = logs
    if (filter === 'tool')  result = result.filter(l => l.event_type === 'tool_use')
    if (filter === 'task')  result = result.filter(l => l.event_type === 'task_start' || l.event_type === 'task_complete')
    if (filter === 'error') result = result.filter(l => l.event_type === 'error')
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(l => l.message.toLowerCase().includes(q) || l.event_type.toLowerCase().includes(q))
    }
    return result
  }, [logs, filter, search])

  // Stats
  const stats = useMemo(() => {
    const errors = logs.filter(l => l.event_type === 'error').length
    const tools  = logs.filter(l => l.event_type === 'tool_use')
    const toolCounts: Record<string, number> = {}
    for (const t of tools) {
      const name = parseTool(t.message) ?? 'other'
      toolCounts[name] = (toolCounts[name] ?? 0) + 1
    }
    const duration = logs.length >= 2
      ? formatDistanceStrict(new Date(logs[logs.length - 1].created_at), new Date(logs[0].created_at), { locale: nl })
      : null
    return { errors, toolCounts, duration, total: logs.length }
  }, [logs])

  const topTools = Object.entries(stats.toolCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl rounded-lg overflow-hidden flex flex-col"
        style={{
          background: 'rgba(5,5,14,0.99)',
          border: '1px solid rgba(0,212,255,0.18)',
          maxHeight: '88vh',
          boxShadow: '0 0 60px rgba(0,212,255,0.08)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Corner brackets */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: 16, height: 16, borderTop: '2px solid #00d4ff', borderLeft: '2px solid #00d4ff', pointerEvents: 'none', zIndex: 2 }} />
        <div style={{ position: 'absolute', top: 0, right: 0, width: 16, height: 16, borderTop: '2px solid #00d4ff', borderRight: '2px solid #00d4ff', pointerEvents: 'none', zIndex: 2 }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, width: 16, height: 16, borderBottom: '2px solid #00d4ff', borderLeft: '2px solid #00d4ff', pointerEvents: 'none', zIndex: 2 }} />
        <div style={{ position: 'absolute', bottom: 0, right: 0, width: 16, height: 16, borderBottom: '2px solid #00d4ff', borderRight: '2px solid #00d4ff', pointerEvents: 'none', zIndex: 2 }} />

        {/* Header */}
        <div className="shrink-0 px-4 pt-4 pb-3" style={{ borderBottom: '1px solid rgba(0,212,255,0.1)' }}>
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Terminal size={12} style={{ color: '#00d4ff' }} />
                <span className="hud-label">Session Replay</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium" style={{ color: '#f1f5f9' }}>{agentName}</span>
                {sessionMeta?.project && (
                  <span className="font-terminal text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(79,82,160,0.15)', color: '#a5b4fc', fontSize: 10 }}>
                    {sessionMeta.project}
                  </span>
                )}
                {sessionMeta?.model && (
                  <span className="font-terminal text-xs" style={{ color: '#334155' }}>{sessionMeta.model}</span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              style={{ width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.15)', color: '#64748b', cursor: 'pointer' }}
            >
              <X size={13} />
            </button>
          </div>

          {/* Stats pills */}
          {!loading && logs.length > 0 && (
            <div className="flex items-center gap-3 flex-wrap">
              {stats.duration && (
                <div className="flex items-center gap-1.5 font-terminal" style={{ fontSize: 11, color: '#475569' }}>
                  <Clock size={10} style={{ color: '#00d4ff' }} />
                  {stats.duration}
                </div>
              )}
              <div className="flex items-center gap-1.5 font-terminal" style={{ fontSize: 11, color: '#475569' }}>
                <Zap size={10} style={{ color: '#f59e0b' }} />
                {stats.total} events
              </div>
              {stats.errors > 0 && (
                <div className="flex items-center gap-1.5 font-terminal" style={{ fontSize: 11, color: '#ef4444' }}>
                  <AlertTriangle size={10} />
                  {stats.errors} {stats.errors === 1 ? 'fout' : 'fouten'}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mini timeline scrubber */}
        {!loading && logs.length > 1 && (
          <div className="shrink-0 pt-3">
            <MiniTimeline logs={logs} onSeek={i => setSeekIdx(i)} />
          </div>
        )}

        {/* Filter + search bar */}
        {!loading && logs.length > 0 && (
          <div className="shrink-0 flex items-center gap-2 px-4 pb-3">
            {/* Filter tabs */}
            <div className="flex items-center gap-1">
              {(['all', 'tool', 'task', 'error'] as FilterType[]).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className="font-terminal px-2 py-1 rounded"
                  style={{
                    fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer', border: 'none',
                    background: filter === f ? 'rgba(0,212,255,0.12)' : 'transparent',
                    color: filter === f ? '#00d4ff' : '#334155',
                    transition: 'all 0.15s',
                  }}
                >
                  {f === 'all' ? `All (${logs.length})` : f === 'tool' ? `Tools (${logs.filter(l => l.event_type === 'tool_use').length})` : f === 'task' ? `Tasks` : `Errors (${stats.errors})`}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="flex items-center gap-1.5 flex-1 min-w-0 px-2 py-1 rounded" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(0,212,255,0.08)' }}>
              <Search size={10} style={{ color: '#334155', flexShrink: 0 }} />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Zoek in events..."
                className="font-terminal flex-1 bg-transparent outline-none"
                style={{ fontSize: 11, color: '#94a3b8', border: 'none', minWidth: 0 }}
              />
            </div>
          </div>
        )}

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(0,212,255,0.06)', flexShrink: 0 }} />

        {/* Event list */}
        <div className="flex-1 overflow-y-auto" ref={listRef}>
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-2">
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00d4ff', animation: 'pulse-dot 1s infinite' }} />
                <span className="font-terminal text-xs" style={{ color: '#334155' }}>Logs laden...</span>
              </div>
            </div>
          )}

          {!loading && logs.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <Terminal size={20} style={{ color: '#1e293b' }} />
              <span className="font-terminal text-xs" style={{ color: '#334155' }}>Geen logs voor deze sessie</span>
            </div>
          )}

          {!loading && logs.length > 0 && filtered.length === 0 && (
            <div className="flex items-center justify-center py-8">
              <span className="font-terminal text-xs" style={{ color: '#334155' }}>Geen events gevonden</span>
            </div>
          )}

          {!loading && filtered.length > 0 && (
            <div className="relative pl-6" style={{ borderLeft: '1px solid rgba(0,212,255,0.06)', marginLeft: 12 }}>
              {filtered.map((log, i) => (
                <div key={log.id} data-event-idx={i}>
                  <EventRow
                    log={log}
                    prevTime={i > 0 ? new Date(filtered[i - 1].created_at).getTime() : null}
                    highlight={seekIdx !== null && i === seekIdx}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer — tool usage summary */}
        {!loading && topTools.length > 0 && (
          <div
            className="shrink-0 px-4 py-2.5 flex items-center gap-3 flex-wrap"
            style={{ borderTop: '1px solid rgba(0,212,255,0.06)' }}
          >
            <span className="font-terminal" style={{ fontSize: 9, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Tools</span>
            {topTools.map(([tool, count]) => (
              <span key={tool} className="font-terminal flex items-center gap-1" style={{ fontSize: 10, color: TOOL_COLORS[tool] ?? '#475569' }}>
                {tool}<span style={{ color: '#1e293b' }}>×{count}</span>
              </span>
            ))}
            <span className="font-terminal ml-auto" style={{ fontSize: 10, color: '#1e293b' }}>ESC om te sluiten</span>
          </div>
        )}
      </div>
    </div>
  )
}
