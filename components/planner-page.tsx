'use client'

import { useMemo, useState } from 'react'
import { CalendarDays, Plus, X, Check, Clock, Trash2, Folder, Undo2 } from 'lucide-react'
import { format, isToday, isTomorrow, isPast, isThisWeek, parseISO } from 'date-fns'
import { nl } from 'date-fns/locale'
import type { PlannerEvent } from '@/lib/supabase'

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SB_HEADERS = {
  apikey: SB_KEY,
  Authorization: `Bearer ${SB_KEY}`,
  'Content-Type': 'application/json',
}

interface Props {
  initialEvents: PlannerEvent[]
  projects: string[]
}

function dateLabel(iso: string): string {
  const d = parseISO(iso)
  if (isToday(d)) return 'Vandaag'
  if (isTomorrow(d)) return 'Morgen'
  if (isThisWeek(d, { weekStartsOn: 1 })) return format(d, 'EEEE', { locale: nl })
  return format(d, 'EEE d MMM', { locale: nl })
}

export function PlannerPage({ initialEvents, projects }: Props) {
  const [events, setEvents] = useState<PlannerEvent[]>(initialEvents)
  const [creating, setCreating] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [time, setTime] = useState('')
  const [project, setProject] = useState('')

  const groups = useMemo(() => {
    const overdue: PlannerEvent[] = []
    const upcoming: PlannerEvent[] = []
    const done: PlannerEvent[] = []

    for (const ev of events) {
      if (ev.status === 'done') { done.push(ev); continue }
      if (ev.status === 'cancelled') continue
      const evDate = parseISO(ev.event_date)
      const isOverdue = isPast(evDate) && !isToday(evDate)
      if (isOverdue) overdue.push(ev)
      else upcoming.push(ev)
    }
    return { overdue, upcoming, done }
  }, [events])

  const byDate = useMemo(() => {
    const map = new Map<string, PlannerEvent[]>()
    for (const ev of groups.upcoming) {
      const arr = map.get(ev.event_date) ?? []
      arr.push(ev)
      map.set(ev.event_date, arr)
    }
    return Array.from(map.entries())
  }, [groups.upcoming])

  async function createEvent() {
    if (!title.trim() || !date) return
    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      event_date: date,
      event_time: time || null,
      project: project || null,
      source: 'manual',
    }
    const res = await fetch(`${SB_URL}/rest/v1/planner_events`, {
      method: 'POST',
      headers: { ...SB_HEADERS, Prefer: 'return=representation' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) return
    const [created] = await res.json()
    setEvents([...events, created].sort((a, b) => {
      if (a.event_date !== b.event_date) return a.event_date.localeCompare(b.event_date)
      return (a.event_time ?? '99:99').localeCompare(b.event_time ?? '99:99')
    }))
    setTitle(''); setDescription(''); setTime(''); setProject(''); setCreating(false)
  }

  async function toggleDone(ev: PlannerEvent) {
    const next = ev.status === 'done' ? 'planned' : 'done'
    const res = await fetch(`${SB_URL}/rest/v1/planner_events?id=eq.${ev.id}`, {
      method: 'PATCH',
      headers: { ...SB_HEADERS, Prefer: 'return=minimal' },
      body: JSON.stringify({ status: next }),
    })
    if (!res.ok) return
    setEvents(events.map(e => e.id === ev.id ? { ...e, status: next } : e))
  }

  async function deleteEvent(id: string) {
    if (!confirm('Event verwijderen?')) return
    const res = await fetch(`${SB_URL}/rest/v1/planner_events?id=eq.${id}`, {
      method: 'DELETE',
      headers: SB_HEADERS,
    })
    if (!res.ok) return
    setEvents(events.filter(e => e.id !== id))
  }

  function renderEvent(ev: PlannerEvent, opts: { dim?: boolean } = {}) {
    const done = ev.status === 'done'
    return (
      <div
        key={ev.id}
        className="flex items-start gap-3 p-3 rounded-lg transition-all"
        style={{
          background: done ? 'rgba(16,185,129,0.04)' : 'rgba(0,212,255,0.02)',
          border: done ? '1px solid rgba(16,185,129,0.2)' : '1px solid rgba(0,212,255,0.1)',
          opacity: opts.dim ? 0.55 : 1,
        }}
      >
        <button
          onClick={() => toggleDone(ev)}
          aria-label={done ? 'Heropen' : 'Markeer klaar'}
          style={{
            width: 20, height: 20, borderRadius: 5, flexShrink: 0,
            marginTop: 2,
            background: done ? 'rgba(16,185,129,0.2)' : 'rgba(0,212,255,0.04)',
            border: `1px solid ${done ? 'rgba(16,185,129,0.5)' : 'rgba(0,212,255,0.25)'}`,
            color: done ? '#10b981' : '#64748b',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {done ? <Check size={12} /> : null}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="font-terminal text-sm"
              style={{
                color: done ? '#64748b' : '#f1f5f9',
                textDecoration: done ? 'line-through' : 'none',
              }}
            >
              {ev.title}
            </span>
            {ev.event_time && (
              <span className="font-terminal flex items-center gap-1" style={{ fontSize: 10, color: '#00d4ff' }}>
                <Clock size={9} />
                {ev.event_time.slice(0, 5)}
              </span>
            )}
            {ev.project && (
              <span className="font-terminal flex items-center gap-1" style={{ fontSize: 10, color: '#94a3b8' }}>
                <Folder size={9} />
                {ev.project}
              </span>
            )}
            {ev.source && ev.source !== 'manual' && (
              <span
                className="font-terminal px-1.5 rounded"
                style={{
                  fontSize: 9,
                  background: 'rgba(245,158,11,0.1)', color: '#f59e0b',
                  border: '1px solid rgba(245,158,11,0.2)',
                  letterSpacing: '0.06em',
                }}
              >
                uit: {ev.source}
              </span>
            )}
          </div>
          {ev.description && (
            <p className="font-terminal text-xs mt-1" style={{ color: '#64748b', lineHeight: 1.5 }}>
              {ev.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {done && (
            <button
              onClick={() => toggleDone(ev)}
              title="Heropen"
              style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 2 }}
            >
              <Undo2 size={12} />
            </button>
          )}
          <button
            onClick={() => deleteEvent(ev.id)}
            title="Verwijder"
            style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 2 }}
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-full">
      <div className="orb-purple" style={{ top: '-100px', left: '-100px' }} />

      <div className="relative z-10 p-6 space-y-5">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-widest uppercase font-terminal glow-text" style={{ color: '#f1f5f9', letterSpacing: '0.2em' }}>
              Planner
            </h1>
            <p className="font-terminal text-xs tracking-wider mt-1" style={{ color: '#334155' }}>
              {groups.upcoming.length} gepland · {groups.overdue.length} te laat · {groups.done.length} klaar
            </p>
          </div>
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg font-terminal text-xs"
            style={{
              background: 'rgba(0,212,255,0.08)',
              border: '1px solid rgba(0,212,255,0.25)',
              color: '#00d4ff',
              cursor: 'pointer',
            }}
          >
            <Plus size={12} />
            Nieuw event
          </button>
        </div>

        {/* Create form */}
        {creating && (
          <div className="hud-card p-4 space-y-3">
            <div className="hud-corners-bottom" />
            <div className="flex items-center justify-between">
              <span className="hud-label">Nieuw event</span>
              <button
                onClick={() => { setCreating(false); setTitle(''); setDescription(''); setTime(''); setProject('') }}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                <X size={14} />
              </button>
            </div>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Wat staat er gepland?"
              className="w-full font-terminal text-sm"
              style={{
                background: 'rgba(0,212,255,0.03)',
                border: '1px solid rgba(0,212,255,0.12)',
                borderRadius: 6, padding: '8px 10px', color: '#f1f5f9', outline: 'none',
              }}
            />
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Beschrijving (optioneel)"
              rows={2}
              className="w-full font-terminal text-xs"
              style={{
                background: 'rgba(0,212,255,0.03)',
                border: '1px solid rgba(0,212,255,0.12)',
                borderRadius: 6, padding: '8px 10px', color: '#cbd5e1', outline: 'none',
                resize: 'vertical',
              }}
            />
            <div className="flex gap-2 flex-wrap items-center">
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="font-terminal text-xs"
                style={{
                  background: 'rgba(0,212,255,0.03)',
                  border: '1px solid rgba(0,212,255,0.12)',
                  borderRadius: 6, padding: '6px 8px', color: '#94a3b8', outline: 'none',
                  colorScheme: 'dark',
                }}
              />
              <input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                className="font-terminal text-xs"
                style={{
                  background: 'rgba(0,212,255,0.03)',
                  border: '1px solid rgba(0,212,255,0.12)',
                  borderRadius: 6, padding: '6px 8px', color: '#94a3b8', outline: 'none',
                  colorScheme: 'dark',
                }}
              />
              <select
                value={project}
                onChange={e => setProject(e.target.value)}
                className="font-terminal text-xs"
                style={{
                  background: 'rgba(0,212,255,0.03)',
                  border: '1px solid rgba(0,212,255,0.12)',
                  borderRadius: 6, padding: '6px 8px', color: '#94a3b8', outline: 'none',
                }}
              >
                <option value="">Geen project</option>
                {projects.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <div style={{ flex: 1 }} />
              <button
                onClick={createEvent}
                disabled={!title.trim() || !date}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md font-terminal text-xs"
                style={{
                  background: (title.trim() && date) ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.05)',
                  border: '1px solid rgba(16,185,129,0.3)',
                  color: (title.trim() && date) ? '#10b981' : '#475569',
                  cursor: (title.trim() && date) ? 'pointer' : 'not-allowed',
                }}
              >
                <Check size={12} />
                Inplannen
              </button>
            </div>
          </div>
        )}

        {/* Overdue */}
        {groups.overdue.length > 0 && (
          <div className="space-y-2">
            <h2 className="hud-label flex items-center gap-2" style={{ color: '#ef4444' }}>
              <Clock size={11} />
              Te laat · {groups.overdue.length}
            </h2>
            <div className="space-y-2">
              {groups.overdue.map(ev => renderEvent(ev))}
            </div>
          </div>
        )}

        {/* Upcoming, grouped per datum */}
        {byDate.map(([dateStr, evs]) => (
          <div key={dateStr} className="space-y-2">
            <h2 className="hud-label flex items-center gap-2">
              <CalendarDays size={11} style={{ color: '#00d4ff' }} />
              {dateLabel(dateStr)}
              <span className="font-terminal" style={{ fontSize: 10, color: '#334155', marginLeft: 'auto' }}>
                {format(parseISO(dateStr), 'd MMM yyyy', { locale: nl })}
              </span>
            </h2>
            <div className="space-y-2">
              {evs.map(ev => renderEvent(ev))}
            </div>
          </div>
        ))}

        {/* Done (collapsed feel) */}
        {groups.done.length > 0 && (
          <div className="space-y-2">
            <h2 className="hud-label flex items-center gap-2" style={{ color: '#10b981' }}>
              <Check size={11} />
              Klaar · {groups.done.length}
            </h2>
            <div className="space-y-2">
              {groups.done.slice(0, 10).map(ev => renderEvent(ev, { dim: true }))}
            </div>
          </div>
        )}

        {events.length === 0 && !creating && (
          <div className="flex flex-col items-center justify-center py-20" style={{ color: '#334155' }}>
            <CalendarDays size={32} className="mb-3 opacity-30" />
            <p className="font-terminal text-sm">Nog niks gepland</p>
          </div>
        )}
      </div>
    </div>
  )
}
