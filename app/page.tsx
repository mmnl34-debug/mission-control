import { supabase, type AgentSession, type AgentLog, type CostRecord, type Project } from '@/lib/supabase'
import { LiveStats } from '@/components/realtime/live-stats'
import { LiveAgents } from '@/components/realtime/live-agents'
import { LiveFeed } from '@/components/realtime/live-feed'
import { ArrowUpRight } from 'lucide-react'

async function getDashboardData() {
  const [sessions, logs, costs, projects] = await Promise.all([
    supabase.from('agent_sessions').select('*').order('last_seen_at', { ascending: false }),
    supabase.from('agent_logs').select('*').order('created_at', { ascending: false }).limit(20),
    supabase.from('cost_tracking').select('*'),
    supabase.from('projects').select('*').eq('status', 'active'),
  ])
  return {
    sessions: sessions.data ?? [],
    logs: logs.data ?? [],
    costs: costs.data ?? [],
    projects: projects.data ?? [],
  }
}

export default async function DashboardPage() {
  const { sessions, logs, costs, projects } = await getDashboardData()

  return (
    <div className="relative min-h-full">
      {/* Ambient background orbs */}
      <div
        className="orb-purple"
        style={{ top: '-200px', right: '-150px' }}
      />
      <div
        className="orb-cyan"
        style={{ bottom: '-150px', left: '-100px' }}
      />

      <div className="relative z-10 p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1
                className="text-2xl font-bold tracking-widest uppercase font-terminal glow-text"
                style={{ color: '#f1f5f9', letterSpacing: '0.2em' }}
              >
                Mission Control
              </h1>
            </div>
            <p className="font-terminal text-xs tracking-wider" style={{ color: '#334155' }}>
              AI Agent Monitoring Dashboard
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* System online badge */}
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg font-terminal text-xs"
              style={{
                background: 'rgba(16,185,129,0.05)',
                border: '1px solid rgba(16,185,129,0.2)',
                color: '#10b981',
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full pulse-dot" style={{ background: '#10b981' }} />
              REALTIME ACTIVE
            </div>
          </div>
        </div>

        {/* Stats row — client component with realtime */}
        <LiveStats
          initialSessions={sessions as AgentSession[]}
          initialCosts={costs as CostRecord[]}
          initialProjects={projects as Project[]}
        />

        {/* Main two-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" style={{ minHeight: '400px' }}>
          <LiveAgents initialSessions={sessions as AgentSession[]} />
          <LiveFeed initialLogs={logs as AgentLog[]} />
        </div>

        {/* Projects section — server-rendered */}
        <div className="glass-card overflow-hidden">
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-1.5 h-4 rounded-full"
                style={{ background: 'linear-gradient(180deg, #6366f1, #ec4899)', boxShadow: '0 0 8px rgba(99,102,241,0.6)' }}
              />
              <h2 className="text-sm font-semibold tracking-widest uppercase font-terminal" style={{ color: '#818cf8' }}>
                Active Projects
              </h2>
            </div>
            <a
              href="/projects"
              className="flex items-center gap-1 font-terminal text-xs transition-colors"
              style={{ color: '#475569' }}
            >
              View all <ArrowUpRight size={11} />
            </a>
          </div>

          <div className="p-4">
            {projects.length === 0 ? (
              <p className="font-terminal text-xs text-center py-4" style={{ color: '#334155' }}>
                No active projects
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {projects.map((project: { id: string; color: string; name: string; description: string | null }) => (
                  <div
                    key={project.id}
                    className="p-3 rounded-lg transition-all"
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{
                          background: project.color,
                          boxShadow: `0 0 6px ${project.color}80`,
                        }}
                      />
                      <span className="font-terminal text-sm font-medium truncate" style={{ color: '#f1f5f9' }}>
                        {project.name}
                      </span>
                    </div>
                    {project.description && (
                      <p className="font-terminal text-xs" style={{ color: '#475569' }}>
                        {project.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
