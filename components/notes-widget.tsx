'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight, StickyNote, Check } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { nl } from 'date-fns/locale'
import { supabase, type Note } from '@/lib/supabase'

type Props = { initialNotes: Note[] }

export function NotesWidget({ initialNotes }: Props) {
  const [notes, setNotes] = useState<Note[]>(initialNotes)

  useEffect(() => {
    const channel = supabase
      .channel('notes-widget')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notes' }, payload => {
        if (payload.eventType === 'INSERT') {
          setNotes(prev => [payload.new as Note, ...prev].slice(0, 10))
        } else if (payload.eventType === 'UPDATE') {
          setNotes(prev => prev.map(n => n.id === (payload.new as Note).id ? payload.new as Note : n))
        } else if (payload.eventType === 'DELETE') {
          setNotes(prev => prev.filter(n => n.id !== (payload.old as { id: string }).id))
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const unprocessed = notes.filter(n => !n.processed)
  const latest = [...notes].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 4)

  return (
    <div className="hud-card">
      <div className="hud-corners-bottom" />
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{ borderBottom: '1px solid rgba(0,212,255,0.08)' }}
      >
        <div className="flex items-center gap-2">
          <span className="hud-label">Notities</span>
          {unprocessed.length > 0 ? (
            <span
              className="font-terminal text-xs px-1.5 py-0.5 rounded"
              style={{
                background: 'rgba(245,158,11,0.1)',
                color: '#f59e0b',
                fontSize: '10px',
                border: '1px solid rgba(245,158,11,0.2)',
              }}
            >
              {unprocessed.length} onverwerkt
            </span>
          ) : (
            <span
              className="font-terminal text-xs px-1.5 py-0.5 rounded flex items-center gap-1"
              style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', fontSize: '10px' }}
            >
              <Check size={9} /> opgeruimd
            </span>
          )}
        </div>
        <Link
          href="/notes"
          className="flex items-center gap-1 font-terminal text-xs transition-colors"
          style={{ color: '#475569' }}
        >
          View all <ArrowUpRight size={11} />
        </Link>
      </div>
      <div className="p-3 space-y-2">
        {latest.length > 0 ? latest.map(note => (
          <Link
            key={note.id}
            href="/notes"
            className="flex items-start gap-2 py-1.5 group"
            style={{ textDecoration: 'none' }}
          >
            <span
              className="w-2 h-2 rounded-full shrink-0 mt-1.5"
              style={{
                background: note.processed ? '#10b981' : '#f59e0b',
                boxShadow: note.processed ? 'none' : '0 0 6px rgba(245,158,11,0.6)',
              }}
            />
            <div className="min-w-0 flex-1">
              <p
                className="font-terminal text-xs truncate"
                style={{
                  color: note.processed ? '#64748b' : '#cbd5e1',
                  textDecoration: note.processed ? 'line-through' : 'none',
                }}
              >
                {note.title ?? note.content.split('\n')[0].slice(0, 60)}
              </p>
              <p className="font-terminal" style={{ color: '#334155', fontSize: '10px' }}>
                {formatDistanceToNow(new Date(note.created_at), { locale: nl, addSuffix: true })}
                {note.project && <> · {note.project}</>}
              </p>
            </div>
          </Link>
        )) : (
          <div className="flex items-center justify-center py-4">
            <StickyNote size={14} style={{ color: '#334155' }} />
            <span className="font-terminal text-xs ml-2" style={{ color: '#334155' }}>Geen notities</span>
          </div>
        )}
      </div>
    </div>
  )
}
