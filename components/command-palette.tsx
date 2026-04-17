'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  LayoutDashboard, Bot, Radio, ListTodo, FolderKanban,
  DollarSign, Mic, Command, Plus, Search, Check, GitMerge,
} from 'lucide-react'

const SB_URL  = 'https://logkkueavewqmaquuwfw.supabase.co'
const SB_KEY  = 'sb_publishable_nqPICLQDoaXGb8hshPIYYg_uv9GRuid'
const HEADERS = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' }

type CommandEntry = {
  label: string
  description?: string
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>
  action: 'navigate' | 'jarvis' | 'create-task' | 'search'
  href?: string
}

const COMMANDS: CommandEntry[] = [
  { label: 'Dashboard',         icon: LayoutDashboard, action: 'navigate', href: '/' },
  { label: 'Agents',            icon: Bot,             action: 'navigate', href: '/agents' },
  { label: 'Live Feed',         icon: Radio,           action: 'navigate', href: '/feed' },
  { label: 'Taken',             icon: ListTodo,        action: 'navigate', href: '/tasks' },
  { label: 'Projecten',         icon: FolderKanban,    action: 'navigate', href: '/projects' },
  { label: 'Pipeline',          icon: GitMerge,        action: 'navigate', href: '/pipeline' },
  { label: 'Kosten',            icon: DollarSign,      action: 'navigate', href: '/costs' },
  { label: 'Log zoeken',        description: 'Doorzoek alle agent logs', icon: Search, action: 'search' },
  { label: 'Nieuwe taak',       description: 'Taak aanmaken en direct in kanban zetten', icon: Plus, action: 'create-task' },
  { label: 'JARVIS activeren',  icon: Mic,             action: 'jarvis' },
]

