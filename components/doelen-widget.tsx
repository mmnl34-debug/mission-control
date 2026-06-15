'use client'

import { useState } from 'react'
import { Target, ArrowUpRight } from 'lucide-react'
import Link from 'next/link'
import type { Goal } from '@/lib/supabase'

export function DoelenWidget({ initialGoals }: { initialGoals: Goal[] }) {
  const [goals] = useState<Goal[]>(initialGoals)

  const statusColor = (s: Goal['status']) =>
    s === 'completed' ? '#10b981' : s === 'paused' ? '#f59e0b' : '#00d4ff'

  return (
    <div className="hud-card flex flex-col">
      <div className="hud-corners-bottom" />

      <div
        className="flex items-center justify-between px-3 py-2"
        style={{ borderBottom: '1px solid rgba(0,212,255,0.08)' }}
      >
        <div className="flex items-center gap-2">
          <Target size={12} style={{ color: '#00d4ff' }} />
          <span className="hud-label">Doelen</span>
          {goals.length > 0 && (
            <span className="font-terminal text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(0,212,255,0.1)', color: '#00d4ff', fontSize: 10 }}>
              {goals.length}
            </span>
          )}
        </div>
        <Link
          href="/doelen"
          className="flex items-center gap-1 font-terminal text-xs transition-colors"
          style={{ color: '#475569' }}
        >
          Alles <ArrowUpRight size={11} />
        </Link>
      </div>

      <div className="p-3 flex-1 space-y-3">
        {goals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 gap-2">
            <Target size={20} style={{ color: '#1e293b' }} />
            <Link href="/doelen" className="font-terminal text-xs" style={{ color: '#334155' }}>
              + Eerste doel toevoegen
            </Link>
          </div>
        ) : (
          goals.slice(0, 3).map(goal => {
            const color = statusColor(goal.status)
            const daysLeft = goal.target_date
              ? Math.ceil((new Date(goal.target_date).getTime() - Date.now()) / 86400000)
              : null
            return (
              <div key={goal.id}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-terminal text-xs truncate flex-1 pr-2" style={{ color: '#cbd5e1' }}>
                    {goal.title}
                  </span>
                  <span className="font-terminal shrink-0" style={{ color, fontSize: 10 }}>
                    {goal.progress}%
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${goal.progress}%`,
                      background: `linear-gradient(90deg, ${color}80, ${color})`,
                      boxShadow: goal.progress > 0 ? `0 0 6px ${color}40` : 'none',
                    }}
                  />
                </div>
                {daysLeft !== null && (
                  <span className="font-terminal" style={{ fontSize: 9, color: daysLeft < 7 ? '#ef4444' : '#334155' }}>
                    {daysLeft > 0 ? `${daysLeft}d resterend` : daysLeft === 0 ? 'vandaag' : 'verlopen'}
                  </span>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
