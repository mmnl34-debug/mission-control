'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Check } from 'lucide-react'

const SB_URL = 'https://logkkueavewqmaquuwfw.supabase.co'
const SB_KEY = 'sb_publishable_nqPICLQDoaXGb8hshPIYYg_uv9GRuid'
const SB_HEADERS = {
  apikey: SB_KEY,
  Authorization: `Bearer ${SB_KEY}`,
  'Content-Type': 'application/json',
}

const PRESETS = ['#00d4ff', '#f59e0b', '#10b981', '#ec4899', '#a855f7', '#ef4444', '#64748b']

export function NewProjectButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState(PRESETS[0])
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!name.trim() || saving) return
    setSaving(true)
    const res = await fetch(`${SB_URL}/rest/v1/projects`, {
      method: 'POST',
      headers: { ...SB_HEADERS, Prefer: 'return=minimal' },
      body: JSON.stringify({
        name: name.trim(),
        description: description.trim() || null,
        color,
        status: 'active',
      }),
    })
    setSaving(false)
    if (!res.ok) return
    setName(''); setDescription(''); setColor(PRESETS[0]); setOpen(false)
    router.refresh()
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg font-terminal text-xs"
        style={{
          background: 'rgba(0,212,255,0.08)',
          border: '1px solid rgba(0,212,255,0.25)',
          color: '#00d4ff',
          cursor: 'pointer',
        }}
      >
        <Plus size={12} />
        Nieuw project
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 70,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="hud-card"
            style={{
              width: '100%', maxWidth: 440,
              padding: 20,
              background: 'rgba(7,7,15,0.97)',
            }}
          >
            <div className="hud-corners-bottom" />
            <div className="flex items-center justify-between mb-4">
              <span className="hud-label">Nieuw project</span>
              <button
                onClick={() => setOpen(false)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-3">
              <input
                autoFocus
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') save() }}
                placeholder="Projectnaam"
                className="w-full font-terminal text-sm"
                style={{
                  background: 'rgba(0,212,255,0.03)',
                  border: '1px solid rgba(0,212,255,0.15)',
                  borderRadius: 6, padding: '9px 11px', color: '#f1f5f9', outline: 'none',
                }}
              />
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Korte beschrijving (optioneel)"
                rows={3}
                className="w-full font-terminal text-xs"
                style={{
                  background: 'rgba(0,212,255,0.03)',
                  border: '1px solid rgba(0,212,255,0.15)',
                  borderRadius: 6, padding: '9px 11px', color: '#cbd5e1', outline: 'none',
                  resize: 'vertical',
                }}
              />
              <div>
                <div className="font-terminal mb-2" style={{ fontSize: 10, color: '#475569', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                  Kleur
                </div>
                <div className="flex gap-2 flex-wrap">
                  {PRESETS.map(c => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      aria-label={`Kleur ${c}`}
                      style={{
                        width: 28, height: 28, borderRadius: 7,
                        background: c,
                        border: color === c ? '2px solid white' : '2px solid transparent',
                        boxShadow: color === c ? `0 0 10px ${c}80` : 'none',
                        cursor: 'pointer',
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-5">
              <button
                onClick={() => setOpen(false)}
                className="px-3 py-1.5 rounded-md font-terminal text-xs"
                style={{ background: 'transparent', border: '1px solid rgba(100,116,139,0.2)', color: '#64748b', cursor: 'pointer' }}
              >
                Annuleren
              </button>
              <button
                onClick={save}
                disabled={!name.trim() || saving}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md font-terminal text-xs"
                style={{
                  background: name.trim() ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.05)',
                  border: '1px solid rgba(16,185,129,0.3)',
                  color: name.trim() ? '#10b981' : '#475569',
                  cursor: name.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                <Check size={12} />
                {saving ? 'Opslaan…' : 'Aanmaken'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
