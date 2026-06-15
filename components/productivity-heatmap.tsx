'use client'

import { useEffect, useState } from 'react'
import { Activity } from 'lucide-react'

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

type DayCell = { date: string; count: number; level: 0 | 1 | 2 | 3 | 4 }

const LEVEL_COLOR: Record<number, string> = {
  0: 'rgba(0,212,255,0.04)',
  1: 'rgba(0,212,255,0.18)',
  2: 'rgba(0,212,255,0.40)',
  3: 'rgba(0,212,255,0.65)',
  4: 'rgba(0,212,255,0.90)',
}

const DAY_LABELS = ['ma', '', 'wo', '', 'vr', '', 'zo']
const MONTH_LABELS = ['jan','feb','mrt','apr','mei','jun','jul','aug','sep','okt','nov','dec']

function toLevel(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count === 0) return 0
  if (count <= 2) return 1
  if (count <= 5) return 2
  if (count <= 10) return 3
  return 4
}

export function ProductivityHeatmap() {
  const [cells, setCells]   = useState<DayCell[][]>([])
  const [total, setTotal]   = useState(0)
  const [loading, setLoading] = useState(true)
  const [hovered, setHovered] = useState<DayCell | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(
          `${SB_URL}/rest/v1/agent_sessions?select=last_seen_at`,
          { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } }
        )
        if (!res.ok) return
        const data: { last_seen_at: string }[] = await res.json()

        // Count sessions per date
        const map: Record<string, number> = {}
        for (const s of data) {
          const d = s.last_seen_at.slice(0, 10)
          map[d] = (map[d] ?? 0) + 1
        }

        // Build 52-week grid (ending today), weeks as columns
        const today = new Date()
        // Align to Sunday as end
        const endDay = new Date(today)
        endDay.setDate(endDay.getDate() + (6 - today.getDay())) // end on Saturday

        // Build columns (weeks) left-to-right, oldest first
        const weeks: DayCell[][] = []
        const totalDays = 52 * 7
        const start = new Date(endDay)
        start.setDate(start.getDate() - totalDays + 1)

        // Align start to Monday
        const dayOfWeek = (start.getDay() + 6) % 7 // 0=Mon
        start.setDate(start.getDate() - dayOfWeek)

        for (let w = 0; w < 53; w++) {
          const week: DayCell[] = []
          for (let d = 0; d < 7; d++) {
            const cur = new Date(start)
            cur.setDate(cur.getDate() + w * 7 + d)
            const dateStr = cur.toISOString().slice(0, 10)
            const count = map[dateStr] ?? 0
            week.push({ date: dateStr, count, level: toLevel(count) })
          }
          weeks.push(week)
        }

        const t = Object.values(map).reduce((a, b) => a + b, 0)
        setCells(weeks)
        setTotal(t)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Month label positions
  const monthPositions: { label: string; col: number }[] = []
  if (cells.length > 0) {
    let lastMonth = -1
    cells.forEach((week, i) => {
      const m = new Date(week[0].date).getMonth()
      if (m !== lastMonth) {
        monthPositions.push({ label: MONTH_LABELS[m], col: i })
        lastMonth = m
      }
    })
  }

  return (
    <div className="hud-card">
      <div className="hud-corners-bottom" />
      <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: '1px solid rgba(0,212,255,0.08)' }}>
        <div className="flex items-center gap-2">
          <Activity size={12} style={{ color: '#00d4ff' }} />
          <span className="hud-label">Productiviteitsheatmap</span>
        </div>
        <span className="font-terminal text-xs" style={{ color: '#475569' }}>
          {total} sessies · 52 weken
        </span>
      </div>

      <div className="p-3">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <span className="font-terminal text-xs" style={{ color: '#334155' }}>Laden…</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div style={{ minWidth: 680, position: 'relative' }}>
              {/* Month labels */}
              <div style={{ display: 'flex', marginLeft: 28, marginBottom: 4, position: 'relative', height: 14 }}>
                {monthPositions.map(({ label, col }) => (
                  <span
                    key={`${label}-${col}`}
                    className="font-terminal absolute"
                    style={{ left: col * 13, fontSize: 9, color: '#475569' }}
                  >
                    {label}
                  </span>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 1 }}>
                {/* Day labels */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1, marginRight: 4 }}>
                  {DAY_LABELS.map((l, i) => (
                    <span key={i} className="font-terminal" style={{ fontSize: 9, color: '#334155', height: 11, lineHeight: '11px', width: 16 }}>
                      {l}
                    </span>
                  ))}
                </div>

                {/* Grid */}
                {cells.map((week, wi) => (
                  <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {week.map((cell, di) => (
                      <div
                        key={di}
                        title={`${cell.date}: ${cell.count} sessies`}
                        onMouseEnter={() => setHovered(cell)}
                        onMouseLeave={() => setHovered(null)}
                        style={{
                          width: 11, height: 11,
                          borderRadius: 2,
                          background: LEVEL_COLOR[cell.level],
                          border: `1px solid ${cell.level > 0 ? 'rgba(0,212,255,0.15)' : 'rgba(0,212,255,0.04)'}`,
                          cursor: 'default',
                          transition: 'transform 0.1s',
                          transform: hovered?.date === cell.date ? 'scale(1.3)' : 'scale(1)',
                        }}
                      />
                    ))}
                  </div>
                ))}
              </div>

              {/* Legend */}
              <div className="flex items-center gap-1.5 mt-2 justify-end">
                <span className="font-terminal" style={{ fontSize: 9, color: '#334155' }}>Minder</span>
                {([0, 1, 2, 3, 4] as const).map(l => (
                  <div key={l} style={{ width: 11, height: 11, borderRadius: 2, background: LEVEL_COLOR[l], border: '1px solid rgba(0,212,255,0.1)' }} />
                ))}
                <span className="font-terminal" style={{ fontSize: 9, color: '#334155' }}>Meer</span>
              </div>

              {/* Tooltip */}
              {hovered && hovered.count > 0 && (
                <div className="font-terminal" style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>
                  {hovered.date}: <span style={{ color: '#00d4ff' }}>{hovered.count} sessie{hovered.count !== 1 ? 's' : ''}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
