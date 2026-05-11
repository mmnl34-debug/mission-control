'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { format, isTomorrow, parseISO } from 'date-fns'
import { nl } from 'date-fns/locale'
import {
  Clock, CheckSquare, StickyNote, Bot, Euro,
  Calendar, CalendarDays, ArrowUpRight, CheckCircle2, ChevronRight,
} from 'lucide-react'
import {
  type Task, type Note, type PlannerEvent,
  type AgendaCategory, type AgentSession, type CostRecord,
} from '@/lib/supabase'
import { fmtEur } from '@/lib/currency'

const DEFAULT_CATS: AgendaCategory[] = [
  { id: 'klant',    name: 'Klant',             color: '#3b82f6', is_default: true, created_at: '' },
  { id: 'dokter',   name: 'Dokter/Ziekenhuis', color: '#ef4444', is_default: true, created_at: '' },
  { id: 'algemeen', name: 'Algemeen',          color: '#94a3b8', is_default: true, created_at: '' },
]

function catColor(name: string | null | undefined, cats: AgendaCategory[]) {
  if (!name) return '#94a3b8'
  return cats.find(c => c.name === name)?.color ?? '#94a3b8'
}

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Goedemorgen'
  if (h < 18) return 'Goedemiddag'
  return 'Goedenavond'
}

function priorityColor(p: number): string {
  if (p === 1) return '#ef4444'
  if (p === 2) return '#f59e0b'
  if (p === 3) return '#3b82f6'
  return '#64748b'
}

function priorityLabel(p: number): string {
  if (p === 1) return 'KRITIEK'
  if (p === 2) return 'HOOG'
  if (p === 3) return 'NORMAAL'
  return 'LAAG'
}

type Props = {
  tasks: Task[]
  notes: Note[]
  events: PlannerEvent[]
  categories: AgendaCategory[]
  sessions: AgentSession[]
  costs: CostRecord[]
}

