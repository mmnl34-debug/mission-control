'use client'

import { useMemo, useState } from 'react'
import {
  CalendarDays, Plus, X, Check, Clock, Trash2, Folder, Undo2,
  ChevronLeft, ChevronRight, Tag, ChevronDown, ChevronUp,
} from 'lucide-react'
import {
  format, isToday, isPast, addMonths, subMonths,
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameDay, isSameMonth,
} from 'date-fns'
import { nl } from 'date-fns/locale'
import type { PlannerEvent, AgendaCategory } from '@/lib/supabase'

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SB_HEADERS = {
  apikey: SB_KEY,
  Authorization: `Bearer ${SB_KEY}`,
  'Content-Type': 'application/json',
}

const DEFAULT_CATEGORIES: AgendaCategory[] = [
  { id: 'klant',    name: 'Klant',             color: '#3b82f6', is_default: true, created_at: '' },
  { id: 'dokter',   name: 'Dokter/Ziekenhuis', color: '#ef4444', is_default: true, created_at: '' },
  { id: 'algemeen', name: 'Algemeen',          color: '#94a3b8', is_default: true, created_at: '' },
]

interface Props {
  initialEvents: PlannerEvent[]
  initialCategories: AgendaCategory[]
  projects: string[]
}

function categoryColor(name: string | null | undefined, cats: AgendaCategory[]): string {
  if (!name) return '#94a3b8'
  const hit = cats.find(c => c.name === name)
  return hit?.color ?? '#94a3b8'
}

