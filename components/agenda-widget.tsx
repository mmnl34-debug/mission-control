'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight, CalendarDays, Clock } from 'lucide-react'
import {
  format, isToday, isTomorrow, isPast, parseISO,
  startOfWeek, endOfWeek, eachDayOfInterval,
} from 'date-fns'
import { nl } from 'date-fns/locale'
import { supabase, type PlannerEvent, type AgendaCategory } from '@/lib/supabase'

const DEFAULT_CATEGORIES: AgendaCategory[] = [
  { id: 'klant',    name: 'Klant',             color: '#3b82f6', is_default: true, created_at: '' },
  { id: 'dokter',   name: 'Dokter/Ziekenhuis', color: '#ef4444', is_default: true, created_at: '' },
  { id: 'algemeen', name: 'Algemeen',          color: '#94a3b8', is_default: true, created_at: '' },
]

type Props = {
  initialEvents: PlannerEvent[]
  initialCategories: AgendaCategory[]
}

function categoryColor(name: string | null | undefined, cats: AgendaCategory[]): string {
  if (!name) return '#94a3b8'
  const hit = cats.find(c => c.name === name)
  return hit?.color ?? '#94a3b8'
}

export function AgendaWidget({ initialEvents, initialCategories }: Props) {
  const [events, setEvents] = useState<PlannerEvent[]>(initialEvents)

  const categories = initialCategories.length > 0 ? initialCategories : DEFAULT_CATEGORIES

  useEffect(() => {
    const channel = supabase
      .channel('agenda-widget')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'planner_events' }, payload => {
        if (payload.eventType === 'INSERT') {
          setEvents(prev => [...prev, payload.new as PlannerEvent])
        } else if (payload.eventType === 'UPDATE') {
          setEvents(prev => prev.map(e => e.id === (payload.new as PlannerEvent).id ? payload.new as PlannerEvent : e))
        } else if (payload.eventType === 'DELETE') {
          setEvents(prev => prev.filter(e => e.id !== (payload.old as { id: string }).id))
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const today = new Date()
  const weekStart = startOfWeek(today, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 })
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })

  const active = useMemo(
    () => events.filter(e => e.status !== 'done' && e.status !== 'cancelled'),
    [events],
  )

  const eventsByDay = useMemo(() => {
    const map = new Map<string, PlannerEvent[]>()
    for (const ev of active) {
      const arr = map.get(ev.event_date) ?? []
      arr.push(ev)
      map.set(ev.event_date, arr)
    }
    return map
  }, [active])

  const upcoming = useMemo(() => {
    return active
      .filter(e => {
        const d = parseISO(e.event_date)
        return isToday(d) || !isPast(d)
      })
      .sort((a, b) => {
        if (a.event_date !== b.event_date) return a.event_date.localeCompare(b.event_date)
        return (a.event_time ?? '99:99').localeCompare(b.event_time ?? '99:99')
      })
      .slice(0, 3)
  }, [active])

  return (
    <div className="hud-card">
      <div className="hud-corners-bottom" />
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{ borderBottom: '1px solid rgba(0,212,255,0.08)' }}
      >
        <div className="flex items-center gap-2">
          <span className="hud-label">Agenda</span>
          <span
            className="font-terminal text-xs px-1.5 py-0.5 rounded"
            style={{
              background: 'rgba(0,212,255,0.1)',
              color: '#00d4ff',
              fontSize: '10px',
              border: '1px solid rgba(0,212,255,0.2)',
            }}
          >
            {upcoming.length} komend
          </span>
        </div>
        <Link
          href="/agenda"
          className="flex items-center gap-1 font-terminal text-xs"
          style={{ color: '#475569' }}
        >
          View all <ArrowUpRight size={11} />
        </Link>
      </div>

      <div className="p-3 space-y-3">
        {/* Week-strip */}
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map(day => {
            const isoDay = format(day, 'yyyy-MM-dd')
            const dayEvents = eventsByDay.get(isoDay) ?? []
            const isCurrent = isToday(day)
            return (
              <Link
                key={isoDay}
                href="/agenda"
                className="flex flex-col items-center gap-1 py-1.5 rounded"
                style={{
                  background: isCurrent ? 'rgba(0,212,255,0.08)' : 'transparent',
                  border: isCurrent ? '1px solid rgba(0,212,255,0.4)' : '1px solid transparent',
                  textDecoration: 'none',
                }}
              >
                <span
                  className="font-terminal"
                  style={{
                    fontSize: 9,
                    color: isCurrent ? '#00d4ff' : '#475569',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                  }}
                >
                  {format(day, 'EEEEE', { locale: nl })}
                </span>
                <span
                  className="font-terminal"
                  style={{
                    fontSize: 13,
                    fontWeight: isCurrent ? 600 : 400,
                    color: isCurrent ? '#f1f5f9' : '#94a3b8',
                  }}
                >
                  {format(day, 'd')}
                </span>
                <div className="flex items-center gap-0.5 h-1.5">
                  {dayEvents.slice(0, 3).map((ev, i) => (
                    <span
                      key={ev.id + i}
                      style={{
                        width: 4, height: 4, borderRadius: '50%',
                        background: categoryColor(ev.category, categories),
                      }}
                    />
                  ))}
                  {dayEvents.length > 3 && (
                    <span className="font-terminal" style={{ fontSize: 8, color: '#475569', marginLeft: 1 }}>
                      ...
                    </span>
                  )}
                </div>
              </Link>
            )
          })}
        </div>

        {/* Komende events */}
        {upcoming.length > 0 ? (
          <div className="space-y-1.5 pt-2" style={{ borderTop: '1px solid rgba(0,212,255,0.06)' }}>
            {upcoming.map(ev => {
              const color = categoryColor(ev.category, categories)
              const evDate = parseISO(ev.event_date)
              const dayLabel = isToday(evDate)
                ? 'Vandaag'
                : isTomorrow(evDate)
                  ? 'Morgen'
                  : format(evDate, 'EEE d MMM', { locale: nl })
              return (
                <Link
                  key={ev.id}
                  href="/agenda"
                  className="flex items-start gap-2 py-1 px-2 rounded"
                  style={{
                    background: 'rgba(0,212,255,0.02)',
                    borderLeft: `2px solid ${color}`,
                    textDecoration: 'none',
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-terminal text-xs truncate" style={{ color: '#cbd5e1' }}>
                      {ev.title}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="font-terminal" style={{ color: '#00d4ff', fontSize: '10px' }}>
                        {dayLabel}
                      </span>
                      {ev.event_time && (
                        <span className="font-terminal flex items-center gap-0.5" style={{ color: '#334155', fontSize: '10px' }}>
                          <Clock size={8} />
                          {ev.event_time.slice(0, 5)}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="flex items-center justify-center py-3" style={{ borderTop: '1px solid rgba(0,212,255,0.06)' }}>
            <CalendarDays size={14} style={{ color: '#334155' }} />
            <span className="font-terminal text-xs ml-2" style={{ color: '#334155' }}>
              Geen komende afspraken
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
