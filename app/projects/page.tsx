export const dynamic = 'force-dynamic'

import { FolderKanban, Circle, CheckCircle2, PauseCircle, Archive } from 'lucide-react'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale'
import { NewProjectButton } from '@/components/new-project-button'

const SB_URL = 'https://logkkueavewqmaquuwfw.supabase.co'
const SB_KEY = 'sb_publishable_nqPICLQDoaXGb8hshPIYYg_uv9GRuid'
const SB_HEADERS = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` }

async function getData() {
  const res = await fetch(`${SB_URL}/rest/v1/projects?select=*&order=updated_at.desc`, { headers: SB_HEADERS, cache: 'no-store' })
  if (!res.ok) return []
  return res.json()
}

const statusConfig = {
  active: { label: 'Actief', color: '#00d4ff', icon: Circle },
  paused: { label: 'Gepauzeerd', color: '#f59e0b', icon: PauseCircle },
  completed: { label: 'Afgerond', color: '#10b981', icon: CheckCircle2 },
  archived: { label: 'Gearchiveerd', color: '#475569', icon: Archive },
}

export default async function ProjectsPage() {
  const projects = await getData()

  const byStatus = {
    active: projects.filter((p: { status: string }) => p.status === 'active'),
    paused: projects.filter((p: { status: string }) => p.status === 'paused'),
    completed: projects.filter((p: { status: string }) => p.status === 'completed'),
    archived: projects.filter((p: { status: string }) => p.status === 'archived'),
  }

  return (
    <div className="relative min-h-full">
      <div className="orb-cyan" style={{ top: '-100px', right: '-100px' }} />
      <div className="orb-purple" style={{ bottom: '-150px', left: '-100px' }} />

      <div className="relative z-10 p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-widest uppercase font-terminal glow-text" style={{ color: '#f1f5f9', letterSpacing: '0.2em' }}>
              Projecten
            </h1>
            <p className="font-terminal text-xs tracking-wider mt-1" style={{ color: '#334155' }}>
              {projects.length} projecten totaal
            </p>
          </div>
          <NewProjectButton />
        </div>

        {/* Summary pills */}
        <div className="flex gap-3 flex-wrap">
          {(Object.entries(byStatus) as [string, typeof projects][]).map(([status, items]) => {
            const cfg = statusConfig[status as keyof typeof statusConfig]
            if (items.length === 0) return null
            return (
              <div
                key={status}
                className="px-3 py-1.5 rounded-full font-terminal text-xs flex items-center gap-2"
                style={{ background: `${cfg.color}12`, border: `1px solid ${cfg.color}30`, color: cfg.color }}
              >
                <cfg.icon size={11} />
                {items.length} {cfg.label}
              </div>
            )
          })}
        </div>

        {/* Project grid per status */}
        {(Object.entries(byStatus) as [string, typeof projects][]).map(([status, items]) => {
          if (items.length === 0) return null
          const cfg = statusConfig[status as keyof typeof statusConfig]
          return (
            <div key={status} className="space-y-3">
              <h2 className="hud-label flex items-center gap-2">
                <cfg.icon size={11} style={{ color: cfg.color }} />
                {cfg.label}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {items.map((project: {
                  id: string; color: string; name: string
                  description: string | null; status: string
                  linear_project_id: string | null; updated_at: string
                }) => (
                  <div
                    key={project.id}
                    className="hud-card p-4 transition-all"
                    style={{ background: 'rgba(0,212,255,0.02)' }}
                  >
                    <div className="hud-corners-bottom" />

                    {/* Color bar */}
                    <div
                      className="w-full h-0.5 rounded-full mb-4"
                      style={{ background: `linear-gradient(90deg, ${project.color}, transparent)` }}
                    />

                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ background: project.color, boxShadow: `0 0 6px ${project.color}80` }}
                        />
                        <h3 className="font-terminal text-sm font-semibold leading-snug" style={{ color: '#f1f5f9' }}>
                          {project.name}
                        </h3>
                      </div>
                      <span
                        className="font-terminal text-xs px-2 py-0.5 rounded shrink-0"
                        style={{ background: `${cfg.color}12`, color: cfg.color, border: `1px solid ${cfg.color}25`, fontSize: '10px' }}
                      >
                        {cfg.label}
                      </span>
                    </div>

                    {project.description && (
                      <p className="font-terminal text-xs leading-relaxed mb-3" style={{ color: '#64748b' }}>
                        {project.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between font-terminal text-xs" style={{ color: '#334155' }}>
                      <span>Bijgewerkt {format(new Date(project.updated_at), 'd MMM', { locale: nl })}</span>
                      {project.linear_project_id && (
                        <span
                          className="px-1.5 py-0.5 rounded"
                          style={{ background: 'rgba(0,212,255,0.08)', color: '#00d4ff', border: '1px solid rgba(0,212,255,0.2)', fontSize: '10px' }}
                        >
                          Linear
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        {projects.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20" style={{ color: '#334155' }}>
            <FolderKanban size={32} className="mb-3 opacity-30" />
            <p className="font-terminal text-sm">Nog geen projecten aangemaakt</p>
          </div>
        )}
      </div>
    </div>
  )
}
