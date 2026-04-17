'use client'

import { useEffect, useState } from 'react'
import { Target, Pencil, Check } from 'lucide-react'

interface Props {
  todayTotal: number
}

export function BudgetTracker({ todayTotal }: Props) {
  const [budget, setBudget] = useState<number | null>(null)
  const [editing, setEditing] = useState(false)
  const [input, setInput] = useState('')

  useEffect(() => {
    const stored = localStorage.getItem('mc-daily-budget')
    if (stored) setBudget(parseFloat(stored))
  }, [])

  const saveBudget = () => {
    const val = parseFloat(input)
    if (!isNaN(val) && val > 0) {
      setBudget(val)
      localStorage.setItem('mc-daily-budget', String(val))
    }
    setEditing(false)
  }

  const pct = budget ? Math.min((todayTotal / budget) * 100, 100) : 0
  const overBudget = budget ? todayTotal > budget : false
  const nearLimit = budget ? pct >= 80 && !overBudget : false

  const barColor = overBudget ? '#ef4444' : nearLimit ? '#f59e0b' : '#10b981'

  if (!budget && !editing) {
    return (
      <button
        onClick={() => { setEditing(true); setInput('') }}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg font-terminal text-xs"
        style={{ background: 'rgba(0,212,255,0.04)', border: '1px dashed rgba(0,212,255,0.15)', color: '#334155', cursor: 'pointer' }}
      >
        <Target size={11} style={{ color: '#00d4ff' }} />
        Dagelijks budget instellen…
      </button>
    )
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <Target size={11} style={{ color: '#00d4ff', flexShrink: 0 }} />
        <span className="font-terminal text-xs" style={{ color: '#475569' }}>$</span>
        <input
          autoFocus
          type="number"
          step="0.5"
          min="0"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') saveBudget(); if (e.key === 'Escape') setEditing(false) }}
          placeholder="bijv. 5.00"
          className="flex-1 bg-transparent outline-none font-terminal text-xs"
          style={{ color: '#f1f5f9', border: 'none', minWidth: 0 }}
        />
        <button onClick={saveBudget} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#10b981' }}>
          <Check size={13} />
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-terminal text-xs" style={{ color: '#475569' }}>
          <Target size={10} style={{ color: barColor }} />
          Budget vandaag
        </div>
        <div className="flex items-center gap-2">
          <span className="font-terminal text-xs" style={{ color: overBudget ? '#ef4444' : nearLimit ? '#f59e0b' : '#f1f5f9' }}>
            ${todayTotal.toFixed(3)} / ${budget!.toFixed(2)}
          </span>
          <button
            onClick={() => { setEditing(true); setInput(String(budget)) }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#334155', padding: 0 }}
          >
            <Pencil size={10} />
          </button>
        </div>
      </div>
      <div className="w-full rounded-full" style={{ height: 4, background: 'rgba(255,255,255,0.06)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: barColor, boxShadow: overBudget ? `0 0 6px ${barColor}` : 'none' }}
        />
      </div>
      {overBudget && (
        <p className="font-terminal" style={{ fontSize: 10, color: '#ef4444' }}>
          Budget overschreden met ${(todayTotal - budget!).toFixed(3)}
        </p>
      )}
    </div>
  )
}
