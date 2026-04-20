'use client'

import { useState, useCallback, useRef } from 'react'
import { Search, Clock, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { SessionReplayModal } from '@/components/session-replay-modal'

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const HEADERS = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` }

type LogResult = {
  id: string
  session_id: string
  agent_name: string
  event_type: string
  message: string
  created_at: string
}

const EVENT_COLORS: Record<string, string> = {
  task_start: '#00d4ff', task_complete: '#10b981', tool_use: '#f59e0b',
  error: '#ef4444', message: '#94a3b8', info: '#64748b',
}

function highlight(text: string, query: string) {
  if (!query.trim()) return text
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text.slice(0, 120)
  const start = Math.max(0, idx - 40)
  const end   = Math.min(text.length, idx + query.length + 80)
  const before = (start > 0 ? '…' : '') + text.slice(start, idx)
  const match  = text.slice(idx, idx + query.length)
  const after  = text.slice(idx + query.length, end) + (end < text.length ? '…' : '')
  return { before, match, after }
}

export function SearchClient() {
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState<LogResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [replay, setReplay]   = useState<{ sessionId: string; agentName: string } | null>(null)
  const debounce              = useRef<ReturnType<typeof setTimeout> | null>(null)

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim() || q.length < 2) { setResults([]); setSearched(false); return }
    setLoading(true)
    try {
      const encoded = encodeURIComponent(`%${q}%`)
      const url = `${SB_URL}/rest/v1/agent_logs?message=ilike.${encoded}&order=created_at.desc&limit=100&select=id,session_id,agent_name,event_type,message,created_at`
      const res = await fetch(url, { headers: HEADERS })
      if (res.ok) {
        const data = await res.json()
        setResults(Array.isArray(data) ? data : [])
      }
    } finally {
      setLoading(false)
      setSearched(true)
    }
  }, [])

  const handleChange = (val: string) => {
    setQuery(val)
    if (debounce.current) clearTimeout(debounce.current)
    debounce.current = setTimeout(() => doSearch(val), 350)
  }

  const hl = (msg: string) => highlight(msg, query)

  return (
    <div className="relative min-h-full">
      <div className="orb-cyan" style={{ top: '-100px', right: '-100px' }} />
      <div className="relative z-10 p-4 lg:p-6 space-y-4 max-w-4xl">

        {/* Header */}
        <div>
          <h1 className="text-lg font-bold tracking-widest uppercase font-terminal" style={{ color: '#f1f5f9', letterSpacing: '0.2em' }}>
            Log Search
          </h1>
          <p className="font-terminal text-xs mt-1" style={{ color: '#334155' }}>
            Doorzoek alle agent logs over alle sessies heen
          </p>
        </div>

        {/* Search input */}
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-lg"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(0,212,255,0.2)', boxShadow: '0 0 20px rgba(0,212,255,0.05)' }}
        >
          <Search size={16} style={{ color: '#00d4ff', flexShrink: 0 }} />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={e => handleChange(e.target.value)}
            placeholder="Zoek in logs — bijv. 'sidebar', 'error', 'npm run build'…"
            className="flex-1 bg-transparent outline-none font-terminal text-sm"
            style={{ color: '#f1f5f9', border: 'none' }}
          />
          {loading && (
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00d4ff', animation: 'pulse-dot 0.8s infinite', flexShrink: 0 }} />
          )}
          {results.length > 0 && !loading && (
            <span className="font-terminal shrink-0" style={{ fontSize: 11, color: '#475569' }}>{results.length} resultaten</span>
          )}
        </div>

        {/* Results */}
        {searched && results.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <Search size={24} style={{ color: '#1e293b' }} />
            <span className="font-terminal text-xs" style={{ color: '#334155' }}>Geen resultaten voor &ldquo;{query}&rdquo;</span>
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-1">
            {results.map(log => {
              const color = EVENT_COLORS[log.event_type] ?? '#64748b'
              const hResult = hl(log.message)
              return (
                <button
                  key={log.id}
                  onClick={() => setReplay({ sessionId: log.session_id, agentName: log.agent_name })}
                  className="w-full text-left rounded-lg px-4 py-3 group transition-all"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(0,212,255,0.06)' }}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className="font-terminal px-1.5 py-0.5 rounded shrink-0"
                      style={{ background: `${color}18`, color, fontSize: 9, border: `1px solid ${color}28` }}
                    >
                      {log.event_type.replace('_', ' ').toUpperCase()}
                    </span>
                    <span className="font-terminal text-xs" style={{ color: '#00d4ff' }}>{log.agent_name}</span>
                    <span className="font-terminal ml-auto shrink-0 flex items-center gap-1" style={{ fontSize: 10, color: '#334155' }}>
                      <Clock size={9} />
                      {format(new Date(log.created_at), 'dd/MM HH:mm:ss')}
                    </span>
                    <ChevronRight size={12} className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: '#00d4ff' }} />
                  </div>
                  <p className="font-terminal text-xs" style={{ color: '#94a3b8', lineHeight: 1.5 }}>
                    {typeof hResult === 'string' ? hResult : (
                      <>
                        {hResult.before}
                        <mark style={{ background: 'rgba(0,212,255,0.25)', color: '#00d4ff', borderRadius: 2 }}>
                          {hResult.match}
                        </mark>
                        {hResult.after}
                      </>
                    )}
                  </p>
                </button>
              )
            })}
          </div>
        )}

        {!searched && !loading && (
          <div className="font-terminal text-xs py-6 text-center" style={{ color: '#1e293b' }}>
            Typ minimaal 2 tekens om te zoeken
          </div>
        )}
      </div>

      {replay && (
        <SessionReplayModal
          sessionId={replay.sessionId}
          agentName={replay.agentName}
          onClose={() => setReplay(null)}
        />
      )}
    </div>
  )
}