export function CommandPalette() {
  const [open, setOpen]             = useState(false)
  const [query, setQuery]           = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [mode, setMode]             = useState<'command' | 'create-task'>('command')
  const [taskTitle, setTaskTitle]   = useState('')
  const [taskPriority, setTaskPriority] = useState<1 | 2 | 3>(2)
  const [saving, setSaving]         = useState(false)
  const [saved, setSaved]           = useState(false)
  const inputRef  = useRef<HTMLInputElement>(null)
  const router    = useRouter()

  const filtered = COMMANDS.filter(c =>
    c.label.toLowerCase().includes(query.toLowerCase()) ||
    c.description?.toLowerCase().includes(query.toLowerCase())
  )

  const handleOpen = useCallback(() => {
    setOpen(true); setQuery(''); setActiveIndex(0); setMode('command')
    setSaved(false); setTaskTitle(''); setTaskPriority(2)
  }, [])

  const handleClose = useCallback(() => {
    setOpen(false); setQuery(''); setActiveIndex(0); setMode('command'); setSaved(false)
  }, [])

  const runCommand = useCallback((cmd: CommandEntry) => {
    if (cmd.action === 'navigate' && cmd.href) { handleClose(); router.push(cmd.href) }
    else if (cmd.action === 'jarvis')   { handleClose(); window.dispatchEvent(new CustomEvent('jarvis-activate')) }
    else if (cmd.action === 'search')   { handleClose(); router.push('/search') }
    else if (cmd.action === 'create-task') { setMode('create-task'); setQuery('') }
  }, [handleClose, router])

  const createTask = useCallback(async () => {
    if (!taskTitle.trim()) return
    setSaving(true)
    try {
      await fetch(`${SB_URL}/rest/v1/tasks`, {
        method: 'POST',
        headers: { ...HEADERS, Prefer: 'return=minimal' },
        body: JSON.stringify({
          title: taskTitle.trim(),
          status: 'todo',
          priority: taskPriority,
          project: 'Mission Control',
        }),
      })
      setSaved(true)
      setTimeout(handleClose, 900)
    } finally {
      setSaving(false)
    }
  }, [taskTitle, taskPriority, handleClose])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); open ? handleClose() : handleOpen() }
      if (e.key === 'Escape' && open) handleClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, handleOpen, handleClose])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 10)
  }, [open, mode])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (mode === 'create-task') {
      if (e.key === 'Enter') { e.preventDefault(); createTask() }
      return
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, filtered.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); if (filtered[activeIndex]) runCommand(filtered[activeIndex]) }
  }

  useEffect(() => { setActiveIndex(0) }, [query])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-start justify-center pt-[15vh]"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
      onClick={handleClose}
    >
      <div
        className="w-full max-w-lg mx-4 rounded-lg overflow-hidden"
        style={{ background: 'rgba(7,7,15,0.97)', border: '1px solid rgba(0,212,255,0.25)', boxShadow: '0 0 60px rgba(0,212,255,0.1)' }}
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* ── Command mode ── */}
        {mode === 'command' && (
          <>
            <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid rgba(0,212,255,0.1)' }}>
              <Command size={14} style={{ color: '#00d4ff', flexShrink: 0 }} />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Zoek commando of pagina…"
                className="flex-1 bg-transparent outline-none font-terminal text-sm"
                style={{ color: '#f1f5f9' }}
              />
              <span className="font-terminal shrink-0" style={{ color: '#334155', fontSize: 10 }}>ESC</span>
            </div>

            <div className="py-1" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              {filtered.length === 0 && (
                <div className="px-4 py-4 font-terminal text-xs text-center" style={{ color: '#475569' }}>Geen resultaten</div>
              )}
              {filtered.map((cmd, i) => {
                const Icon = cmd.icon
                const isActive = i === activeIndex
                return (
                  <button
                    key={cmd.label}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                    style={{ background: isActive ? 'rgba(0,212,255,0.08)' : 'transparent' }}
                    onClick={() => runCommand(cmd)}
                    onMouseEnter={() => setActiveIndex(i)}
                  >
                    <Icon size={14} style={{ color: isActive ? '#00d4ff' : '#475569', flexShrink: 0 }} />
                    <div className="flex-1 min-w-0">
                      <span className="font-terminal text-sm" style={{ color: isActive ? '#f1f5f9' : '#94a3b8' }}>{cmd.label}</span>
                      {cmd.description && (
                        <span className="font-terminal text-xs ml-2" style={{ color: '#334155' }}>{cmd.description}</span>
                      )}
                    </div>
                    {isActive && <span className="font-terminal shrink-0" style={{ fontSize: 10, color: '#334155' }}>↵</span>}
                  </button>
                )
              })}
            </div>

            <div className="flex items-center justify-between px-4 py-2" style={{ borderTop: '1px solid rgba(0,212,255,0.06)' }}>
              <div className="flex items-center gap-3 font-terminal" style={{ color: '#334155', fontSize: 10 }}>
                <span>↑↓ navigeren</span>
                <span>↵ uitvoeren</span>
              </div>
              <kbd className="font-terminal px-1.5 py-0.5 rounded" style={{ fontSize: 10, color: '#334155', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>⌘K</kbd>
            </div>
          </>
        )}

        {/* ── Create task mode ── */}
        {mode === 'create-task' && (
          <>
            <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid rgba(0,212,255,0.1)' }}>
              <Plus size={14} style={{ color: '#10b981', flexShrink: 0 }} />
              <span className="font-terminal text-sm" style={{ color: '#10b981' }}>Nieuwe taak</span>
            </div>

            <div className="p-4 space-y-4">
              {saved ? (
                <div className="flex items-center justify-center gap-2 py-4">
                  <Check size={16} style={{ color: '#10b981' }} />
                  <span className="font-terminal text-sm" style={{ color: '#10b981' }}>Taak aangemaakt!</span>
                </div>
              ) : (
                <>
                  <div>
                    <label className="font-terminal block mb-1.5" style={{ fontSize: 10, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                      Taaknaam
                    </label>
                    <input
                      ref={inputRef}
                      type="text"
                      value={taskTitle}
                      onChange={e => setTaskTitle(e.target.value)}
                      placeholder="Beschrijf de taak…"
                      className="w-full bg-transparent outline-none font-terminal text-sm px-3 py-2 rounded-lg"
                      style={{ color: '#f1f5f9', border: '1px solid rgba(0,212,255,0.2)', background: 'rgba(0,212,255,0.03)' }}
                    />
                  </div>

                  <div>
                    <label className="font-terminal block mb-1.5" style={{ fontSize: 10, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                      Prioriteit
                    </label>
                    <div className="flex gap-2">
                      {([1, 2, 3] as const).map(p => (
                        <button
                          key={p}
                          onClick={() => setTaskPriority(p)}
                          className="flex-1 py-1.5 rounded font-terminal text-xs"
                          style={{
                            background: taskPriority === p ? 'rgba(0,212,255,0.12)' : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${taskPriority === p ? 'rgba(0,212,255,0.3)' : 'rgba(0,212,255,0.08)'}`,
                            color: taskPriority === p ? '#00d4ff' : '#475569',
                            cursor: 'pointer',
                          }}
                        >
                          {p === 1 ? '🔴 Hoog' : p === 2 ? '🟡 Midden' : '🟢 Laag'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={createTask}
                    disabled={!taskTitle.trim() || saving}
                    className="w-full py-2.5 rounded-lg font-terminal text-sm flex items-center justify-center gap-2"
                    style={{
                      background: taskTitle.trim() ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${taskTitle.trim() ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.06)'}`,
                      color: taskTitle.trim() ? '#10b981' : '#334155',
                      cursor: taskTitle.trim() ? 'pointer' : 'default',
                    }}
                  >
                    {saving ? 'Opslaan…' : <><Plus size={13} /> Taak aanmaken</>}
                  </button>
                </>
              )}
            </div>

            <div className="flex items-center justify-between px-4 py-2" style={{ borderTop: '1px solid rgba(0,212,255,0.06)' }}>
              <span className="font-terminal" style={{ fontSize: 10, color: '#334155' }}>↵ opslaan</span>
              <span className="font-terminal" style={{ fontSize: 10, color: '#334155' }}>ESC annuleren</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
