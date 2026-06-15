'use client'

import { useState, useEffect, useCallback } from 'react'
import { Settings, X, Eye, EyeOff, GripVertical } from 'lucide-react'

type Section = { id: string; label: string; defaultVisible: boolean }

const SECTIONS: Section[] = [
  { id: 'ws-weather',  label: 'Weer & Nieuws',        defaultVisible: true },
  { id: 'ws-bento1',  label: 'Agents / Feed / Git',   defaultVisible: true },
  { id: 'ws-bento2',  label: 'Taken & Kosten',        defaultVisible: true },
  { id: 'ws-bento3',  label: 'Notities / Agenda / Doelen', defaultVisible: true },
  { id: 'ws-helix',   label: 'Helix Studio metrics',  defaultVisible: true },
  { id: 'ws-alerts',  label: 'Alert Rules',           defaultVisible: true },
  { id: 'ws-week',    label: 'Weekoverzicht & Streak', defaultVisible: true },
  { id: 'ws-heatmap', label: 'Productiviteitsheatmap', defaultVisible: true },
  { id: 'ws-pipeline','label': 'Pipeline',            defaultVisible: true },
]

const STORAGE_KEY = 'mc-dashboard-sections'

function loadPrefs(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

function savePrefs(prefs: Record<string, boolean>) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs)) } catch { /* ignore */ }
}

function applyVisibility(id: string, visible: boolean) {
  const el = document.getElementById(id)
  if (el) el.style.display = visible ? '' : 'none'
}

export function DashboardCustomizer() {
  const [open, setOpen]   = useState(false)
  const [prefs, setPrefs] = useState<Record<string, boolean>>({})
  const [mounted, setMounted] = useState(false)

  // Apply all visibility on mount + on prefs change
  const applyAll = useCallback((p: Record<string, boolean>) => {
    SECTIONS.forEach(s => {
      const visible = p[s.id] !== undefined ? p[s.id] : s.defaultVisible
      applyVisibility(s.id, visible)
    })
  }, [])

  useEffect(() => {
    const saved = loadPrefs()
    setPrefs(saved)
    applyAll(saved)
    setMounted(true)
  }, [applyAll])

  const toggle = (id: string) => {
    const current = prefs[id] !== undefined
      ? prefs[id]
      : SECTIONS.find(s => s.id === id)?.defaultVisible ?? true
    const next = !current
    const updated = { ...prefs, [id]: next }
    setPrefs(updated)
    savePrefs(updated)
    applyVisibility(id, next)
  }

  const resetAll = () => {
    setPrefs({})
    savePrefs({})
    SECTIONS.forEach(s => applyVisibility(s.id, s.defaultVisible))
  }

  if (!mounted) return null

  const hiddenCount = SECTIONS.filter(s => {
    const v = prefs[s.id] !== undefined ? prefs[s.id] : s.defaultVisible
    return !v
  }).length

  return (
    <>
      {/* Floating trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        title="Dashboard aanpassen"
        style={{
          position: 'fixed',
          bottom: 24,
          left: 24,
          zIndex: 8000,
          width: 40,
          height: 40,
          borderRadius: 10,
          background: open ? 'rgba(0,212,255,0.15)' : 'rgba(7,7,15,0.9)',
          border: `1px solid ${open ? 'rgba(0,212,255,0.4)' : 'rgba(0,212,255,0.12)'}`,
          color: '#00d4ff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(12px)',
          boxShadow: open ? '0 0 20px rgba(0,212,255,0.2)' : 'none',
          transition: 'all 0.2s ease',
        }}
      >
        <Settings size={15} style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.3s ease' }} />
        {hiddenCount > 0 && (
          <span style={{
            position: 'absolute',
            top: -5, right: -5,
            width: 16, height: 16,
            borderRadius: '50%',
            background: '#f59e0b',
            color: '#07070f',
            fontSize: 9,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'monospace',
          }}>
            {hiddenCount}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div style={{
          position: 'fixed',
          bottom: 72,
          left: 24,
          zIndex: 8001,
          width: 260,
          background: 'rgba(4,4,12,0.97)',
          border: '1px solid rgba(0,212,255,0.2)',
          borderRadius: 10,
          backdropFilter: 'blur(24px)',
          boxShadow: '0 0 40px rgba(0,0,0,0.6), 0 0 20px rgba(0,212,255,0.08)',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 14px 10px',
            borderBottom: '1px solid rgba(0,212,255,0.08)',
          }}>
            <div className="flex items-center gap-2">
              <Settings size={11} style={{ color: '#00d4ff' }} />
              <span className="font-terminal" style={{ fontSize: 10, color: '#00d4ff', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Dashboard indeling</span>
            </div>
            <button onClick={() => setOpen(false)} style={{ color: '#475569', cursor: 'pointer', background: 'none', border: 'none' }}>
              <X size={13} />
            </button>
          </div>

          {/* Sections list */}
          <div style={{ padding: '8px 6px' }}>
            {SECTIONS.map(s => {
              const visible = prefs[s.id] !== undefined ? prefs[s.id] : s.defaultVisible
              return (
                <button
                  key={s.id}
                  onClick={() => toggle(s.id)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 10px',
                    borderRadius: 6,
                    background: visible ? 'rgba(0,212,255,0.04)' : 'rgba(255,255,255,0.01)',
                    border: '1px solid transparent',
                    cursor: 'pointer',
                    marginBottom: 2,
                    textAlign: 'left',
                    transition: 'background 0.15s',
                  }}
                >
                  <GripVertical size={10} style={{ color: '#334155', flexShrink: 0 }} />
                  <span className="font-terminal flex-1" style={{ fontSize: 11, color: visible ? '#cbd5e1' : '#475569' }}>
                    {s.label}
                  </span>
                  {visible
                    ? <Eye size={11} style={{ color: '#00d4ff', flexShrink: 0 }} />
                    : <EyeOff size={11} style={{ color: '#334155', flexShrink: 0 }} />
                  }
                </button>
              )
            })}
          </div>

          {/* Reset */}
          {hiddenCount > 0 && (
            <div style={{ padding: '4px 10px 10px' }}>
              <button
                onClick={resetAll}
                style={{
                  width: '100%', padding: '6px', borderRadius: 6,
                  background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)',
                  color: '#f59e0b', cursor: 'pointer', fontFamily: 'monospace', fontSize: 10,
                  letterSpacing: '0.08em',
                }}
              >
                Alles tonen ({hiddenCount} verborgen)
              </button>
            </div>
          )}

          <div style={{ padding: '0 10px 8px' }}>
            <p className="font-terminal" style={{ fontSize: 8, color: '#1e293b', textAlign: 'center', letterSpacing: '0.05em' }}>
              Instellingen opgeslagen in browser
            </p>
          </div>
        </div>
      )}
    </>
  )
}
