'use client'

import { useCallback, useEffect, useState } from 'react'
import { Target, Plus, Check, Pause, Trash2, Calendar, X } from 'lucide-react'
import type { Goal } from '@/lib/supabase'

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const HEADERS = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' }

async function sbFetch(path: string) {
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } })
  if (!r.ok) return []
  return r.json()
}

const STATUS_LABEL: Record<Goal['status'], string> = { active: 'Actief', completed: 'Voltooid', paused: 'Gepauzeerd' }
const STATUS_COLOR: Record<Goal['status'], string> = { active: '#00d4ff', completed: '#10b981', paused: '#f59e0b' }
const STATUS_LIST: Goal['status'][] = ['active', 'completed', 'paused']

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="w-full h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${value}%`, background: `linear-gradient(90deg, ${color}70, ${color})`, boxShadow: value > 0 ? `0 0 8px ${color}40` : 'none' }}
      />
    </div>
  )
}

export default function DoelenPage() {
  const [goals, setGoals]     = useState<Goal[]>([])
  const [filter, setFilter]   = useState<Goal['status'] | 'all'>('all')
  const [adding, setAdding]   = useState(false)
  const [saving, setSaving]   = useState(false)
  const [form, setForm]       = useState({ title: '', description: '', project: '', target_date: '' })
  const [editId, setEditId]   = useState<string | null>(null)
  const [editProg, setEditProg] = useState(0)

  const load = useCallback(async () => {
    const data = await sbFetch('goals?select=*&order=created_at.asc')
    setGoals(data)
  }, [])

  useEffect(() => { load() }, [load])

  const addGoal = async () => {
    if (!form.title.trim() || saving) return
    setSaving(true)
    try {
      await fetch(`${SB_URL}/rest/v1/goals`, {
        method: 'POST',
        headers: { ...HEADERS, Prefer: 'return=minimal' },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim() || null,
          project: form.project.trim() || null,
          target_date: form.target_date || null,
          status: 'active',
          progress: 0,
        }),
      })
      setForm({ title: '', description: '', project: '', target_date: '' })
      setAdding(false)
      await load()
    } finally {
      setSaving(false)
    }
  }

  const updateProgress = async (id: string, progress: number) => {
    await fetch(`${SB_URL}/rest/v1/goals?id=eq.${id}`, {
      method: 'PATCH',
      headers: HEADERS,
      body: JSON.stringify({ progress, status: progress >= 100 ? 'completed' : 'active', updated_at: new Date().toISOString() }),
    })
    setGoals(prev => prev.map(g => g.id === id ? { ...g, progress, status: progress >= 100 ? 'completed' : 'active' } : g))
    setEditId(null)
  }

  const updateStatus = async (id: string, status: Goal['status']) => {
    await fetch(`${SB_URL}/rest/v1/goals?id=eq.${id}`, {
      method: 'PATCH',
      headers: HEADERS,
      body: JSON.stringify({ status, updated_at: new Date().toISOString() }),
    })
    setGoals(prev => prev.map(g => g.id === id ? { ...g, status } : g))
  }

  const deleteGoal = async (id: string) => {
    await fetch(`${SB_URL}/rest/v1/goals?id=eq.${id}`, { method: 'DELETE', headers: HEADERS })
    setGoals(prev => prev.filter(g => g.id !== id))
  }

  const filtered = filter === 'all' ? goals : goals.filter(g => g.status === filter)
  const counts = { all: goals.length, active: goals.filter(g => g.status === 'active').length, completed: goals.filter(g => g.status === 'completed').length, paused: goals.filter(g => g.status === 'paused').length }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold font-terminal glow-text" style={{ color: '#f1f5f9' }}>Doelen & OKR</h1>
          <p className="font-terminal text-xs mt-1" style={{ color: '#475569' }}>
            {counts.active} actief · {counts.completed} voltooid · {counts.paused} gepauzeerd
          </p>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg font-terminal text-xs"
          style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.25)', color: '#00d4ff', cursor: 'pointer' }}
        >
          <Plus size={13} /> Nieuw doel
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {(['all', ...STATUS_LIST] as const).map(s => {
          const active = filter === s
          const color = s === 'all' ? '#94a3b8' : STATUS_COLOR[s]
          return (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className="px-3 py-1 rounded-lg font-terminal text-xs"
              style={{
                background: active ? `${color}15` : 'rgba(255,255,255,0.02)',
                border: `1px solid ${active ? `${color}35` : 'rgba(255,255,255,0.06)'}`,
                color: active ? color : '#475569',
                cursor: 'pointer',
              }}
            >
              {s === 'all' ? 'Alles' : STATUS_LABEL[s]} ({s === 'all' ? counts.all : counts[s]})
            </button>
          )
        })}
      </div>

      {/* Add form */}
      {adding && (
        <div className="hud-card p-4 space-y-3">
          <div className="hud-corners-bottom" />
          <div className="flex items-center justify-between mb-1">
            <span className="font-terminal text-xs font-bold" style={{ color: '#00d4ff' }}>Nieuw doel</span>
            <button onClick={() => setAdding(false)} style={{ color: '#475569', cursor: 'pointer' }}><X size={14} /></button>
          </div>
          <input
            autoFocus
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="Titel van het doel…"
            className="w-full bg-transparent font-terminal text-sm px-3 py-2 rounded-lg outline-none"
            style={{ color: '#f1f5f9', border: '1px solid rgba(0,212,255,0.2)', background: 'rgba(0,212,255,0.03)' }}
          />
          <textarea
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Beschrijving of key results (optioneel)…"
            rows={2}
            className="w-full bg-transparent font-terminal text-xs px-3 py-2 rounded-lg outline-none resize-none"
            style={{ color: '#94a3b8', border: '1px solid rgba(0,212,255,0.1)', background: 'rgba(0,212,255,0.02)' }}
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              value={form.project}
              onChange={e => setForm(f => ({ ...f, project: e.target.value }))}
              placeholder="Project (optioneel)"
              className="bg-transparent font-terminal text-xs px-3 py-2 rounded-lg outline-none"
              style={{ color: '#94a3b8', border: '1px solid rgba(0,212,255,0.1)', background: 'rgba(0,212,255,0.02)' }}
            />
            <input
              type="date"
              value={form.target_date}
              onChange={e => setForm(f => ({ ...f, target_date: e.target.value }))}
              className="bg-transparent font-terminal text-xs px-3 py-2 rounded-lg outline-none"
              style={{ color: '#94a3b8', border: '1px solid rgba(0,212,255,0.1)', background: 'rgba(0,212,255,0.02)', colorScheme: 'dark' }}
            />
          </div>
          <button
            onClick={addGoal}
            disabled={!form.title.trim() || saving}
            className="w-full py-2 rounded-lg font-terminal text-sm"
            style={{ background: form.title.trim() ? 'rgba(0,212,255,0.12)' : 'rgba(255,255,255,0.03)', border: `1px solid ${form.title.trim() ? 'rgba(0,212,255,0.3)' : 'rgba(255,255,255,0.06)'}`, color: form.title.trim() ? '#00d4ff' : '#334155', cursor: form.title.trim() ? 'pointer' : 'default' }}
          >
            {saving ? 'Opslaan…' : 'Doel aanmaken'}
          </button>
        </div>
      )}

      {/* Goals list */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="hud-card p-8 text-center">
            <Target size={24} className="mx-auto mb-3" style={{ color: '#1e293b' }} />
            <p className="font-terminal text-sm" style={{ color: '#334155' }}>Geen doelen gevonden</p>
          </div>
        )}
        {filtered.map(goal => {
          const color = STATUS_COLOR[goal.status]
          const daysLeft = goal.target_date
            ? Math.ceil((new Date(goal.target_date).getTime() - Date.now()) / 86400000)
            : null
          const isEditing = editId === goal.id

          return (
            <div key={goal.id} className="hud-card p-4" style={{ borderLeft: `3px solid ${color}30` }}>
              <div className="hud-corners-bottom" />

              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  {/* Title + status */}
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-terminal text-sm font-bold" style={{ color: '#f1f5f9' }}>{goal.title}</h3>
                    <span className="font-terminal text-xs px-1.5 py-0.5 rounded" style={{ background: `${color}15`, color, border: `1px solid ${color}25`, fontSize: 9 }}>
                      {STATUS_LABEL[goal.status]}
                    </span>
                    {goal.project && (
                      <span className="font-terminal text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.04)', color: '#475569', fontSize: 9 }}>
                        {goal.project}
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  {goal.description && (
                    <p className="font-terminal text-xs mb-2 whitespace-pre-line" style={{ color: '#64748b' }}>{goal.description}</p>
                  )}

                  {/* Progress */}
                  <div className="space-y-1.5 mb-2">
                    <div className="flex items-center justify-between">
                      <span className="font-terminal" style={{ fontSize: 10, color: '#475569' }}>Voortgang</span>
                      <span className="font-terminal font-bold" style={{ fontSize: 11, color }}>{goal.progress}%</span>
                    </div>
                    <ProgressBar value={goal.progress} color={color} />
                  </div>

                  {/* Edit progress slider */}
                  {isEditing && (
                    <div className="mt-2 space-y-2">
                      <input
                        type="range" min={0} max={100} step={5}
                        value={editProg}
                        onChange={e => setEditProg(Number(e.target.value))}
                        className="w-full"
                        style={{ accentColor: color }}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateProgress(goal.id, editProg)}
                          className="flex-1 py-1 rounded font-terminal text-xs"
                          style={{ background: `${color}15`, border: `1px solid ${color}30`, color, cursor: 'pointer' }}
                        >
                          Sla {editProg}% op
                        </button>
                        <button onClick={() => setEditId(null)} className="px-3 py-1 rounded font-terminal text-xs" style={{ background: 'rgba(255,255,255,0.04)', color: '#475569', cursor: 'pointer' }}>
                          Annuleer
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Target date */}
                  {goal.target_date && (
                    <div className="flex items-center gap-1 mt-1">
                      <Calendar size={10} style={{ color: daysLeft !== null && daysLeft < 7 ? '#ef4444' : '#334155' }} />
                      <span className="font-terminal" style={{ fontSize: 9, color: daysLeft !== null && daysLeft < 7 ? '#ef4444' : '#334155' }}>
                        {new Date(goal.target_date).toLocaleDateString('nl-NL')}
                        {daysLeft !== null && ` · ${daysLeft > 0 ? `${daysLeft}d over` : daysLeft === 0 ? 'vandaag' : `${Math.abs(daysLeft)}d verlopen`}`}
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-1.5 shrink-0">
                  <button
                    onClick={() => { setEditId(isEditing ? null : goal.id); setEditProg(goal.progress) }}
                    title="Voortgang bijwerken"
                    className="w-7 h-7 rounded flex items-center justify-center"
                    style={{ background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.15)', color: '#00d4ff', cursor: 'pointer' }}
                  >
                    <Target size={11} />
                  </button>
                  {goal.status === 'active' && (
                    <button
                      onClick={() => updateStatus(goal.id, 'completed')}
                      title="Markeer als voltooid"
                      className="w-7 h-7 rounded flex items-center justify-center"
                      style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', color: '#10b981', cursor: 'pointer' }}
                    >
                      <Check size={11} />
                    </button>
                  )}
                  {goal.status !== 'paused' && goal.status !== 'completed' && (
                    <button
                      onClick={() => updateStatus(goal.id, 'paused')}
                      title="Pauzeer"
                      className="w-7 h-7 rounded flex items-center justify-center"
                      style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', color: '#f59e0b', cursor: 'pointer' }}
                    >
                      <Pause size={11} />
                    </button>
                  )}
                  {goal.status === 'paused' && (
                    <button
                      onClick={() => updateStatus(goal.id, 'active')}
                      title="Hervat"
                      className="w-7 h-7 rounded flex items-center justify-center"
                      style={{ background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.15)', color: '#00d4ff', cursor: 'pointer' }}
                    >
                      <Plus size={11} />
                    </button>
                  )}
                  <button
                    onClick={() => deleteGoal(goal.id)}
                    title="Verwijder"
                    className="w-7 h-7 rounded flex items-center justify-center"
                    style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.1)', color: '#ef444460', cursor: 'pointer' }}
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
