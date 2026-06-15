export const dynamic = 'force-dynamic'

import { Users, TrendingUp, FileText, CheckCircle2, Plus, ExternalLink } from 'lucide-react'
import Link from 'next/link'

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const HEADERS = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` }

type Task = { id: string; title: string; status: string; priority: number; created_at: string }

async function getHelixTasks(): Promise<Task[]> {
  const res = await fetch(
    `${SB_URL}/rest/v1/tasks?project=eq.Helix Studio Contact&select=*&order=created_at.desc`,
    { headers: HEADERS, cache: 'no-store' }
  )
  if (!res.ok) return []
  return res.json()
}

async function getAllHelixTasks(): Promise<Task[]> {
  const res = await fetch(
    `${SB_URL}/rest/v1/tasks?project=eq.Helix Studio&select=*&order=priority.asc,created_at.asc`,
    { headers: HEADERS, cache: 'no-store' }
  )
  if (!res.ok) return []
  return res.json()
}

const STAGES = [
  {
    key: 'leads',
    label: 'Leads',
    icon: Users,
    color: '#64748b',
    desc: 'Eerste contacten & interesse',
    filter: (t: Task) => t.status === 'todo',
  },
  {
    key: 'prospect',
    label: 'Prospect',
    icon: TrendingUp,
    color: '#00d4ff',
    desc: 'In gesprek / behoefteanalyse',
    filter: (t: Task) => t.status === 'in_progress',
  },
  {
    key: 'voorstel',
    label: 'Voorstel',
    icon: FileText,
    color: '#f59e0b',
    desc: 'Offerte uitgestuurd',
    filter: () => false, // toekomstige status
  },
  {
    key: 'klant',
    label: 'Klant',
    icon: CheckCircle2,
    color: '#10b981',
    desc: 'Opdracht gewonnen',
    filter: (t: Task) => t.status === 'done',
  },
]

function PriorityDot({ p }: { p: number }) {
  const c = p === 1 ? '#ef4444' : p === 2 ? '#f59e0b' : '#10b981'
  return <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: c, display: 'inline-block' }} />
}

export default async function HelixPage() {
  const [contacts, devTasks] = await Promise.all([getHelixTasks(), getAllHelixTasks()])

  const contactsByStage = STAGES.map(s => ({
    ...s,
    tasks: contacts.filter(s.filter),
  }))

  const totalContacts   = contacts.length
  const activeProspects = contacts.filter(t => t.status === 'in_progress').length
  const wonClients      = contacts.filter(t => t.status === 'done').length

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold font-terminal glow-text" style={{ color: '#f1f5f9' }}>
            Helix Studio Pipeline
          </h1>
          <p className="font-terminal text-xs mt-1" style={{ color: '#475569' }}>
            Client journey van Lead naar Klant
          </p>
        </div>
        <Link
          href="https://helix-studio-pi.vercel.app"
          target="_blank"
          className="flex items-center gap-1.5 font-terminal text-xs px-3 py-1.5 rounded-lg"
          style={{ background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.2)', color: '#00d4ff' }}
        >
          <ExternalLink size={11} /> Live site
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Totale contacten', value: totalContacts, color: '#94a3b8' },
          { label: 'Actieve prospects', value: activeProspects, color: '#00d4ff' },
          { label: 'Klanten gewonnen', value: wonClients, color: '#10b981' },
        ].map(s => (
          <div key={s.label} className="hud-card p-4">
            <div className="hud-corners-bottom" />
            <div className="font-terminal text-3xl font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="font-terminal text-xs mt-1" style={{ color: '#334155' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Pipeline kanban */}
      <div>
        <h2 className="font-terminal text-xs uppercase tracking-widest mb-3" style={{ color: '#334155' }}>
          Contactaanvragen pipeline
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {contactsByStage.map(stage => {
            const Icon = stage.icon
            return (
              <div key={stage.key} className="hud-card flex flex-col">
                <div className="hud-corners-bottom" />
                {/* Stage header */}
                <div className="px-3 py-2.5" style={{ borderBottom: `1px solid ${stage.color}20` }}>
                  <div className="flex items-center gap-2 mb-0.5">
                    <Icon size={12} style={{ color: stage.color }} />
                    <span className="font-terminal text-xs font-bold" style={{ color: stage.color }}>
                      {stage.label}
                    </span>
                    <span
                      className="ml-auto font-terminal text-xs px-1.5 py-0.5 rounded"
                      style={{ background: `${stage.color}18`, color: stage.color }}
                    >
                      {stage.tasks.length}
                    </span>
                  </div>
                  <p className="font-terminal" style={{ fontSize: 9, color: '#334155' }}>{stage.desc}</p>
                </div>

                {/* Cards */}
                <div className="p-2 space-y-1.5 flex-1">
                  {stage.tasks.length === 0 ? (
                    <div className="flex items-center justify-center py-6">
                      <span className="font-terminal text-xs" style={{ color: '#1e293b' }}>leeg</span>
                    </div>
                  ) : (
                    stage.tasks.map(t => (
                      <div
                        key={t.id}
                        className="p-2 rounded-lg"
                        style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${stage.color}15` }}
                      >
                        <div className="flex items-start gap-1.5">
                          <PriorityDot p={t.priority} />
                          <span className="font-terminal text-xs leading-tight" style={{ color: '#cbd5e1' }}>
                            {t.title}
                          </span>
                        </div>
                        <div className="font-terminal mt-1" style={{ fontSize: 9, color: '#334155' }}>
                          {new Date(t.created_at).toLocaleDateString('nl-NL')}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Open Helix dev taken */}
      <div>
        <h2 className="font-terminal text-xs uppercase tracking-widest mb-3" style={{ color: '#334155' }}>
          Open ontwikkeltaken
        </h2>
        <div className="hud-card">
          <div className="hud-corners-bottom" />
          <div className="divide-y" style={{ '--tw-divide-opacity': 1 } as React.CSSProperties}>
            {devTasks.filter(t => t.status !== 'done').length === 0 ? (
              <div className="p-4 font-terminal text-xs text-center" style={{ color: '#334155' }}>
                Geen open taken
              </div>
            ) : (
              devTasks.filter(t => t.status !== 'done').map(t => (
                <div
                  key={t.id}
                  className="flex items-center gap-2.5 px-4 py-2.5"
                  style={{ borderColor: 'rgba(0,212,255,0.05)' }}
                >
                  <PriorityDot p={t.priority} />
                  <span className="font-terminal text-xs flex-1" style={{ color: t.status === 'in_progress' ? '#00d4ff' : '#94a3b8' }}>
                    {t.title}
                  </span>
                  {t.status === 'in_progress' && (
                    <span className="font-terminal text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(0,212,255,0.1)', color: '#00d4ff', fontSize: 9 }}>
                      BEZIG
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Empty state hint */}
      <div
        className="rounded-lg p-4 flex items-center gap-3"
        style={{ background: 'rgba(0,212,255,0.03)', border: '1px dashed rgba(0,212,255,0.15)' }}
      >
        <Plus size={14} style={{ color: '#334155' }} />
        <p className="font-terminal text-xs" style={{ color: '#334155' }}>
          Contactaanvragen via de Helix Studio website komen automatisch binnen als &quot;Lead&quot; in deze pipeline.
        </p>
      </div>
    </div>
  )
}
