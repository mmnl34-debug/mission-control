export const dynamic = 'force-dynamic'

import { FolderKanban, Circle, CheckCircle2, PauseCircle, Archive } from 'lucide-react'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale'

const SB_URL = 'https://logkkueavewqmaquuwfw.supabase.co'
const SB_KEY = 'sb_publishable_nqPICLQDoaXGb8hshPIYYg_uv9GRuid'
const SB_HEADERS = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` }

async function getData() {
  const res = await fetch(`${SB_URL}/rest/v1/projects?select=*&order=updated_at.desc`, { headers: SB_HEADERS, cache: 'no-store' })
  if (!res.ok) return []
  return res.json()
}

const statusConfig = {
  active: { label: 'Actief', color: '#10b981', icon: Circle },
  paused: { label: 'Gepauzeerd', color: '#f59e0b', icon: PauseCircle },
  completed: { label: 'Afgerond', color: '#6366f1', icon: CheckCircle2 },
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
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Projecten</h1>
          <p className="text-sm mt-0.5" style={{ color: '#94a3b8' }}>{projects.length} projecten totaal</p>
        </div>
      </div>

      {/* Summary pills */}
      <div className="flex gap-3 flex-wrap">
        {(Object.entries(byStatus) as [string, typeof projects][]).map(([status, items]) => {
          const cfg = statusConfig[status as keyof typeof statusConfig]
          if (items.length === 0) return null
          return (
            <div key={status} className="px-3 py-1.5 rounded-full text-xs flex items-center gap-2" style={{ background: `${cfg.color}15`, border: `1px solid ${cfg.color}30`, color: cfg.color }}>
              <cfg.icon size={11} />
              {items.length} {cfg.label}
            </div>
          )
        })}
      </div>

      {/* Project grid */}
      {(Object.entries(byStatus) as [string, typeof projects][]).map(([status, items]) => {
        if (items.length === 0) return null
        const cfg = statusConfig[status as keyof typeof statusConfig]
        return (
          <div key={status} className="space-y-3">
            <h2 className="text-xs font-medium uppercase tracking-wider flex items-center gap-2" style={{ color: '#475569' }}>
              <cfg.icon size={11} style={{ color: cfg.color }} />
              {cfg.label}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {items.map((project: { id: string; color: string; name: string; description: string | null; status: string; linear_project_id: string | null; updated_at: string }) => (
                <div key={project.id} className="rounded-xl p-4 hover:border-indigo-500/30 transition-colors" style={{ background: '#1a1a26', border: '1px solid #2a2a3d' }}>
                  {/* Color bar */}
                  <div className="w-full h-1 rounded-full mb-4" style={{ background: project.color }} />

                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-sm font-semibold text-white leading-snug">{project.name}</h3>
                    <span className="text-xs px-2 py-0.5 rounded shrink-0" style={{ background: `${cfg.color}15`, color: cfg.color }}>
                      {cfg.label}
                    </span>
                  </div>

                  {project.description && (
                    <p className="text-xs leading-relaxed mb-3" style={{ color: '#94a3b8' }}>{project.description}</p>
                  )}

                  <div className="flex items-center justify-between text-xs" style={{ color: '#475569' }}>
                    <span>Bijgewerkt {format(new Date(project.updated_at), 'd MMM', { locale: nl })}</span>
                    {project.linear_project_id && (
                      <span className="px-1.5 py-0.5 rounded" style={{ background: '#1f1f2e', color: '#6366f1' }}>Linear</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {projects.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20" style={{ color: '#475569' }}>
          <FolderKanban size={32} className="mb-3 opacity-30" />
          <p className="text-sm">Nog geen projecten aangemaakt</p>
        </div>
      )}
    </div>
  )
}
