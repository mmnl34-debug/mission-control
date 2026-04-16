export const dynamic = 'force-dynamic'

import type { AgentSession } from '@/lib/supabase'
import { PipelineGraph } from '@/components/pipeline-graph'

const SB_URL = 'https://logkkueavewqmaquuwfw.supabase.co'
const SB_KEY = 'sb_publishable_nqPICLQDoaXGb8hshPIYYg_uv9GRuid'
const SB_HEADERS = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` }

async function getSessions(): Promise<AgentSession[]> {
  const res = await fetch(
    `${SB_URL}/rest/v1/agent_sessions?select=*&order=last_seen_at.desc`,
    { headers: SB_HEADERS, cache: 'no-store' }
  )
  if (!res.ok) return []
  return res.json()
}

export default async function PipelinePage() {
  const sessions = await getSessions()
  const activeSessions = sessions.filter(s => s.status === 'active')

  return (
    <div className="relative min-h-full">
      {/* Ambient orbs */}
      <div className="orb-cyan" style={{ top: '-150px', right: '-100px' }} />
      <div className="orb-purple" style={{ bottom: '-150px', left: '-100px' }} />

      <div className="relative z-10 p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1
                className="text-lg font-bold tracking-widest uppercase font-terminal glow-text"
                style={{ color: '#f1f5f9', letterSpacing: '0.2em' }}
              >
                Pipeline Viewer
              </h1>
              {activeSessions.length > 0 && (
                <span
                  className="font-terminal text-xs px-2 py-0.5 rounded"
                  style={{
                    background: 'rgba(0,212,255,0.1)',
                    color: '#00d4ff',
                    border: '1px solid rgba(0,212,255,0.2)',
                    fontSize: 10,
                  }}
                >
                  {activeSessions.length} actief
                </span>
              )}
            </div>
            <p className="font-terminal text-xs tracking-wider" style={{ color: '#334155' }}>
              Multi-agent sessie flow
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span
              className="font-terminal text-xs px-3 py-1.5 rounded-lg"
              style={{
                background: 'rgba(0,212,255,0.05)',
                border: '1px solid rgba(0,212,255,0.12)',
                color: '#475569',
                fontSize: 10,
              }}
            >
              {sessions.length} sessies totaal
            </span>
          </div>
        </div>

        {/* Pipeline graph */}
        <div className="hud-card">
          <div className="hud-corners-bottom" />
          <div
            className="flex items-center px-3 py-2"
            style={{ borderBottom: '1px solid rgba(0,212,255,0.08)' }}
          >
            <span className="hud-label">Flow Graph</span>
          </div>
          <div className="p-4 overflow-auto">
            <PipelineGraph sessions={sessions} />
          </div>
        </div>

        {/* Legend */}
        <div className="hud-card">
          <div className="hud-corners-bottom" />
          <div
            className="flex items-center px-3 py-2"
            style={{ borderBottom: '1px solid rgba(0,212,255,0.08)' }}
          >
            <span className="hud-label">Legenda</span>
          </div>
          <div className="p-3 flex flex-wrap gap-4">
            {Object.entries({
              active: '#00d4ff',
              idle: '#f59e0b',
              completed: '#10b981',
              error: '#ef4444',
            }).map(([status, color]) => (
              <div key={status} className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-sm shrink-0"
                  style={{ background: color, opacity: 0.8 }}
                />
                <span className="font-terminal" style={{ color: '#64748b', fontSize: 10, textTransform: 'uppercase' }}>
                  {status}
                </span>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <svg width={24} height={12}>
                <line x1={0} y1={6} x2={24} y2={6} stroke="rgba(0,212,255,0.3)" strokeWidth={1.5} />
                <circle cx={12} cy={6} r={2.5} fill="#00d4ff" />
              </svg>
              <span className="font-terminal" style={{ color: '#64748b', fontSize: 10 }}>
                Data flow
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
