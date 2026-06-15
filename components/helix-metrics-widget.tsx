import { ArrowUpRight, Users, TrendingUp, CheckCircle } from 'lucide-react'
import Link from 'next/link'

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

type ContactTask = { id: string; title: string; status: string; created_at: string }

async function getHelixContacts(): Promise<ContactTask[]> {
  try {
    const r = await fetch(
      `${SB_URL}/rest/v1/tasks?project=eq.Helix%20Studio%20Contact&select=id,title,status,created_at&order=created_at.desc`,
      { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` }, cache: 'no-store' }
    )
    if (!r.ok) return []
    return r.json()
  } catch {
    return []
  }
}

export async function HelixMetricsWidget() {
  const contacts = await getHelixContacts()

  const leads     = contacts.filter(c => c.status === 'todo').length
  const prospect  = contacts.filter(c => c.status === 'in_progress').length
  const klanten   = contacts.filter(c => c.status === 'done').length
  const total     = contacts.length

  // Conversion rate: (done / total) * 100
  const convRate  = total > 0 ? Math.round((klanten / total) * 100) : 0

  // Last 30 days
  const since30 = new Date(Date.now() - 30 * 86400000).toISOString()
  const recent30 = contacts.filter(c => c.created_at >= since30).length

  const stages = [
    { label: 'Leads',    value: leads,    color: '#3b82f6' },
    { label: 'Prospect', value: prospect, color: '#f59e0b' },
    { label: 'Klant',    value: klanten,  color: '#10b981' },
  ]

  return (
    <div className="hud-card flex flex-col">
      <div className="hud-corners-bottom" />

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: '1px solid rgba(0,212,255,0.08)' }}>
        <div className="flex items-center gap-2">
          <span className="hud-label">Helix Studio</span>
          {recent30 > 0 && (
            <span className="font-terminal px-1.5 py-0.5 rounded" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', fontSize: 9, border: '1px solid rgba(245,158,11,0.2)' }}>
              +{recent30} deze maand
            </span>
          )}
        </div>
        <Link href="/helix" className="flex items-center gap-1 font-terminal text-xs" style={{ color: '#475569' }}>
          Pipeline <ArrowUpRight size={11} />
        </Link>
      </div>

      {/* Pipeline stats */}
      <div className="grid grid-cols-3 gap-0 px-3 pt-3 pb-2">
        {stages.map(s => (
          <div key={s.label} className="text-center">
            <div className="font-terminal font-bold" style={{ color: s.color, fontSize: 22, lineHeight: 1 }}>{s.value}</div>
            <div className="font-terminal mt-0.5" style={{ fontSize: 9, color: '#475569' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Conversion bar */}
      {total > 0 && (
        <div className="px-3 pb-2">
          <div className="flex items-center justify-between mb-1">
            <span className="font-terminal" style={{ fontSize: 9, color: '#475569' }}>Conversie</span>
            <span className="font-terminal font-bold" style={{ fontSize: 10, color: '#10b981' }}>{convRate}%</span>
          </div>
          <div className="w-full h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${convRate}%`, background: 'linear-gradient(90deg, #3b82f6, #10b981)', boxShadow: convRate > 0 ? '0 0 6px rgba(16,185,129,0.4)' : 'none' }}
            />
          </div>
        </div>
      )}

      {/* Recent contacts */}
      {contacts.length > 0 ? (
        <div className="px-3 pb-3 space-y-1.5 flex-1">
          {contacts.slice(0, 3).map(c => {
            const color = c.status === 'done' ? '#10b981' : c.status === 'in_progress' ? '#f59e0b' : '#3b82f6'
            const label = c.status === 'done' ? 'Klant' : c.status === 'in_progress' ? 'Prospect' : 'Lead'
            return (
              <div key={c.id} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
                <span className="font-terminal text-xs flex-1 truncate" style={{ color: '#94a3b8' }}>{c.title}</span>
                <span className="font-terminal shrink-0" style={{ fontSize: 8, color, border: `1px solid ${color}30`, background: `${color}10`, padding: '1px 4px', borderRadius: 3 }}>{label}</span>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center py-5 gap-2">
          <Users size={18} style={{ color: '#1e293b' }} />
          <span className="font-terminal text-xs" style={{ color: '#334155' }}>Nog geen contacten</span>
          <a href="https://helix-studio-pi.vercel.app/contact" target="_blank" rel="noopener noreferrer" className="font-terminal" style={{ fontSize: 10, color: '#f59e0b' }}>
            → Helix Studio website
          </a>
        </div>
      )}

      {/* Footer: Vercel link */}
      <div className="px-3 py-2 flex items-center gap-2" style={{ borderTop: '1px solid rgba(0,212,255,0.06)' }}>
        <TrendingUp size={10} style={{ color: '#334155' }} />
        <a
          href="https://vercel.com/mmnl34-2202s-projects/helix-studio/analytics"
          target="_blank"
          rel="noopener noreferrer"
          className="font-terminal"
          style={{ fontSize: 9, color: '#334155', textDecoration: 'none' }}
        >
          Vercel Analytics →
        </a>
        {klanten > 0 && (
          <div className="ml-auto flex items-center gap-1">
            <CheckCircle size={9} style={{ color: '#10b981' }} />
            <span className="font-terminal" style={{ fontSize: 9, color: '#10b981' }}>{klanten} klant{klanten !== 1 ? 'en' : ''}</span>
          </div>
        )}
      </div>
    </div>
  )
}
