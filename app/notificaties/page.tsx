export const dynamic = 'force-dynamic'

import { Bell, StickyNote, ListTodo, Calendar, AlertTriangle, CheckCircle2, Clock } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { nl } from 'date-fns/locale'
import type { Note, Task, PlannerEvent, AlertRule } from '@/lib/supabase'

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const H = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` }

async function sb(path: string) {
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, { headers: H, cache: 'no-store' })
  if (!r.ok) return []
  return r.json()
}

export default async function NotificatiesPage() {
  const today = new Date().toISOString().slice(0, 10)
  const in7   = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)

  const [notes, tasks, events, alerts] = await Promise.all([
    sb('notes?processed=eq.false&select=*&order=created_at.desc'),
    sb('tasks?status=eq.todo&select=*&order=priority.asc&limit=10'),
    sb(`planner_events?status=eq.planned&event_date=gte.${today}&event_date=lte.${in7}&select=*&order=event_date.asc,event_time.asc`),
    sb('alert_rules?enabled=eq.true&select=*&order=last_fired_at.desc.nullslast'),
  ]) as [Note[], Task[], PlannerEvent[], AlertRule[]]

  const total = notes.length + tasks.length + events.length + alerts.length

  type Item =
    | { kind: 'note';  data: Note }
    | { kind: 'task';  data: Task }
    | { kind: 'event'; data: PlannerEvent }
    | { kind: 'alert'; data: AlertRule }

  const PRIO_COLOR: Record<number, string> = { 1: '#ef4444', 2: '#f59e0b', 3: '#10b981' }

  function Section({ icon: Icon, label, color, count, children }: {
    icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>
    label: string; color: string; count: number; children: React.ReactNode
  }) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Icon size={13} style={{ color }} />
          <h2 className="font-terminal text-xs uppercase tracking-widest" style={{ color }}>{label}</h2>
          <span className="font-terminal text-xs px-1.5 py-0.5 rounded" style={{ background: `${color}15`, color, fontSize: 9 }}>{count}</span>
        </div>
        <div className="space-y-2">{children}</div>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold font-terminal glow-text" style={{ color: '#f1f5f9' }}>Notificaties</h1>
          <p className="font-terminal text-xs mt-1" style={{ color: '#475569' }}>
            {total === 0 ? 'Alles bijgewerkt' : `${total} item${total !== 1 ? 's' : ''} die aandacht vragen`}
          </p>
        </div>
        {total === 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
            <CheckCircle2 size={13} style={{ color: '#10b981' }} />
            <span className="font-terminal text-xs" style={{ color: '#10b981' }}>Inbox zero</span>
          </div>
        )}
      </div>

      {/* Onverwerkte notities */}
      {notes.length > 0 && (
        <Section icon={StickyNote} label="Onverwerkte notities" color="#f59e0b" count={notes.length}>
          {notes.map(n => (
            <Link key={n.id} href="/notes" className="block">
              <div className="hud-card px-4 py-3 flex items-start gap-3" style={{ borderLeft: '3px solid rgba(245,158,11,0.3)' }}>
                <StickyNote size={12} className="shrink-0 mt-0.5" style={{ color: '#f59e0b' }} />
                <div className="flex-1 min-w-0">
                  <p className="font-terminal text-xs font-bold truncate" style={{ color: '#f1f5f9' }}>{n.title ?? 'Notitie'}</p>
                  <p className="font-terminal text-xs truncate mt-0.5" style={{ color: '#64748b' }}>{n.content.slice(0, 80)}</p>
                </div>
                <span className="font-terminal shrink-0" style={{ fontSize: 10, color: '#334155' }}>
                  {formatDistanceToNow(new Date(n.created_at), { locale: nl, addSuffix: true })}
                </span>
              </div>
            </Link>
          ))}
        </Section>
      )}

      {/* Open taken */}
      {tasks.length > 0 && (
        <Section icon={ListTodo} label="Open taken (hoog/midden prioriteit)" color="#00d4ff" count={tasks.length}>
          {tasks.filter(t => t.priority <= 2).slice(0, 6).map(t => (
            <Link key={t.id} href="/tasks" className="block">
              <div className="hud-card px-4 py-3 flex items-center gap-3" style={{ borderLeft: '3px solid rgba(0,212,255,0.2)' }}>
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: PRIO_COLOR[t.priority] ?? '#475569' }} />
                <span className="font-terminal text-xs flex-1 truncate" style={{ color: '#cbd5e1' }}>{t.title}</span>
                {t.project && (
                  <span className="font-terminal shrink-0" style={{ fontSize: 9, color: '#334155' }}>{t.project}</span>
                )}
              </div>
            </Link>
          ))}
          {tasks.filter(t => t.priority <= 2).length === 0 && (
            <p className="font-terminal text-xs" style={{ color: '#334155' }}>Alleen lage-prioriteit taken open</p>
          )}
        </Section>
      )}

      {/* Komende afspraken */}
      {events.length > 0 && (
        <Section icon={Calendar} label="Komende afspraken (7 dagen)" color="#10b981" count={events.length}>
          {events.map(e => {
            const isToday = e.event_date === today
            return (
              <Link key={e.id} href="/agenda" className="block">
                <div className="hud-card px-4 py-3 flex items-center gap-3" style={{ borderLeft: `3px solid ${isToday ? 'rgba(16,185,129,0.5)' : 'rgba(16,185,129,0.15)'}` }}>
                  <div className="shrink-0 text-center" style={{ minWidth: 36 }}>
                    <div className="font-terminal font-bold" style={{ fontSize: 14, color: isToday ? '#10b981' : '#f1f5f9', lineHeight: 1 }}>
                      {new Date(e.event_date).getDate()}
                    </div>
                    <div className="font-terminal" style={{ fontSize: 9, color: '#475569' }}>
                      {new Date(e.event_date).toLocaleDateString('nl-NL', { month: 'short' })}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-terminal text-xs font-bold truncate" style={{ color: '#f1f5f9' }}>{e.title}</p>
                    {e.event_time && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <Clock size={9} style={{ color: '#475569' }} />
                        <span className="font-terminal" style={{ fontSize: 10, color: '#475569' }}>{e.event_time.slice(0, 5)}</span>
                      </div>
                    )}
                  </div>
                  {isToday && (
                    <span className="font-terminal shrink-0 px-1.5 py-0.5 rounded text-xs" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981', fontSize: 9 }}>
                      VANDAAG
                    </span>
                  )}
                </div>
              </Link>
            )
          })}
        </Section>
      )}

      {/* Alert rules status */}
      {alerts.length > 0 && (
        <Section icon={AlertTriangle} label="Actieve alertregels" color="#ef4444" count={alerts.length}>
          {alerts.map(a => (
            <Link key={a.id} href="/alerts" className="block">
              <div className="hud-card px-4 py-3 flex items-center gap-3" style={{ borderLeft: '3px solid rgba(239,68,68,0.15)' }}>
                <AlertTriangle size={12} className="shrink-0" style={{ color: a.last_fired_at ? '#ef4444' : '#475569' }} />
                <div className="flex-1 min-w-0">
                  <p className="font-terminal text-xs font-bold" style={{ color: '#f1f5f9' }}>{a.name}</p>
                  {a.last_message && (
                    <p className="font-terminal text-xs truncate mt-0.5" style={{ color: '#64748b' }}>{a.last_message}</p>
                  )}
                </div>
                {a.last_fired_at ? (
                  <span className="font-terminal shrink-0" style={{ fontSize: 10, color: '#ef4444' }}>
                    {formatDistanceToNow(new Date(a.last_fired_at), { locale: nl, addSuffix: true })}
                  </span>
                ) : (
                  <span className="font-terminal shrink-0" style={{ fontSize: 10, color: '#334155' }}>nooit gevuurd</span>
                )}
              </div>
            </Link>
          ))}
        </Section>
      )}

      {/* Alles leeg */}
      {total === 0 && (
        <div className="hud-card p-12 text-center">
          <Bell size={32} className="mx-auto mb-4" style={{ color: '#1e293b' }} />
          <p className="font-terminal text-sm" style={{ color: '#334155' }}>Geen openstaande notificaties</p>
          <p className="font-terminal text-xs mt-1" style={{ color: '#1e293b' }}>Alles is bijgewerkt — goed gedaan.</p>
        </div>
      )}
    </div>
  )
}