export function BriefingPage({ tasks, notes, events, categories, sessions, costs }: Props) {
  const [time, setTime] = useState('')

  useEffect(() => {
    const tick = () =>
      setTime(new Date().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }))
    tick()
    const id = setInterval(tick, 30000)
    return () => clearInterval(id)
  }, [])

  const cats = categories.length > 0 ? categories : DEFAULT_CATS
  const todayStr = new Date().toISOString().slice(0, 10)

  const todayEvents = useMemo(
    () =>
      events
        .filter(e => e.event_date === todayStr)
        .sort((a, b) => (a.event_time ?? '99:99').localeCompare(b.event_time ?? '99:99')),
    [events, todayStr],
  )

  const upcomingEvents = useMemo(
    () =>
      events
        .filter(e => e.event_date > todayStr)
        .sort((a, b) => {
          if (a.event_date !== b.event_date) return a.event_date.localeCompare(b.event_date)
          return (a.event_time ?? '99:99').localeCompare(b.event_time ?? '99:99')
        }),
    [events, todayStr],
  )

  const tasksByProject = useMemo(() => {
    const map = new Map<string, Task[]>()
    for (const t of tasks) {
      const proj = t.project ?? 'Overig'
      const arr = map.get(proj) ?? []
      arr.push(t)
      map.set(proj, arr)
    }
    return map
  }, [tasks])

  const activeSessions = sessions.filter(s => s.status === 'active')
  const todayCost = costs.reduce((s, c) => s + Number(c.cost_usd), 0)
  const inProgressCount = tasks.filter(t => t.status === 'in_progress').length

  return (
    <div className="relative min-h-full">
      <div className="orb-purple" style={{ top: '-200px', right: '-150px' }} />
      <div className="orb-cyan" style={{ bottom: '-150px', left: '-100px' }} />

      <div className="relative z-10 p-4 space-y-4 max-w-4xl mx-auto">

        {/* Header */}
        <div className="hud-card p-5" style={{ borderColor: 'rgba(0,212,255,0.15)' }}>
          <div className="hud-corners-bottom" />
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="mb-2">
                <span
                  className="font-terminal text-xs px-2 py-0.5 rounded tracking-widest uppercase"
                  style={{
                    background: 'rgba(0,212,255,0.08)',
                    color: '#00d4ff',
                    border: '1px solid rgba(0,212,255,0.2)',
                  }}
                >
                  Dagelijkse Briefing
                </span>
              </div>
              <h1 className="font-terminal text-2xl font-bold" style={{ color: '#f1f5f9', letterSpacing: '0.04em' }}>
                {greeting()}, Gertjan
              </h1>
              <p className="font-terminal text-sm mt-1 capitalize" style={{ color: '#475569' }}>
                {format(new Date(), 'EEEE d MMMM yyyy', { locale: nl })}
              </p>
            </div>
            <div className="text-right shrink-0">
              <div
                className="font-terminal text-3xl font-bold tabular-nums"
                style={{ color: '#00d4ff', letterSpacing: '0.05em' }}
              >
                {time || '--:--'}
              </div>
              <p className="font-terminal text-xs mt-1" style={{ color: '#334155' }}>
                {todayEvents.length > 0
                  ? `${todayEvents.length} afspraak${todayEvents.length > 1 ? 'en' : ''} vandaag`
                  : 'Vrij vandaag'}
              </p>
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
            {[
              { label: 'Open taken', value: tasks.length,        color: '#00d4ff' },
              { label: 'Bezig',      value: inProgressCount,     color: '#f59e0b' },
              { label: 'Notities',   value: notes.length,        color: '#a855f7' },
              { label: 'Agents',     value: activeSessions.length, color: '#10b981' },
            ].map(({ label, value, color }) => (
              <div
                key={label}
                className="text-center py-2.5 rounded-lg"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.04)',
                }}
              >
                <div className="font-terminal text-2xl font-bold" style={{ color }}>{value}</div>
                <div
                  className="font-terminal mt-0.5"
                  style={{ color: '#334155', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase' }}
                >
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Vandaag */}
        <div className="hud-card">
          <div className="hud-corners-bottom" />
          <div
            className="flex items-center justify-between px-4 py-2.5"
            style={{ borderBottom: '1px solid rgba(0,212,255,0.08)' }}
          >
            <div className="flex items-center gap-2">
              <Calendar size={13} style={{ color: '#00d4ff' }} />
              <span className="hud-label">Vandaag</span>
              {todayEvents.length > 0 && (
                <span
                  className="font-terminal text-xs px-1.5 py-0.5 rounded"
                  style={{
                    background: 'rgba(0,212,255,0.1)',
                    color: '#00d4ff',
                    fontSize: '10px',
                    border: '1px solid rgba(0,212,255,0.2)',
                  }}
                >
                  {todayEvents.length}
                </span>
              )}
            </div>
            <Link
              href="/agenda"
              className="flex items-center gap-1 font-terminal text-xs"
              style={{ color: '#475569' }}
            >
              Agenda <ArrowUpRight size={10} />
            </Link>
          </div>
          <div className="p-4">
            {todayEvents.length > 0 ? (
              <div className="space-y-2">
                {todayEvents.map(ev => {
                  const color = catColor(ev.category, cats)
                  return (
                    <div
                      key={ev.id}
                      className="flex items-start gap-3 py-2.5 px-3 rounded-lg"
                      style={{ background: 'rgba(0,212,255,0.03)', borderLeft: `3px solid ${color}` }}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-terminal text-sm" style={{ color: '#f1f5f9' }}>{ev.title}</p>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          {ev.event_time && (
                            <span
                              className="font-terminal flex items-center gap-1"
                              style={{ color: '#00d4ff', fontSize: '11px' }}
                            >
                              <Clock size={9} /> {ev.event_time.slice(0, 5)}
                            </span>
                          )}
                          {ev.category && (
                            <span className="font-terminal" style={{ color, fontSize: '10px' }}>
                              {ev.category}
                            </span>
                          )}
                          {ev.description && (
                            <span
                              className="font-terminal text-xs truncate"
                              style={{ color: '#475569' }}
                            >
                              {ev.description}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="flex items-center gap-2 py-4 justify-center">
                <Calendar size={14} style={{ color: '#334155' }} />
                <span className="font-terminal text-sm" style={{ color: '#334155' }}>
                  Geen afspraken vandaag
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Komende week */}
        {upcomingEvents.length > 0 && (
          <div className="hud-card">
            <div className="hud-corners-bottom" />
            <div
              className="flex items-center justify-between px-4 py-2.5"
              style={{ borderBottom: '1px solid rgba(0,212,255,0.08)' }}
            >
              <div className="flex items-center gap-2">
                <CalendarDays size={13} style={{ color: '#4f52a0' }} />
                <span className="hud-label">Komende 7 dagen</span>
                <span
                  className="font-terminal text-xs px-1.5 py-0.5 rounded"
                  style={{
                    background: 'rgba(79,82,160,0.1)',
                    color: '#818cf8',
                    fontSize: '10px',
                    border: '1px solid rgba(79,82,160,0.2)',
                  }}
                >
                  {upcomingEvents.length}
                </span>
              </div>
              <Link
                href="/agenda"
                className="flex items-center gap-1 font-terminal text-xs"
                style={{ color: '#475569' }}
              >
                View all <ArrowUpRight size={10} />
              </Link>
            </div>
            <div className="p-4 space-y-1.5">
              {upcomingEvents.map(ev => {
                const color = catColor(ev.category, cats)
                const d = parseISO(ev.event_date)
                const dayLabel = isTomorrow(d)
                  ? 'Morgen'
                  : format(d, 'EEE d MMM', { locale: nl })
                return (
                  <div
                    key={ev.id}
                    className="flex items-center gap-3 py-1.5 px-3 rounded"
                    style={{
                      borderLeft: `2px solid ${color}`,
                      background: 'rgba(255,255,255,0.01)',
                    }}
                  >
                    <span
                      className="font-terminal text-xs shrink-0 capitalize"
                      style={{ color: '#00d4ff', minWidth: 80 }}
                    >
                      {dayLabel}
                    </span>
                    <span
                      className="font-terminal text-xs truncate flex-1"
                      style={{ color: '#94a3b8' }}
                    >
                      {ev.title}
                    </span>
                    {ev.event_time && (
                      <span
                        className="font-terminal text-xs shrink-0"
                        style={{ color: '#334155' }}
                      >
                        {ev.event_time.slice(0, 5)}
                      </span>
                    )}
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: color }}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Open taken */}
        <div className="hud-card">
          <div className="hud-corners-bottom" />
          <div
            className="flex items-center justify-between px-4 py-2.5"
            style={{ borderBottom: '1px solid rgba(0,212,255,0.08)' }}
          >
            <div className="flex items-center gap-2">
              <CheckSquare size={13} style={{ color: '#f59e0b' }} />
              <span className="hud-label">Open taken</span>
              <span
                className="font-terminal text-xs px-1.5 py-0.5 rounded"
                style={{
                  background: 'rgba(245,158,11,0.1)',
                  color: '#f59e0b',
                  fontSize: '10px',
                  border: '1px solid rgba(245,158,11,0.2)',
                }}
              >
                {tasks.length}
              </span>
            </div>
            <Link
              href="/tasks"
              className="flex items-center gap-1 font-terminal text-xs"
              style={{ color: '#475569' }}
            >
              Kanban <ArrowUpRight size={10} />
            </Link>
          </div>
          <div className="p-4">
            {tasks.length > 0 ? (
              <div className="space-y-5">
                {Array.from(tasksByProject.entries()).map(([project, projectTasks]) => (
                  <div key={project}>
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className="font-terminal text-xs tracking-widest uppercase shrink-0"
                        style={{ color: '#475569' }}
                      >
                        {project}
                      </span>
                      <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.04)' }} />
                      <span className="font-terminal text-xs shrink-0" style={{ color: '#334155' }}>
                        {projectTasks.length}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {projectTasks.map(task => {
                        const pc = priorityColor(task.priority)
                        const isActive = task.status === 'in_progress'
                        return (
                          <div
                            key={task.id}
                            className="flex items-center gap-3 py-1.5 px-3 rounded"
                            style={{
                              background: isActive ? 'rgba(0,212,255,0.04)' : 'rgba(255,255,255,0.01)',
                              border: isActive
                                ? '1px solid rgba(0,212,255,0.12)'
                                : '1px solid transparent',
                            }}
                          >
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{
                                background: isActive ? '#00d4ff' : pc,
                                boxShadow: isActive ? '0 0 6px #00d4ff' : undefined,
                              }}
                            />
                            <span
                              className="font-terminal text-xs flex-1 truncate"
                              style={{ color: '#cbd5e1' }}
                            >
                              {task.title}
                            </span>
                            <span
                              className="font-terminal shrink-0"
                              style={{
                                color: isActive ? '#00d4ff' : pc,
                                fontSize: '9px',
                                letterSpacing: '0.1em',
                              }}
                            >
                              {isActive ? 'BEZIG' : priorityLabel(task.priority)}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 py-4 justify-center">
                <CheckCircle2 size={14} style={{ color: '#10b981' }} />
                <span className="font-terminal text-sm" style={{ color: '#334155' }}>
                  Alle taken gedaan!
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Onverwerkte notities */}
        {notes.length > 0 && (
          <div className="hud-card">
            <div className="hud-corners-bottom" />
            <div
              className="flex items-center justify-between px-4 py-2.5"
              style={{ borderBottom: '1px solid rgba(0,212,255,0.08)' }}
            >
              <div className="flex items-center gap-2">
                <StickyNote size={13} style={{ color: '#a855f7' }} />
                <span className="hud-label">Onverwerkte notities</span>
                <span
                  className="font-terminal text-xs px-1.5 py-0.5 rounded"
                  style={{
                    background: 'rgba(168,85,247,0.1)',
                    color: '#a855f7',
                    fontSize: '10px',
                    border: '1px solid rgba(168,85,247,0.2)',
                  }}
                >
                  {notes.length}
                </span>
              </div>
              <Link
                href="/notes"
                className="flex items-center gap-1 font-terminal text-xs"
                style={{ color: '#475569' }}
              >
                Bekijk <ArrowUpRight size={10} />
              </Link>
            </div>
            <div className="p-4 space-y-2">
              {notes.map(note => (
                <div
                  key={note.id}
                  className="py-2.5 px-3 rounded"
                  style={{
                    background: 'rgba(168,85,247,0.04)',
                    border: '1px solid rgba(168,85,247,0.1)',
                  }}
                >
                  {note.title && (
                    <p
                      className="font-terminal text-xs font-bold mb-1"
                      style={{ color: '#c4b5fd' }}
                    >
                      {note.title}
                    </p>
                  )}
                  <p
                    className="font-terminal text-xs"
                    style={{
                      color: '#64748b',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {note.content}
                  </p>
                  <p className="font-terminal mt-1.5" style={{ color: '#334155', fontSize: '10px' }}>
                    {format(parseISO(note.created_at), 'd MMM, HH:mm', { locale: nl })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Systeem */}
        <div className="grid grid-cols-2 gap-3">
          <div className="hud-card p-4 flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}
            >
              <Bot size={15} style={{ color: '#10b981' }} />
            </div>
            <div className="min-w-0">
              <div className="font-terminal text-xl font-bold" style={{ color: '#10b981' }}>
                {activeSessions.length}
              </div>
              <div
                className="font-terminal"
                style={{ color: '#334155', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase' }}
              >
                Actieve agents
              </div>
            </div>
            <Link href="/agents" className="ml-auto shrink-0" style={{ color: '#475569' }}>
              <ChevronRight size={14} />
            </Link>
          </div>
          <div className="hud-card p-4 flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.2)' }}
            >
              <Euro size={15} style={{ color: '#00d4ff' }} />
            </div>
            <div className="min-w-0">
              <div className="font-terminal text-xl font-bold" style={{ color: '#00d4ff' }}>
                {fmtEur(todayCost, 3)}
              </div>
              <div
                className="font-terminal"
                style={{ color: '#334155', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase' }}
              >
                Kosten vandaag
              </div>
            </div>
            <Link href="/costs" className="ml-auto shrink-0" style={{ color: '#475569' }}>
              <ChevronRight size={14} />
            </Link>
          </div>
        </div>

      </div>
    </div>
  )
}
