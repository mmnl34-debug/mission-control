'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Bot,
  Radio,
  ListTodo,
  FolderKanban,
  DollarSign,
  Mic,
  Command,
} from 'lucide-react'

type CommandEntry = {
  label: string
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>
  action: 'navigate' | 'jarvis'
  href?: string
}

const COMMANDS: CommandEntry[] = [
  { label: 'Dashboard', icon: LayoutDashboard, action: 'navigate', href: '/' },
  { label: 'Agents', icon: Bot, action: 'navigate', href: '/agents' },
  { label: 'Live Feed', icon: Radio, action: 'navigate', href: '/feed' },
  { label: 'Taken', icon: ListTodo, action: 'navigate', href: '/tasks' },
  { label: 'Projecten', icon: FolderKanban, action: 'navigate', href: '/projects' },
  { label: 'Kosten', icon: DollarSign, action: 'navigate', href: '/costs' },
  { label: 'JARVIS activeren', icon: Mic, action: 'jarvis' },
]

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const filtered = COMMANDS.filter((c) =>
    c.label.toLowerCase().includes(query.toLowerCase())
  )

  const handleOpen = useCallback(() => {
    setOpen(true)
    setQuery('')
    setActiveIndex(0)
  }, [])

  const handleClose = useCallback(() => {
    setOpen(false)
    setQuery('')
    setActiveIndex(0)
  }, [])

  const runCommand = useCallback(
    (cmd: CommandEntry) => {
      handleClose()
      if (cmd.action === 'navigate' && cmd.href) {
        router.push(cmd.href)
      } else if (cmd.action === 'jarvis') {
        window.dispatchEvent(new CustomEvent('jarvis-activate'))
      }
    },
    [handleClose, router]
  )

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        if (open) {
          handleClose()
        } else {
          handleOpen()
        }
      }
      if (e.key === 'Escape' && open) {
        handleClose()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, handleOpen, handleClose])

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 10)
    }
  }, [open])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filtered[activeIndex]) {
        runCommand(filtered[activeIndex])
      }
    }
  }

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-start justify-center pt-[15vh]"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
      onClick={handleClose}
    >
      <div
        className="w-full max-w-lg mx-4 rounded-lg overflow-hidden"
        style={{
          background: 'rgba(7,7,15,0.97)',
          border: '1px solid rgba(0,212,255,0.25)',
          boxShadow: '0 0 60px rgba(0,212,255,0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search bar */}
        <div
          className="flex items-center gap-3 px-4 py-3"
          style={{ borderBottom: '1px solid rgba(0,212,255,0.1)' }}
        >
          <Command size={14} style={{ color: '#00d4ff', flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Zoek commando..."
            className="flex-1 bg-transparent outline-none font-terminal text-sm"
            style={{ color: '#f1f5f9' }}
          />
          <span
            className="font-terminal shrink-0"
            style={{ color: '#334155', fontSize: '10px' }}
          >
            ESC
          </span>
        </div>

        {/* Commands list */}
        <div className="py-1" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {filtered.length === 0 && (
            <div className="px-4 py-4 font-terminal text-xs text-center" style={{ color: '#475569' }}>
              Geen resultaten
            </div>
          )}
          {filtered.map((cmd, i) => {
            const Icon = cmd.icon
            const isActive = i === activeIndex
            return (
              <button
                key={cmd.label}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                style={{
                  background: isActive ? 'rgba(0,212,255,0.08)' : 'transparent',
                  borderLeft: isActive ? '2px solid #00d4ff' : '2px solid transparent',
                }}
                onClick={() => runCommand(cmd)}
                onMouseEnter={() => setActiveIndex(i)}
              >
                <Icon
                  size={14}
                  style={{ color: isActive ? '#00d4ff' : '#475569', flexShrink: 0 }}
                />
                <span
                  className="font-terminal text-sm"
                  style={{ color: isActive ? '#f1f5f9' : '#94a3b8' }}
                >
                  {cmd.label}
                </span>
              </button>
            )
          })}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-4 py-2"
          style={{ borderTop: '1px solid rgba(0,212,255,0.06)' }}
        >
          <div className="flex items-center gap-3 font-terminal" style={{ color: '#334155', fontSize: '10px' }}>
            <span>↑↓ navigeren</span>
            <span>↵ uitvoeren</span>
          </div>
          <div
            className="flex items-center gap-1 font-terminal"
            style={{ color: '#334155', fontSize: '10px' }}
          >
            <kbd
              className="px-1.5 py-0.5 rounded"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              ⌘K
            </kbd>
          </div>
        </div>
      </div>
    </div>
  )
}
