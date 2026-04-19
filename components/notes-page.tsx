'use client'

import { useMemo, useState } from 'react'
import { StickyNote, Plus, X, Check, Clock, Trash2, Folder } from 'lucide-react'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale'
import type { Note } from '@/lib/supabase'

const SB_URL = 'https://logkkueavewqmaquuwfw.supabase.co'
const SB_KEY = 'sb_publishable_nqPICLQDoaXGb8hshPIYYg_uv9GRuid'
const SB_HEADERS = {
  apikey: SB_KEY,
  Authorization: `Bearer ${SB_KEY}`,
  'Content-Type': 'application/json',
}

interface Props {
  initialNotes: Note[]
  projects: string[]
}

export function NotesPage({ initialNotes, projects }: Props) {
  const [notes, setNotes] = useState<Note[]>(initialNotes)
  const [creating, setCreating] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [project, setProject] = useState<string>('')
  const [filter, setFilter] = useState<'all' | 'unprocessed' | 'processed'>('all')

  const filtered = useMemo(() => {
    if (filter === 'unprocessed') return notes.filter(n => !n.processed)
    if (filter === 'processed') return notes.filter(n => n.processed)
    return notes
  }, [notes, filter])

  async function createNote() {
    if (!content.trim()) return
    const payload = {
      title: title.trim() || null,
      content: content.trim(),
      project: project || null,
    }
    const res = await fetch(`${SB_URL}/rest/v1/notes`, {
      method: 'POST',
      headers: { ...SB_HEADERS, Prefer: 'return=representation' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) return
    const [created] = await res.json()
    setNotes([created, ...notes])
    setTitle(''); setContent(''); setProject(''); setCreating(false)
  }

  async function toggleProcessed(note: Note) {
    const next = !note.processed
    const payload = {
      processed: next,
      processed_at: next ? new Date().toISOString() : null,
    }
    const res = await fetch(`${SB_URL}/rest/v1/notes?id=eq.${note.id}`, {
      method: 'PATCH',
      headers: { ...SB_HEADERS, Prefer: 'return=minimal' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) return
    setNotes(notes.map(n => n.id === note.id ? { ...n, ...payload } : n))
  }

  async function deleteNote(id: string) {
    if (!confirm('Notitie verwijderen?')) return
    const res = await fetch(`${SB_URL}/rest/v1/notes?id=eq.${id}`, {
      method: 'DELETE',
      headers: SB_HEADERS,
    })
    if (!res.ok) return
    setNotes(notes.filter(n => n.id !== id))
  }

  const unprocessedCount = notes.filter(n => !n.processed).length

  return (
    <div className="relative min-h-full">
      <div className="orb-cyan" style={{ top: '-100px', right: '-100px' }} />

      <div className="relative z-10 p-6 space-y-5">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-widest uppercase font-terminal glow-text" style={{ color: '#f1f5f9', letterSpacing: '0.2em' }}>
              Notities
            </h1>
            <p className="font-terminal text-xs tracking-wider mt-1" style={{ color: '#334155' }}>
              {notes.length} totaal · {unprocessedCount} nog te verwerken
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
            Nieuwe notitie
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 flex-wrap">
          {([
            { k: 'all', label: 'Alle', count: notes.length },
            { k: 'unprocessed', label: 'Onverwerkt', count: unprocessedCount },
            { k: 'processed', label: 'Verwerkt', count: notes.length - unprocessedCount },
          ] as const).map(t => {
            const active = filter === t.k
            return (
              <button
                key={t.k}
                onClick={() => setFilter(t.k)}
                className="px-3 py-1.5 rounded-full font-terminal text-xs"
                style={{
                  background: active ? 'rgba(0,212,255,0.14)' : 'rgba(0,212,255,0.03)',
                  border: `1px solid ${active ? 'rgba(0,212,255,0.35)' : 'rgba(0,212,255,0.1)'}`,
                  color: active ? '#00d4ff' : '#64748b',
                  cursor: 'pointer',
                }}
              >
                {t.label} · {t.count}
              </button>
            )
          })}
        </div>

        {/* Create form */}
        {creating && (
          <div className="hud-card p-4 space-y-3">
            <div className="hud-corners-bottom" />
            <div className="flex items-center justify-between">
              <span className="hud-label">Nieuwe notitie</span>
              <button
                onClick={() => { setCreating(false); setTitle(''); setContent(''); setProject('') }}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                <X size={14} />
              </button>
            </div>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Titel (optioneel)"
              className="w-full font-terminal text-sm"
              style={{
                background: 'rgba(0,212,255,0.03)',
                border: '1px solid rgba(0,212,255,0.12)',
                borderRadius: 6, padding: '8px 10px', color: '#f1f5f9', outline: 'none',
              }}
            />
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Schrijf vrij: inzichten, todo's, planning voor morgen, ideeën… Claude verwerkt automatisch bij volgende sessiestart."
              rows={8}
              className="w-full font-terminal text-sm"
              style={{
                background: 'rgba(0,212,255,0.03)',
                border: '1px solid rgba(0,212,255,0.12)',
                borderRadius: 6, padding: '10px', color: '#f1f5f9', outline: 'none',
                resize: 'vertical', minHeight: 140,
              }}
            />
            <div className="flex items-center gap-2 flex-wrap">
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
                onClick={createNote}
                disabled={!content.trim()}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md font-terminal text-xs"
                style={{
                  background: content.trim() ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.05)',
                  border: '1px solid rgba(16,185,129,0.3)',
                  color: content.trim() ? '#10b981' : '#475569',
                  cursor: content.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                <Check size={12} />
                Opslaan
              </button>
            </div>
          </div>
        )}

        {/* Note list */}
        <div className="space-y-3">
          {filtered.map(note => (
            <div
              key={note.id}
              className="hud-card p-4 transition-all"
              style={{
                background: note.processed ? 'rgba(16,185,129,0.02)' : 'rgba(0,212,255,0.02)',
                borderLeft: note.processed ? '2px solid rgba(16,185,129,0.4)' : '2px solid rgba(245,158,11,0.4)',
              }}
            >
              <div className="hud-corners-bottom" />
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  {note.title && (
                    <h3 className="font-terminal text-sm font-semibold mb-1" style={{ color: '#f1f5f9' }}>
                      {note.title}
                    </h3>
                  )}
                  <div className="flex items-center gap-3 font-terminal" style={{ fontSize: 10, color: '#475569' }}>
                    <span className="flex items-center gap-1">
                      <Clock size={10} />
                      {format(new Date(note.created_at), 'd MMM HH:mm', { locale: nl })}
                    </span>
                    {note.project && (
                      <span className="flex items-center gap-1" style={{ color: '#00d4ff' }}>
                        <Folder size={10} />
                        {note.project}
                      </span>
                    )}
                    <span
                      className="px-1.5 py-0.5 rounded font-terminal"
                      style={{
                        fontSize: 9,
                        background: note.processed ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                        color: note.processed ? '#10b981' : '#f59e0b',
                        border: `1px solid ${note.processed ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.25)'}`,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                      }}
                    >
                      {note.processed ? 'verwerkt' : 'onverwerkt'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => toggleProcessed(note)}
                    title={note.processed ? 'Markeer als onverwerkt' : 'Markeer als verwerkt'}
                    style={{
                      background: 'rgba(16,185,129,0.06)',
                      border: '1px solid rgba(16,185,129,0.2)',
                      borderRadius: 5, padding: 5, color: '#10b981', cursor: 'pointer',
                    }}
                  >
                    <Check size={12} />
                  </button>
                  <button
                    onClick={() => deleteNote(note.id)}
                    title="Verwijder"
                    style={{
                      background: 'rgba(239,68,68,0.06)',
                      border: '1px solid rgba(239,68,68,0.2)',
                      borderRadius: 5, padding: 5, color: '#ef4444', cursor: 'pointer',
                    }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
              <pre className="font-terminal text-sm whitespace-pre-wrap break-words" style={{ color: '#cbd5e1', lineHeight: 1.55, margin: 0 }}>
                {note.content}
              </pre>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16" style={{ color: '#334155' }}>
              <StickyNote size={32} className="mb-3 opacity-30" />
              <p className="font-terminal text-sm">Geen notities in dit filter</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
