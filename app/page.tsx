import { supabase } from '@/lib/supabase'
import { Bot, Activity, DollarSign, FolderKanban, ArrowUpRight, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { nl } from 'date-fns/locale'

export const revalidate = 30

async function getDashboardData() {
  const [sessions, logs, costs, projects] = await Promise.all([
    supabase.from('agent_sessions').select('*').order('last_seen_at', { ascending: false }),
    supabase.from('agent_logs').select('*').order('created_at', { ascending: false }).limit(10),
    supabase.from('cost_tracking').select('cost_usd, input_tokens, output_tokens'),
    supabase.from('projects').select('*').eq('status', 'active'),
  ])
  return {
    sessions: sessions.data ?? [],
    logs: logs.data ?? [],
    costs: costs.data ?? [],
    projects: projects.data ?? [],
  }
}

const statusColor: Record<string, string> = {
  active: '#10b981',
  idle: '#f59e0b',
  completed: '#6366f1',
  error: '#ef4444',
}

const eventIcon: Record<string, string> = {
  task_start: '▶',
  task_complete: '✓',
  tool_use: '⚡',
  message: '💬',
  error: '✗',
  info: 'ℹ',
}

export default async function DashboardPage() {
  const { sessions, logs, costs, projects } = await getDashboardData()

  const activeSessions = sessions.filter((s: { status: string }) => s.status === 'active')
  const totalCost = costs.reduce((sum: number, c: { cost_usd: number }) => sum + Number(c.cost_usd), 0)
  const totalTokens = costs.reduce((sum: number, c: { input_tokens: number; output_tokens: number }) => sum + c.input_tokens + c.output_tokens, 0)

  const stats = [
    { label: 'Actieve agents', value: activeSessions.length, total: sessions.length, icon: Bot, color: '#6366f1' },
    { label: 'Actieve projecten', value: projects.length, icon: FolderKanban, color: '#10b981' },
    { label: 'Totaal tokens', value: (totalTokens / 1000).toFixed(1) + 'K', icon: Activity, color: '#f59e0b' },
    { label: 'Kosten totaal', value: '$' + totalCost.toFixed(4), icon: DollarSign, color: '#ec4899' },
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Dashboard</h1>
          <p className="text-sm mt-0.5" style={{ color: '#94a3b8' }}>Overzicht van alle agents, projecten en kosten</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 pulse-dot inline-block" />
          Realtime actief
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl p-4" style={{ background: '#1a1a26', border: '1px solid #2a2a3d' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs" style={{ color: '#94a3b8' }}>{stat.label}</span>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${stat.color}20` }}>
                <stat.icon size={14} style={{ color: stat.color }} />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">{stat.value}</div>
            {'total' in stat && (
              <div className="text-xs mt-1" style={{ color: '#475569' }}>{stat.total} totaal</div>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Agent status */}
        <div className="rounded-xl p-4" style={{ background: '#1a1a26', border: '1px solid #2a2a3d' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-white flex items-center gap-2">
              <Bot size={14} style={{ color: '#6366f1' }} /> Agents
            </h2>
            <a href="/agents" className="text-xs flex items-center gap-1" style={{ color: '#6366f1' }}>
              Alles <ArrowUpRight size={11} />
            </a>
          </div>
          <div className="space-y-2">
            {sessions.slice(0, 5).map((session: { id: string; status: string; agent_name: string; current_task: string | null; last_seen_at: string }) => (
              <div key={session.id} className="flex items-center gap-3 p-2.5 rounded-lg" style={{ background: '#13131c' }}>
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: statusColor[session.status] }} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white truncate">{session.agent_name}</div>
                  {session.current_task && (
                    <div className="text-xs truncate mt-0.5" style={{ color: '#475569' }}>{session.current_task}</div>
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs shrink-0" style={{ color: '#475569' }}>
                  <Clock size={10} />
                  {formatDistanceToNow(new Date(session.last_seen_at), { locale: nl })}
                </div>
              </div>
            ))}
            {sessions.length === 0 && (
              <p className="text-sm text-center py-4" style={{ color: '#475569' }}>Geen actieve sessies</p>
            )}
          </div>
        </div>

        {/* Activity feed */}
        <div className="rounded-xl p-4" style={{ background: '#1a1a26', border: '1px solid #2a2a3d' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-white flex items-center gap-2">
              <Activity size={14} style={{ color: '#6366f1' }} /> Live activiteit
            </h2>
          </div>
          <div className="space-y-3">
            {logs.map((log: { id: string; event_type: string; message: string; agent_name: string; created_at: string }) => (
              <div key={log.id} className="flex items-start gap-2.5">
                <span className="text-xs mt-0.5 w-4 text-center shrink-0" style={{ color: '#6366f1' }}>
                  {eventIcon[log.event_type] ?? '·'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white leading-relaxed">{log.message}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#475569' }}>
                    {log.agent_name} · {formatDistanceToNow(new Date(log.created_at), { locale: nl, addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
            {logs.length === 0 && (
              <p className="text-sm text-center py-4" style={{ color: '#475569' }}>Geen activiteit</p>
            )}
          </div>
        </div>
      </div>

      {/* Projects */}
      <div className="rounded-xl p-4" style={{ background: '#1a1a26', border: '1px solid #2a2a3d' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-white flex items-center gap-2">
            <FolderKanban size={14} style={{ color: '#6366f1' }} /> Actieve projecten
          </h2>
          <a href="/projects" className="text-xs flex items-center gap-1" style={{ color: '#6366f1' }}>
            Alles <ArrowUpRight size={11} />
          </a>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {projects.map((project: { id: string; color: string; name: string; description: string | null }) => (
            <div key={project.id} className="p-3 rounded-lg" style={{ background: '#13131c', border: '1px solid #2a2a3d' }}>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: project.color }} />
                <span className="text-sm font-medium text-white truncate">{project.name}</span>
              </div>
              {project.description && (
                <p className="text-xs" style={{ color: '#475569' }}>{project.description}</p>
              )}
            </div>
          ))}
          {projects.length === 0 && (
            <p className="text-sm col-span-3 text-center py-4" style={{ color: '#475569' }}>Geen actieve projecten</p>
          )}
        </div>
      </div>
    </div>
  )
}
