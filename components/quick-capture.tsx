'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, FileText, ListTodo, Zap } from 'lucide-react'

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const HEADERS = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' }

export function QuickCapture() {
  const [open, setOpen]     = useState(false)
  const [text, setText]     = useState('')
  const [type, setType]     = useState<'note' | 'task'>('note')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)
  const inputRef            = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement)?.tagName
      if (e.altKey && e.key === 'n') {
        if (tag === 'INPUT' || tag === 'TEXTAREA') return
        e.preventDefault()
        setOpen(o => {
          if (!o) { setText(''); setSaved(false) }
          return !o
        })
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 10)
  }, [open])

  const save = async () => {
    if (!text.trim() || saving) return
    setSaving(true)
    try {
      if (type === 'note') {
        await fetch(`${SB_URL}/rest/v1/notes`, {
          method: 'POST',
          headers: { ...HEADERS, Prefer: 'return=minimal' },
          body: JSON.stringify({
            title: text.trim().slice(0, 80),
            content: text.trim(),
            project: 'Mission Control',
            processed: false,
          }),
        })
      } else {
        await fetch(`${SB_URL}/rest/v1/tasks`, {
          method: 'POST',
          headers: { ...HEADERS, Prefer: 'return=minimal' },
          body: JSON.stringify({
            title: text.trim(),
            status: 'todo',
            priority: 2,
            project: 'Mission Control',
          }),
        })
      }
      setSaved(true)
      setTimeout(() => setOpen(false), 700)
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[9996] flex items-start justify-center pt-[18vh]"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-md mx-4 rounded-lg overflow-hidden"
        style={{
          background: 'rgba(7,7,15,0.97)',
          border: '1px solid rgba(0,212,255,0.25)',
          boxShadow: '0 0 40px rgba(0,212,255,0.08)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center gap-3 px-4 py-3"
          style={{ borderBottom: '1px solid rgba(0,212,255,0.1)' }}
        >
          <Zap size={13} style={{ color: '#f59e0b' }} />
          <span className="font-terminal text-sm" style={{ color: '#f1f5f9' }}>Quick Capture</span>

          <div className="ml-auto flex gap-1">
            <button
              onClick={() => setType('note')}
              className="flex items-center gap-1 px-2 py-0.5 rounded font-terminal text-xs"
              style={{
                background: type === 'note' ? 'rgba(0,212,255,0.12)' : 'transparent',
                border: `1px solid ${type === 'note' ? 'rgba(0,212,255,0.3)' : 'rgba(0,212,255,0.08)'}`,
                color: type === 'note' ? '#00d4ff' : '#475569',
                cursor: 'pointer',
              }}
            >
              <FileText size={10} /> Notitie
            </button>
            <button
              onClick={() => setType('task')}
              className="flex items-center gap-1 px-2 py-0.5 rounded font-terminal text-xs"
              style={{
                background: type === 'task' ? 'rgba(16,185,129,0.12)' : 'transparent',
                border: `1px solid ${type === 'task' ? 'rgba(16,185,129,0.3)' : 'rgba(0,212,255,0.08)'}`,
                color: type === 'task' ? '#10b981' : '#475569',
                cursor: 'pointer',
              }}
            >
              <ListTodo size={10} /> Taak
            </button>
          </div>
        </div>

        {/* Input */}
        <div className="p-4">
          {saved ? (
            <div className="flex items-center justify-center gap-2 py-3">
              <Check size={16} style={{ color: '#10b981' }} />
              <span className="font-terminal text-sm" style={{ color: '#10b981' }}>Opgeslagen!</span>
            </div>
          ) : (
            <input
              ref={inputRef}
              type="text"
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); save() } }}
              placeholder={type === 'note' ? 'Notitie typen…' : 'Taaknaam typen…'}
              className="w-full bg-transparent outline-none font-terminal text-sm px-3 py-2 rounded-lg"
              style={{
                color: '#f1f5f9',
                border: '1px solid rgba(0,212,255,0.2)',
                background: 'rgba(0,212,255,0.03)',
              }}
            />
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-4 py-2"
          style={{ borderTop: '1px solid rgba(0,212,255,0.06)' }}
        >
          <span className="font-terminal" style={{ fontSize: 10, color: '#334155' }}>↵ opslaan</span>
          <span className="font-terminal" style={{ fontSize: 10, color: '#334155' }}>ESC sluiten · Alt+N toggle</span>
        </div>
      </div>
    </div>
  )
}