export function AgendaPage({ initialEvents, initialCategories, projects }: Props) {
  const [events, setEvents] = useState<PlannerEvent[]>(initialEvents)
  const [categories, setCategories] = useState<AgendaCategory[]>(
    initialCategories.length > 0 ? initialCategories : DEFAULT_CATEGORIES,
  )

  const [viewMonth, setViewMonth] = useState<Date>(new Date())
  const [selectedDay, setSelectedDay] = useState<Date>(new Date())

  const [creating, setCreating] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [time, setTime] = useState('')
  const [project, setProject] = useState('')
  const [category, setCategory] = useState('Algemeen')

  const [showCategoryManager, setShowCategoryManager] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [newCatColor, setNewCatColor] = useState('#00d4ff')

  // Calendar grid days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(viewMonth)
    const monthEnd = endOfMonth(viewMonth)
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
    return eachDayOfInterval({ start: gridStart, end: gridEnd })
  }, [viewMonth])

  const eventsByDay = useMemo(() => {
    const map = new Map<string, PlannerEvent[]>()
    for (const ev of events) {
      if (ev.status === 'cancelled') continue
      const arr = map.get(ev.event_date) ?? []
      arr.push(ev)
      map.set(ev.event_date, arr)
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => (a.event_time ?? '99:99').localeCompare(b.event_time ?? '99:99'))
    }
    return map
  }, [events])

  const selectedDayIso = format(selectedDay, 'yyyy-MM-dd')
  const selectedDayEvents = eventsByDay.get(selectedDayIso) ?? []

  function openCreateForSelected() {
    setCreating(true)
    setTitle('')
    setDescription('')
    setTime('')
    setProject('')
    setCategory('Algemeen')
  }

  async function createEvent() {
    if (!title.trim()) return
    const basePayload = {
      title: title.trim(),
      description: description.trim() || null,
      event_date: selectedDayIso,
      event_time: time || null,
      project: project || null,
      source: 'manual',
    }

    try {
      // try with category
      const res = await fetch(`${SB_URL}/rest/v1/planner_events`, {
        method: 'POST',
        headers: { ...SB_HEADERS, Prefer: 'return=representation' },
        body: JSON.stringify({ ...basePayload, category }),
      })
      if (res.ok) {
        const json = await res.json()
        const created = Array.isArray(json) ? json[0] : json
        setEvents(prev => [...prev, created as PlannerEvent])
        setCreating(false)
        return
      }
      // retry without category if column missing
      const res2 = await fetch(`${SB_URL}/rest/v1/planner_events`, {
        method: 'POST',
        headers: { ...SB_HEADERS, Prefer: 'return=representation' },
        body: JSON.stringify(basePayload),
      })
      if (res2.ok) {
        const json2 = await res2.json()
        const created2 = Array.isArray(json2) ? json2[0] : json2
        setEvents(prev => [...prev, created2 as PlannerEvent])
        setCreating(false)
      }
    } catch (e) {
      console.error('createEvent failed', e)
    }
  }

  async function toggleDone(ev: PlannerEvent) {
    const next = ev.status === 'done' ? 'planned' : 'done'
    const res = await fetch(`${SB_URL}/rest/v1/planner_events?id=eq.${ev.id}`, {
      method: 'PATCH',
      headers: { ...SB_HEADERS, Prefer: 'return=minimal' },
      body: JSON.stringify({ status: next }),
    })
    if (!res.ok) return
    setEvents(prev => prev.map(e => e.id === ev.id ? { ...e, status: next } : e))
  }

  async function deleteEvent(id: string) {
    if (!confirm('Event verwijderen?')) return
    const res = await fetch(`${SB_URL}/rest/v1/planner_events?id=eq.${id}`, {
      method: 'DELETE',
      headers: SB_HEADERS,
    })
    if (!res.ok) return
    setEvents(prev => prev.filter(e => e.id !== id))
  }

  async function deletePastEvents() {
    const today = format(new Date(), 'yyyy-MM-dd')
    if (!confirm(`Alle afspraken vóór ${today} verwijderen?`)) return
    const res = await fetch(`${SB_URL}/rest/v1/planner_events?event_date=lt.${today}`, {
      method: 'DELETE',
      headers: SB_HEADERS,
    })
    if (!res.ok) return
    setEvents(prev => prev.filter(e => e.event_date >= today))
  }

  async function createCategory() {
    if (!newCatName.trim()) return
    const payload = {
      name: newCatName.trim(),
      color: newCatColor,
      is_default: false,
    }
    const res = await fetch(`${SB_URL}/rest/v1/agenda_categories`, {
      method: 'POST',
      headers: { ...SB_HEADERS, Prefer: 'return=representation' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) return
    const json = await res.json()
    const created = Array.isArray(json) ? json[0] : json
    setCategories(prev => [...prev, created as AgendaCategory])
    setNewCatName('')
    setNewCatColor('#00d4ff')
  }

  async function deleteCategory(cat: AgendaCategory) {
    if (cat.is_default) return
    if (!confirm(`Categorie "${cat.name}" verwijderen?`)) return
    const res = await fetch(`${SB_URL}/rest/v1/agenda_categories?id=eq.${cat.id}`, {
      method: 'DELETE',
      headers: SB_HEADERS,
    })
    if (!res.ok) return
    setCategories(prev => prev.filter(c => c.id !== cat.id))
  }

  const weekDayLabels = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo']

  return (
    <div className="relative min-h-full">
      <div className="orb-purple" style={{ top: '-100px', left: '-100px' }} />
      <div className="orb-cyan" style={{ bottom: '-100px', right: '-100px' }} />

      <div className="relative z-10 p-6 space-y-5">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1
              className="text-2xl font-bold tracking-widest uppercase font-terminal glow-text"
              style={{ color: '#f1f5f9', letterSpacing: '0.2em' }}
            >
              Agenda
            </h1>
            <p className="font-terminal text-xs tracking-wider mt-1" style={{ color: '#334155' }}>
              {events.filter(e => e.status === 'planned').length} gepland · {categories.length} categorieën
            </p>
          </div>
          <button
            onClick={deletePastEvents}
            className="flex items-center gap-2 px-3 py-2 rounded-lg font-terminal text-xs"
            style={{
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.25)',
              color: '#ef4444',
              cursor: 'pointer',
            }}
          >
            <Trash2 size={12} />
            Verwijder verstreken
          </button>
        </div>

        {/* Maand-navigatie */}
        <div className="hud-card p-4">
          <div className="hud-corners-bottom" />
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setViewMonth(prev => subMonths(prev, 1))}
              className="flex items-center justify-center rounded"
              style={{
                width: 32, height: 32,
                background: 'rgba(0,212,255,0.06)',
                border: '1px solid rgba(0,212,255,0.18)',
                color: '#00d4ff',
                cursor: 'pointer',
              }}
              aria-label="Vorige maand"
            >
              <ChevronLeft size={16} />
            </button>
            <h2
              className="font-terminal text-base"
              style={{
                color: '#f1f5f9',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
              }}
            >
              {format(viewMonth, 'LLLL yyyy', { locale: nl })}
            </h2>
            <button
              onClick={() => setViewMonth(prev => addMonths(prev, 1))}
              className="flex items-center justify-center rounded"
              style={{
                width: 32, height: 32,
                background: 'rgba(0,212,255,0.06)',
                border: '1px solid rgba(0,212,255,0.18)',
                color: '#00d4ff',
                cursor: 'pointer',
              }}
              aria-label="Volgende maand"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {weekDayLabels.map(d => (
              <div
                key={d}
                className="font-terminal text-center"
                style={{
                  fontSize: 10,
                  color: '#475569',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  padding: '4px 0',
                }}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map(day => {
              const iso = format(day, 'yyyy-MM-dd')
              const dayEvents = eventsByDay.get(iso) ?? []
              const inMonth = isSameMonth(day, viewMonth)
              const today = isToday(day)
              const selected = isSameDay(day, selectedDay)
              const past = isPast(day) && !today

              let bg = 'transparent'
              if (selected) bg = 'rgba(0,212,255,0.12)'

              let borderColor = 'rgba(255,255,255,0.04)'
              if (today) borderColor = '#00d4ff'
              else if (selected) borderColor = 'rgba(0,212,255,0.4)'

              const opacity = inMonth ? (past ? 0.55 : 1) : 0.25

              return (
                <button
                  key={iso}
                  onClick={() => setSelectedDay(day)}
                  className="flex flex-col rounded p-1.5 text-left"
                  style={{
                    minHeight: 64,
                    background: bg,
                    border: `1px solid ${borderColor}`,
                    opacity,
                    cursor: 'pointer',
                  }}
                >
                  <span
                    className="font-terminal self-end"
                    style={{
                      fontSize: 11,
                      color: today ? '#00d4ff' : (inMonth ? '#cbd5e1' : '#475569'),
                      fontWeight: today ? 600 : 400,
                    }}
                  >
                    {format(day, 'd')}
                  </span>
                  <div className="flex flex-wrap gap-0.5 mt-auto">
                    {dayEvents.slice(0, 4).map((ev, i) => (
                      <span
                        key={ev.id + i}
                        title={ev.title}
                        style={{
                          width: 5, height: 5, borderRadius: '50%',
                          background: categoryColor(ev.category, categories),
                          opacity: ev.status === 'done' ? 0.4 : 1,
                        }}
                      />
                    ))}
                    {dayEvents.length > 4 && (
                      <span className="font-terminal" style={{ fontSize: 8, color: '#475569' }}>
                        +{dayEvents.length - 4}
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Legenda */}
          <div className="flex flex-wrap gap-3 mt-4 pt-3" style={{ borderTop: '1px solid rgba(0,212,255,0.06)' }}>
            {categories.map(cat => (
              <div key={cat.id} className="flex items-center gap-1.5">
                <span
                  style={{
                    width: 10, height: 10, borderRadius: 2,
                    background: cat.color,
                  }}
                />
                <span className="font-terminal" style={{ fontSize: 10, color: '#94a3b8', letterSpacing: '0.06em' }}>
                  {cat.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Dag-detail panel */}
        <div className="hud-card p-4">
          <div className="hud-corners-bottom" />
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="hud-label">
                {format(selectedDay, 'EEEE d MMMM yyyy', { locale: nl })}
              </span>
              <p className="font-terminal text-xs mt-1" style={{ color: '#475569' }}>
                {selectedDayEvents.length} {selectedDayEvents.length === 1 ? 'afspraak' : 'afspraken'}
              </p>
            </div>
            <button
              onClick={creating ? () => setCreating(false) : openCreateForSelected}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md font-terminal text-xs"
              style={{
                background: creating ? 'rgba(239,68,68,0.08)' : 'rgba(0,212,255,0.08)',
                border: creating ? '1px solid rgba(239,68,68,0.25)' : '1px solid rgba(0,212,255,0.25)',
                color: creating ? '#ef4444' : '#00d4ff',
                cursor: 'pointer',
              }}
            >
              {creating ? <X size={12} /> : <Plus size={12} />}
              {creating ? 'Annuleren' : 'Nieuwe afspraak'}
            </button>
          </div>

          {/* Create form */}
          {creating && (
            <div
              className="space-y-3 p-3 mb-3 rounded"
              style={{
                background: 'rgba(0,212,255,0.03)',
                border: '1px solid rgba(0,212,255,0.12)',
              }}
            >
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
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="font-terminal text-xs"
                  style={{
                    background: 'rgba(0,212,255,0.03)',
                    border: '1px solid rgba(0,212,255,0.12)',
                    borderRadius: 6, padding: '6px 8px', color: '#94a3b8', outline: 'none',
                  }}
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.name}>● {c.name}</option>
                  ))}
                </select>
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
                  disabled={!title.trim()}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-md font-terminal text-xs"
                  style={{
                    background: title.trim() ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.05)',
                    border: '1px solid rgba(16,185,129,0.3)',
                    color: title.trim() ? '#10b981' : '#475569',
                    cursor: title.trim() ? 'pointer' : 'not-allowed',
                  }}
                >
                  <Check size={12} />
                  Opslaan
                </button>
              </div>
            </div>
          )}

          {/* Events for selected day */}
          {selectedDayEvents.length > 0 ? (
            <div className="space-y-2">
              {selectedDayEvents.map(ev => {
                const done = ev.status === 'done'
                const color = categoryColor(ev.category, categories)
                return (
                  <div
                    key={ev.id}
                    className="flex items-start gap-3 p-3 rounded-lg transition-all"
                    style={{
                      background: done ? 'rgba(16,185,129,0.04)' : 'rgba(0,212,255,0.02)',
                      border: '1px solid rgba(0,212,255,0.08)',
                      borderLeft: `3px solid ${color}`,
                      opacity: done ? 0.7 : 1,
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
                        {ev.category && (
                          <span
                            className="font-terminal flex items-center gap-1"
                            style={{ fontSize: 10, color }}
                          >
                            <Tag size={9} />
                            {ev.category}
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
              })}
            </div>
          ) : (
            !creating && (
              <div className="flex flex-col items-center justify-center py-8" style={{ color: '#334155' }}>
                <CalendarDays size={24} className="mb-2 opacity-30" />
                <p className="font-terminal text-xs">Geen afspraken op deze dag</p>
              </div>
            )
          )}
        </div>

        {/* Categorie beheer (uitklapbaar) */}
        <div className="hud-card">
          <div className="hud-corners-bottom" />
          <button
            onClick={() => setShowCategoryManager(p => !p)}
            className="w-full flex items-center justify-between px-4 py-3"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              borderBottom: showCategoryManager ? '1px solid rgba(0,212,255,0.08)' : 'none',
            }}
          >
            <span className="hud-label flex items-center gap-2">
              <Tag size={11} />
              Categorieën beheren
            </span>
            {showCategoryManager
              ? <ChevronUp size={14} style={{ color: '#00d4ff' }} />
              : <ChevronDown size={14} style={{ color: '#475569' }} />}
          </button>
          {showCategoryManager && (
            <div className="p-4 space-y-3">
              {/* Bestaande categorieën */}
              <div className="space-y-1.5">
                {categories.map(cat => (
                  <div
                    key={cat.id}
                    className="flex items-center gap-3 px-3 py-2 rounded"
                    style={{
                      background: 'rgba(0,212,255,0.02)',
                      border: '1px solid rgba(0,212,255,0.08)',
                    }}
                  >
                    <span
                      style={{
                        width: 14, height: 14, borderRadius: 4,
                        background: cat.color,
                        flexShrink: 0,
                      }}
                    />
                    <span className="font-terminal text-sm flex-1" style={{ color: '#cbd5e1' }}>
                      {cat.name}
                    </span>
                    {cat.is_default ? (
                      <span
                        className="font-terminal px-1.5 rounded"
                        style={{
                          fontSize: 9,
                          background: 'rgba(0,212,255,0.08)',
                          color: '#00d4ff',
                          border: '1px solid rgba(0,212,255,0.18)',
                          letterSpacing: '0.06em',
                        }}
                      >
                        DEFAULT
                      </span>
                    ) : (
                      <button
                        onClick={() => deleteCategory(cat)}
                        title="Verwijder"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#64748b',
                          cursor: 'pointer',
                          padding: 2,
                        }}
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Nieuwe categorie */}
              <div
                className="flex gap-2 flex-wrap items-center pt-3"
                style={{ borderTop: '1px solid rgba(0,212,255,0.06)' }}
              >
                <input
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  placeholder="Naam nieuwe categorie"
                  className="font-terminal text-xs flex-1"
                  style={{
                    minWidth: 160,
                    background: 'rgba(0,212,255,0.03)',
                    border: '1px solid rgba(0,212,255,0.12)',
                    borderRadius: 6, padding: '6px 10px', color: '#f1f5f9', outline: 'none',
                  }}
                />
                <input
                  type="color"
                  value={newCatColor}
                  onChange={e => setNewCatColor(e.target.value)}
                  className="font-terminal"
                  style={{
                    width: 36, height: 30,
                    background: 'transparent',
                    border: '1px solid rgba(0,212,255,0.12)',
                    borderRadius: 6,
                    cursor: 'pointer',
                  }}
                />
                <button
                  onClick={createCategory}
                  disabled={!newCatName.trim()}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-md font-terminal text-xs"
                  style={{
                    background: newCatName.trim() ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.05)',
                    border: '1px solid rgba(16,185,129,0.3)',
                    color: newCatName.trim() ? '#10b981' : '#475569',
                    cursor: newCatName.trim() ? 'pointer' : 'not-allowed',
                  }}
                >
                  <Plus size={12} />
                  Toevoegen
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
