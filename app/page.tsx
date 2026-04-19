export const dynamic = 'force-dynamic'

import { type AgentSession, type AgentLog, type CostRecord, type Project, type Task, type Note, type PlannerEvent } from '@/lib/supabase'
import { LiveStats } from '@/components/realtime/live-stats'
import { ServiceHealth } from '@/components/service-health'
import { PipelineMini } from '@/components/pipeline-mini'
import { WeatherWidget } from '@/components/weather-widget'
import { NewsWidget } from '@/components/news-widget'
import { WeekOverview } from '@/components/week-overview'
import { BudgetTracker } from '@/components/budget-tracker'
import { NotesWidget } from '@/components/notes-widget'
import { PlannerWidget } from '@/components/planner-widget'
import { DashboardRealtime } from '@/components/dashboard-realtime'
import { ArrowUpRight, Bot, Radio, ListTodo, GitCommit, DollarSign, GitMerge } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { nl } from 'date-fns/locale'

const SB_URL = 'https://logkkueavewqmaquuwfw.supabase.co'
const SB_KEY = 'sb_publishable_nqPICLQDoaXGb8hshPIYYg_uv9GRuid'
const SB_HEADERS = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` }

async function sbFetch(path: string) {
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, { headers: SB_HEADERS, cache: 'no-store' })
  if (!res.ok) return []
  return res.json()
}

type GitCommitData = {
  sha: string
  commit: { message: string; author: { date: string } }
}

async function fetchGitCommits(): Promise<GitCommitData[]> {
  try {
    const res = await fetch(
      'https://api.github.com/repos/mmnl34-debug/mission-control/commits?per_page=5',
      {
        headers: { 'User-Agent': 'mission-control-dashboard' },
        cache: 'no-store',
      }
    )
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

async function getDashboardData() {
  const [sessions, logs, costs, projects, tasks, notes, plannerEvents, commits] = await Promise.all([
    sbFetch('agent_sessions?select=*&order=last_seen_at.desc'),
    sbFetch('agent_logs?select=*&order=created_at.desc&limit=15'),
    sbFetch('cost_tracking?select=*'),
    sbFetch('projects?select=*&status=eq.active'),
    sbFetch('tasks?select=*&order=priority.asc,created_at.asc'),
    sbFetch('notes?select=*&order=created_at.desc&limit=10'),
    sbFetch('planner_events?select=*&order=event_date.asc,event_time.asc&limit=20'),
    fetchGitCommits(),
  ])
  return {
    sessions: (sessions as AgentSession[]) ?? [],
    logs: (logs as AgentLog[]) ?? [],
    costs: (costs as CostRecord[]) ?? [],
    projects: (projects as Project[]) ?? [],
    tasks: (tasks as Task[]) ?? [],
    notes: (notes as Note[]) ?? [],
    plannerEvents: (plannerEvents as PlannerEvent[]) ?? [],
    commits: (commits as GitCommitData[]) ?? [],
  }
}

function BentoHeader({ title, href, badge }: { title: string; href: string; badge?: string }) {
  return (
    <div
      className="flex items-center justify-between px-3 py-2"
      style={{ borderBottom: '1px solid rgba(0,212,255,0.08)' }}
    >
      <div className="flex items-center gap-2">
        <span className="hud-label">{title}</span>
        {badge && (
          <span
            className="font-terminal text-xs px-1.5 py-0.5 rounded"
            style={{ background: 'rgba(0,212,255,0.1)', color: '#00d4ff', fontSize: '10px' }}
          >
            {badge}
          </span>
        )}
      </div>
      <Link
        href={href}
        className="flex items-center gap-1 font-terminal text-xs transition-colors"
        style={{ color: '#475569' }}
      >
        View all <ArrowUpRight size={11} />
      </Link>
    </div>
  )
}

export default async function DashboardPage() {
  const { sessions, logs, costs, projects, tasks, notes, plannerEvents, commits } = await getDashboardData()

  const activeSessions = sessions.filter(s => s.status === 'active')
  const todayStr = new Date().toISOString().slice(0, 10)
  const todayCosts = costs.filter(c => c.date === todayStr)
  const todayTotal = todayCosts.reduce((s, c) => s + Number(c.cost_usd), 0)

  // Top model today
  const modelCosts: Record<string, number> = {}
  for (const c of todayCosts) {
    modelCosts[c.model] = (modelCosts[c.model] ?? 0) + Number(c.cost_usd)
  }
  const topModel = Object.entries(modelCosts).sort((a, b) => b[1] - a[1])[0]
  const topModelPct = topModel && todayTotal > 0 ? ((topModel[1] / todayTotal) * 100).toFixed(0) : '0'

  const doneTasks = tasks.filter(t => t.status === 'done').length

  return (
    <div className="relative min-h-full">
      {/* Ambient background orbs */}
      <div className="orb-purple" style={{ top: '-200px', right: '-150px' }} />
      <div className="orb-cyan" style={{ bottom: '-150px', left: '-100px' }} />

      <div className="relative z-10 p-4 space-y-3">
        <DashboardRealtime />

        {/* Header — verborgen op mobiel (topbar doet dit al) */}
        <div className="hidden lg:flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1
                className="text-lg font-bold tracking-widest uppercase font-terminal glow-text"
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

        {/* Service health */}
        <ServiceHealth />

        {/* Stats row */}
        <LiveStats
          initialSessions={sessions}
          initialCosts={costs}
          initialProjects={projects}
        />

        {/* Weer + Nieuws rij */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <WeatherWidget />
          <div className="lg:col-span-2">
            <NewsWidget />
          </div>
        </div>

        {/* Bento grid row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Agents card */}
          <div className="hud-card">
            <div className="hud-corners-bottom" />
            <BentoHeader title="Agents" href="/agents" badge={`${activeSessions.length} active`} />
            <div className="p-3 space-y-2 bento-items-mobile">
              {sessions.slice(0, 4).map(session => {
                const colors: Record<string, string> = { active: '#00d4ff', idle: '#f59e0b', completed: '#4f52a0', error: '#ef4444' }
                const c = colors[session.status] ?? '#64748b'
                return (
                  <div key={session.id} className="flex items-center gap-2.5 py-1.5">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: c, boxShadow: `0 0 6px ${c}` }} />
                    <span className="font-terminal text-xs truncate" style={{ color: '#cbd5e1' }}>{session.agent_name}</span>
                    <span className="ml-auto font-terminal shrink-0" style={{ color: c, fontSize: '9px', letterSpacing: '0.08em' }}>
                      {session.status.toUpperCase()}
                    </span>
                  </div>
                )
              })}
              {sessions.length === 0 && (
                <div className="flex items-center justify-center py-4">
                  <Bot size={14} style={{ color: '#334155' }} />
                  <span className="font-terminal text-xs ml-2" style={{ color: '#334155' }}>Geen sessies</span>
                </div>
              )}
            </div>
          </div>

          {/* Feed card */}
          <div className="hud-card">
            <div className="hud-corners-bottom" />
            <BentoHeader title="Live Feed" href="/feed" badge={`${logs.length} events`} />
            <div className="p-3 space-y-2 bento-items-mobile">
              {logs.slice(0, 4).map(log => {
                const eventColors: Record<string, string> = {
                  task_start: '#00d4ff', task_complete: '#10b981', tool_use: '#f59e0b',
                  message: '#94a3b8', error: '#ef4444', info: '#64748b',
                }
                const c = eventColors[log.event_type] ?? '#64748b'
                return (
                  <div key={log.id} className="flex items-start gap-2 py-1">
                    <span
                      className="font-terminal px-1 py-0.5 rounded shrink-0"
                      style={{ background: `${c}18`, color: c, fontSize: '8px', letterSpacing: '0.1em', border: `1px solid ${c}30` }}
                    >
                      {log.event_type === 'task_start' ? 'START' : log.event_type === 'task_complete' ? 'DONE' : log.event_type.toUpperCase()}
                    </span>
                    <span className="font-terminal text-xs truncate" style={{ color: '#94a3b8' }}>{log.message}</span>
                  </div>
                )
              })}
              {logs.length === 0 && (
                <div className="flex items-center justify-center py-4">
                  <Radio size={14} style={{ color: '#334155' }} />
                  <span className="font-terminal text-xs ml-2" style={{ color: '#334155' }}>Geen activiteit</span>
                </div>
              )}
            </div>
          </div>

          {/* Git activity card — verborgen op mobiel */}
          <div className="hud-card mc-hide-mobile">
            <div className="hud-corners-bottom" />
            <BentoHeader title="Git Activity" href="https://github.com/mmnl34-debug/mission-control" badge={`${commits.length} commits`} />
            <div className="p-3 space-y-2.5">
              {commits.length > 0 ? commits.slice(0, 4).map(commit => (
                <div key={commit.sha} className="flex items-start gap-2">
                  <GitCommit size={12} className="shrink-0 mt-0.5" style={{ color: '#00d4ff' }} />
                  <div className="min-w-0 flex-1">
                    <p className="font-terminal text-xs truncate" style={{ color: '#cbd5e1' }}>
                      {commit.commit.message.split('\n')[0].slice(0, 60)}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-terminal" style={{ color: '#4f52a0', fontSize: '10px' }}>
                        {commit.sha.slice(0, 7)}
                      </span>
                      <span className="font-terminal" style={{ color: '#334155', fontSize: '10px' }}>
                        {formatDistanceToNow(new Date(commit.commit.author.date), { locale: nl, addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="flex items-center justify-center py-4">
                  <GitCommit size={14} style={{ color: '#334155' }} />
                  <span className="font-terminal text-xs ml-2" style={{ color: '#334155' }}>Geen commits beschikbaar</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bento grid row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Tasks card — 2fr */}
          <div className="hud-card lg:col-span-2">
            <div className="hud-corners-bottom" />
            <BentoHeader title="Taken" href="/tasks" badge={`${doneTasks}/${tasks.length} klaar`} />
            <div className="p-3">
              {/* Progress bar */}
              <div className="mb-3">
                <div className="w-full h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: tasks.length > 0 ? `${(doneTasks / tasks.length) * 100}%` : '0%',
                      background: 'linear-gradient(90deg, #00d4ff, #10b981)',
                    }}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                {tasks.slice(0, 5).map(task => {
                  const dotColors: Record<string, string> = { todo: '#475569', in_progress: '#00d4ff', done: '#10b981' }
                  return (
                    <div key={task.id} className="flex items-center gap-2 py-1">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: dotColors[task.status] ?? '#475569' }}
                      />
                      <span
                        className="font-terminal text-xs truncate"
                        style={{
                          color: task.status === 'done' ? '#475569' : '#cbd5e1',
                          textDecoration: task.status === 'done' ? 'line-through' : 'none',
                        }}
                      >
                        {task.title}
                      </span>
                    </div>
                  )
                })}
                {tasks.length === 0 && (
                  <div className="flex items-center justify-center py-4">
                    <ListTodo size={14} style={{ color: '#334155' }} />
                    <span className="font-terminal text-xs ml-2" style={{ color: '#334155' }}>Geen taken</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Costs card — 1fr */}
          <div className="hud-card">
            <div className="hud-corners-bottom" />
            <BentoHeader title="Kosten" href="/costs" badge="vandaag" />
            <div className="p-3">
              <div className="mb-3">
                <div className="font-terminal text-2xl font-bold" style={{ color: '#f1f5f9' }}>
                  ${todayTotal.toFixed(4)}
                </div>
                <span className="font-terminal text-xs" style={{ color: '#334155' }}>totaal vandaag</span>
              </div>
              {topModel ? (
                <div className="flex items-center gap-2 p-2.5 rounded-lg mb-3" style={{ background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.1)' }}>
                  <DollarSign size={12} style={{ color: '#00d4ff' }} />
                  <div className="min-w-0 flex-1">
                    <p className="font-terminal text-xs truncate" style={{ color: '#cbd5e1' }}>{topModel[0]}</p>
                    <p className="font-terminal" style={{ color: '#00d4ff', fontSize: '10px' }}>{topModelPct}% van totaal</p>
                  </div>
                </div>
              ) : (
                <p className="font-terminal text-xs mb-3" style={{ color: '#334155' }}>Geen kosten vandaag</p>
              )}
              <BudgetTracker todayTotal={todayTotal} />
            </div>
          </div>
        </div>

        {/* Bento grid row 3 — Notities + Planner */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <NotesWidget initialNotes={notes} />
          <PlannerWidget initialEvents={plannerEvents} />
        </div>

        {/* Weekoverzicht */}
        <WeekOverview />

        {/* Bento grid row 3 — Pipeline (verborgen op mobiel) */}
        <div className="hud-card mc-hide-mobile">
          <div className="hud-corners-bottom" />
          <BentoHeader title="Pipeline" href="/pipeline" badge={`${activeSessions.length} actief`} />
          <div className="p-3">
            <PipelineMini />
          </div>
        </div>

        {/* Mobile-only snelle links naar pipeline + git */}
        <div className="flex gap-2 lg:hidden">
          <Link
            href="/pipeline"
            className="flex-1 flex items-center justify-center gap-2 font-terminal text-xs py-2.5 rounded-lg"
            style={{
              background: 'rgba(0,212,255,0.05)',
              border: '1px solid rgba(0,212,255,0.12)',
              color: '#00d4ff',
            }}
          >
            <GitMerge size={13} />
            Pipeline
          </Link>
          <a
            href="https://github.com/mmnl34-debug/mission-control"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 font-terminal text-xs py-2.5 rounded-lg"
            style={{
              background: 'rgba(79,82,160,0.08)',
              border: '1px solid rgba(79,82,160,0.2)',
              color: '#94a3b8',
            }}
          >
            <GitCommit size={13} />
            GitHub
          </a>
        </div>
      </div>
    </div>
  )
}
