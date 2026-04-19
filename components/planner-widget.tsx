'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight, CalendarDays, Clock } from 'lucide-react'
import { format, isToday, isTomorrow, isPast, isThisWeek, parseISO } from 'date-fns'
import { nl } from 'date-fns/locale'
import { supabase, type PlannerEvent } from '@/lib/supabase'

type Props = { initialEvents: PlannerEvent[] }

function dateLabel(iso: string): string {
  const d = parseISO(iso)
  if (isToday(d)) return 'Vandaag'
  if (isTomorrow(d)) return 'Morgen'
  if (isThisWeek(d, { weekStartsOn: 1 })) return format(d, 'EEEE', { locale: nl })
  return format(d, 'EEE d MMM', { locale: nl })
}

export function PlannerWidget({ initialEvents }: Props) {
  const [events, setEvents] = useState<PlannerEvent[]>(initialEvents)

  useEffect(() => {
    const channel = supabase
      .channel('planner-widget')
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

  const now = new Date()
  const active = events.filter(e => e.status !== 'done' && e.status !== 'cancelled')
  const overdue = active.filter(e => {
    const d = parseISO(e.event_date)
    return isPast(d) && !isToday(d)
  })
  const upcoming = active
    .filter(e => {
      const d = parseISO(e.event_date)
      return isToday(d) || !isPast(d)
    })
    .sort((a, b) => {
      if (a.event_date !== b.event_date) return a.event_date.localeCompare(b.event_date)
      return (a.event_time ?? '99:99').localeCompare(b.event_time ?? '99:99')
    })
    .slice(0, 4)

  const badge = overdue.length > 0
    ? { text: `${overdue.length} te laat`, bg: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'rgba(239,68,68,0.2)' }
    : upcoming.length > 0
      ? { text: `${active.length} gepland`, bg: 'rgba(0,212,255,0.1)', color: '#00d4ff', border: 'rgba(0,212,255,0.2)' }
      : { text: 'leeg', bg: 'rgba(71,85,105,0.1)', color: '#64748b', border: 'rgba(71,85,105,0.2)' }

  // Use now only to silence lint; render items don't need it
  void now

  return (
    <div className="hud-card">
      <div className="hud-corners-bottom" />
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{ borderBottom: '1px solid rgba(0,212,255,0.08)' }}
      >
        <div className="flex items-center gap-2">
          <span className="hud-label">Planner</span>
          <span
            className="font-terminal text-xs px-1.5 py-0.5 rounded"
            style={{
              background: badge.bg,
              color: badge.color,
              fontSize: '10px',
              border: `1px solid ${badge.border}`,
            }}
          >
            {badge.text}
          </span>
        </div>
        <Link
          href="/planner"
          className="flex items-center gap-1 font-terminal text-xs transition-colors"
          style={{ color: '#475569' }}
        >
          View all <ArrowUpRight size={11} />
        </Link>
      </div>
      <div className="p-3 space-y-2">
        {upcoming.length > 0 ? upcoming.map(ev => (
          <Link
            key={ev.id}
            href="/planner"
            className="flex items-start gap-2 py-1.5"
            style={{ textDecoration: 'none' }}
          >
            <div
              className="flex items-center justify-center rounded shrink-0"
              style={{
                width: 32,
                height: 32,
                background: 'rgba(0,212,255,0.05)',
                border: '1px solid rgba(0,212,255,0.15)',
                color: '#00d4ff',
              }}
            >
              <CalendarDays size={13} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-terminal text-xs truncate" style={{ color: '#cbd5e1' }}>
                {ev.title}
              </p>
              <div className="flex items-center gap-2">
                <span className="font-terminal" style={{ color: '#00d4ff', fontSize: '10px' }}>
                  {dateLabel(ev.event_date)}
                </span>
                {ev.event_time && (
                  <span className="font-terminal flex items-center gap-0.5" style={{ color: '#334155', fontSize: '10px' }}>
                    <Clock size={8} />
                    {ev.event_time.slice(0, 5)}
                  </span>
                )}
                {ev.project && (
                  <span className="font-terminal" style={{ color: '#334155', fontSize: '10px' }}>
                    · {ev.project}
                  </span>
                )}
              </div>
            </div>
          </Link>
        )) : (
          <div className="flex items-center justify-center py-4">
            <CalendarDays size={14} style={{ color: '#334155' }} />
            <span className="font-terminal text-xs ml-2" style={{ color: '#334155' }}>Niks gepland</span>
          </div>
        )}
      </div>
    </div>
  )
}
