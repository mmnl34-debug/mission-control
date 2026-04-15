'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { CheckCircle2, Circle, Loader2, ListTodo } from 'lucide-react'

type Task = {
  id: string
  title: string
  description: string | null
  status: 'todo' | 'in_progress' | 'done'
  project: string | null
  priority: number
  created_at: string
  updated_at: string
}

type Props = {
  initialTasks: Task[]
}

const statusConfig = {
  todo: {
    color: '#475569',
    icon: Circle,
    label: 'TODO',
    bg: 'rgba(71,85,105,0.1)',
    border: 'rgba(71,85,105,0.3)',
  },
  in_progress: {
    color: '#06b6d4',
    icon: Loader2,
    label: 'BEZIG',
    bg: 'rgba(6,182,212,0.08)',
    border: 'rgba(6,182,212,0.25)',
  },
  done: {
    color: '#10b981',
    icon: CheckCircle2,
    label: 'KLAAR',
    bg: 'rgba(16,185,129,0.08)',
    border: 'rgba(16,185,129,0.25)',
  },
}

export function LiveTasks({ initialTasks }: Props) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)

  useEffect(() => {
    const channel = supabase
      .channel('live-tasks')
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

  const todo = tasks.filter(t => t.status === 'todo')
  const inProgress = tasks.filter(t => t.status === 'in_progress')
  const done = tasks.filter(t => t.status === 'done')
  const orderedTasks = [...inProgress, ...todo, ...done]

  return (
    <div className="glass-card flex flex-col overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-1.5 h-4 rounded-full"
            style={{ background: 'linear-gradient(180deg, #f59e0b, #ec4899)', boxShadow: '0 0 8px rgba(245,158,11,0.6)' }}
          />
          <h2 className="text-sm font-semibold tracking-widest uppercase font-terminal" style={{ color: '#fbbf24' }}>
            Taken
          </h2>
        </div>
        <div className="flex items-center gap-3">
          {inProgress.length > 0 && (
            <span className="font-terminal text-xs" style={{ color: '#06b6d4' }}>
              {inProgress.length} bezig
            </span>
          )}
          <span className="font-terminal text-xs" style={{ color: '#334155' }}>
            {done.length}/{tasks.length} klaar
          </span>
        </div>
      </div>

      {/* Task list */}
      <div className="flex-1 p-3 space-y-1.5 overflow-auto">
        {orderedTasks.length === 0 ? (
          <div className="flex items-center justify-center py-6">
            <div className="flex items-center gap-2" style={{ color: '#334155' }}>
              <ListTodo size={14} />
              <p className="font-terminal text-xs">Geen taken</p>
            </div>
          </div>
        ) : (
          orderedTasks.map(task => {
            const cfg = statusConfig[task.status]
            const Icon = cfg.icon
            const isInProgress = task.status === 'in_progress'
            return (
              <div
                key={task.id}
                className="flex items-start gap-2.5 p-2.5 rounded-lg"
                style={{
                  background: cfg.bg,
                  border: `1px solid ${cfg.border}`,
                  opacity: task.status === 'done' ? 0.55 : 1,
                }}
              >
                <div className="shrink-0 mt-0.5">
                  <Icon
                    size={13}
                    style={{
                      color: cfg.color,
                      animation: isInProgress ? 'spin 2s linear infinite' : 'none',
                    }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="font-terminal text-xs leading-relaxed"
                    style={{
                      color: task.status === 'done' ? '#475569' : '#cbd5e1',
                      textDecoration: task.status === 'done' ? 'line-through' : 'none',
                    }}
                  >
                    {task.title}
                  </p>
                  {task.project && (
                    <p className="font-terminal text-xs mt-0.5" style={{ color: '#334155', fontSize: '10px' }}>
                      {task.project}
                    </p>
                  )}
                </div>
                <span
                  className="font-terminal shrink-0"
                  style={{
                    color: cfg.color,
                    fontSize: '9px',
                    letterSpacing: '0.08em',
                    border: `1px solid ${cfg.border}`,
                    padding: '1px 5px',
                    borderRadius: '3px',
                  }}
                >
                  {cfg.label}
                </span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
