'use client'

import { useEffect, useState } from 'react'
import { supabase, type Task } from '@/lib/supabase'
import { Plus, X, ListTodo, CheckCircle2, Circle, Loader2, Trash2 } from 'lucide-react'

// Geeft de zondag terug die de huidige week begon (zondag = dag 0)
function getWeekStart(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - d.getDay()) // terug naar zondag
  return d
}

function isThisWeek(dateStr: string): boolean {
  return new Date(dateStr) >= getWeekStart()
}

type Props = {
  initialTasks: Task[]
}

const SB_URL = 'https://logkkueavewqmaquuwfw.supabase.co'
const SB_KEY = 'sb_publishable_nqPICLQDoaXGb8hshPIYYg_uv9GRuid'
const SB_HEADERS: Record<string, string> = {
  apikey: SB_KEY,
  Authorization: `Bearer ${SB_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
}

const columns = [
  { key: 'todo' as const, label: 'TODO', color: '#ef4444', icon: Circle },
  { key: 'in_progress' as const, label: 'BEZIG', color: '#00d4ff', icon: Loader2 },
  { key: 'done' as const, label: 'KLAAR', color: '#10b981', icon: CheckCircle2 },
]

const nextStatus: Record<string, Task['status']> = {
  todo: 'in_progress',
  in_progress: 'done',
  done: 'todo',
}

export function TasksPage({ initialTasks }: Props) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [project, setProject] = useState('')
  const [priority, setPriority] = useState(5)

  useEffect(() => {
    const channel = supabase
      .channel('tasks-page')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setTasks(prev => [...prev, payload.new as Task])
          } else if (payload.eventType === 'UPDATE') {
            setTasks(prev =>
              prev.map(t => t.id === (payload.new as Task).id ? payload.new as Task : t)
            )
          } else if (payload.eventType === 'DELETE') {
            setTasks(prev => prev.filter(t => t.id !== (payload.old as { id: string }).id))
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  async function toggleStatus(task: Task) {
    const newStatus = nextStatus[task.status]
    try {
      const res = await fetch(`${SB_URL}/rest/v1/tasks?id=eq.${task.id}`, {
        method: 'PATCH',
        headers: SB_HEADERS,
        body: JSON.stringify({ status: newStatus, updated_at: new Date().toISOString() }),
      })
      if (res.ok) {
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus, updated_at: new Date().toISOString() } : t))
      }
    } catch { /* ignore */ }
  }

  async function deleteTask(id: string) {
    try {
      await fetch(`${SB_URL}/rest/v1/tasks?id=eq.${id}`, {
        method: 'DELETE',
        headers: SB_HEADERS,
      })
      setTasks(prev => prev.filter(t => t.id !== id))
    } catch { /* ignore */ }
  }

  // Verwijder alle voltooide taken van vóór deze week uit Supabase
  async function clearOldDone() {
    const cutoff = getWeekStart().toISOString()
    const oldDone = tasks.filter(t => t.status === 'done' && !isThisWeek(t.updated_at))
    if (oldDone.length === 0) return
    try {
      await fetch(`${SB_URL}/rest/v1/tasks?status=eq.done&updated_at=lt.${cutoff}`, {
        method: 'DELETE',
        headers: SB_HEADERS,
      })
      setTasks(prev => prev.filter(t => !(t.status === 'done' && !isThisWeek(t.updated_at))))
    } catch { /* ignore */ }
  }

  async function createTask() {
    if (!title.trim()) return
    try {
      const res = await fetch(`${SB_URL}/rest/v1/tasks`, {
        method: 'POST',
        headers: SB_HEADERS,
        body: JSON.stringify({
          title: title.trim(),
          status: 'todo',
          project: project.trim() || null,
          priority,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data) && data.length > 0) {
          setTasks(prev => [...prev, data[0] as Task])
        }
        setTitle('')
        setProject('')
        setPriority(5)
        setShowForm(false)
      }
    } catch { /* ignore */ }
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <ListTodo size={20} style={{ color: '#00d4ff' }} />
            <h1 className="text-xl font-semibold text-white">Taken</h1>
          </div>
          <p className="font-terminal text-xs" style={{ color: '#475569' }}>
            {tasks.filter(t => t.status === 'done').length}/{tasks.length} afgerond
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg font-terminal text-xs transition-all"
          style={{
            background: showForm ? 'rgba(239,68,68,0.1)' : 'rgba(0,212,255,0.1)',
            border: showForm ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(0,212,255,0.3)',
            color: showForm ? '#ef4444' : '#00d4ff',
          }}
        >
          {showForm ? <X size={12} /> : <Plus size={12} />}
          {showForm ? 'Annuleren' : 'Nieuwe taak'}
        </button>
      </div>

      {/* New task form */}
      {showForm && (
        <div className="slide-in p-4 rounded-lg" style={{ background: 'rgba(0,212,255,0.03)', border: '1px solid rgba(0,212,255,0.12)' }}>
          <div className="flex flex-wrap gap-3">
            <input
              type="text"
              placeholder="Taaknaam..."
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createTask()}
              className="flex-1 min-w-48 bg-transparent px-3 py-2 rounded-lg font-terminal text-xs outline-none"
              style={{ border: '1px solid rgba(0,212,255,0.15)', color: '#cbd5e1' }}
              autoFocus
            />
            <input
              type="text"
              placeholder="Project (optioneel)"
              value={project}
              onChange={e => setProject(e.target.value)}
              className="w-40 bg-transparent px-3 py-2 rounded-lg font-terminal text-xs outline-none"
              style={{ border: '1px solid rgba(0,212,255,0.15)', color: '#cbd5e1' }}
            />
            <select
              value={priority}
              onChange={e => setPriority(Number(e.target.value))}
              className="w-24 bg-transparent px-3 py-2 rounded-lg font-terminal text-xs outline-none"
              style={{ border: '1px solid rgba(0,212,255,0.15)', color: '#cbd5e1', background: '#07070f' }}
            >
              {[1, 2, 3, 4, 5].map(p => (
                <option key={p} value={p}>P{p}</option>
              ))}
            </select>
            <button
              onClick={createTask}
              className="px-4 py-2 rounded-lg font-terminal text-xs font-medium"
              style={{ background: 'rgba(0,212,255,0.15)', color: '#00d4ff', border: '1px solid rgba(0,212,255,0.3)' }}
            >
              Toevoegen
            </button>
          </div>
        </div>
      )}

      {/* Kanban columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {columns.map(col => {
          const allColTasks = tasks.filter(t => t.status === col.key)

          // Klaar-kolom: alleen taken van deze week tonen
          const colTasks = col.key === 'done'
            ? allColTasks.filter(t => isThisWeek(t.updated_at))
            : allColTasks

          const hiddenCount = col.key === 'done' ? allColTasks.length - colTasks.length : 0

          const Icon = col.icon
          return (
            <div key={col.key} className="hud-card flex flex-col">
              <div className="hud-corners-bottom" />

              {/* Kolom header */}
              <div
                className="flex items-center justify-between px-4 py-3 shrink-0"
                style={{ borderBottom: `1px solid ${col.color}30` }}
              >
                <div className="flex items-center gap-2">
                  <Icon
                    size={13}
                    style={{
                      color: col.color,
                      animation: col.key === 'in_progress' ? 'spin 2s linear infinite' : 'none',
                    }}
                  />
                  <span className="font-terminal text-xs font-medium tracking-wider uppercase" style={{ color: col.color }}>
                    {col.label}
                  </span>
                  {col.key === 'done' && (
                    <span className="font-terminal" style={{ fontSize: 9, color: '#334155' }}>
                      · deze week
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-terminal text-xs" style={{ color: '#334155' }}>
                    {colTasks.length}
                  </span>
                  {/* Opruimknop — alleen in done kolom als er oude taken zijn */}
                  {col.key === 'done' && hiddenCount > 0 && (
                    <button
                      onClick={clearOldDone}
                      title={`${hiddenCount} oude voltooide taken verwijderen`}
                      className="flex items-center gap-1 font-terminal px-1.5 py-0.5 rounded"
                      style={{
                        fontSize: 9, color: '#475569', background: 'rgba(239,68,68,0.08)',
                        border: '1px solid rgba(239,68,68,0.15)', cursor: 'pointer',
                      }}
                    >
                      <Trash2 size={9} style={{ color: '#ef4444' }} />
                      Wis {hiddenCount} oud
                    </button>
                  )}
                </div>
              </div>

              {/* Taakenlijst — max-height op done kolom */}
              <div
                className="p-3 space-y-2 min-h-32"
                style={col.key === 'done' ? { maxHeight: 340, overflowY: 'auto' } : {}}
              >
                {colTasks.map(task => (
                  <div
                    key={task.id}
                    className="flex items-start gap-2 p-2.5 rounded-lg cursor-pointer transition-all group"
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.05)',
                    }}
                    onClick={() => toggleStatus(task)}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0 mt-1"
                      style={{ background: col.color, boxShadow: `0 0 4px ${col.color}` }}
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className="font-terminal text-xs leading-relaxed"
                        style={{
                          color: col.key === 'done' ? '#475569' : '#cbd5e1',
                          textDecoration: col.key === 'done' ? 'line-through' : 'none',
                        }}
                      >
                        {task.title}
                      </p>
                      {task.project && (
                        <p className="font-terminal mt-0.5" style={{ color: '#334155', fontSize: '10px' }}>
                          {task.project}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); deleteTask(task.id) }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      style={{ color: '#ef4444' }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}

                {colTasks.length === 0 && (
                  <div className="flex items-center justify-center py-6">
                    <p className="font-terminal text-xs" style={{ color: '#1e293b' }}>
                      {col.key === 'done' ? 'Niets voltooid deze week' : 'Geen taken'}
                    </p>
                  </div>
                )}
              </div>

              {/* Verborgen taken melding onderaan done-kolom */}
              {col.key === 'done' && hiddenCount > 0 && (
                <div
                  className="px-4 py-2 shrink-0 font-terminal"
                  style={{ fontSize: 10, color: '#334155', borderTop: '1px solid rgba(0,212,255,0.05)' }}
                >
                  {hiddenCount} taken van vorige week{hiddenCount === 1 ? '' : 's'} verborgen
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
