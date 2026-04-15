'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

type Props = {
  dailyData: { date: string; cost: number }[]
}

export function CostsChart({ dailyData }: Props) {
  return (
    <div className="hud-card p-4">
      <div className="hud-corners-bottom" />
      <h3 className="hud-label mb-4">Dagelijkse kosten (14 dagen)</h3>
      <div style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dailyData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,212,255,0.06)" />
            <XAxis
              dataKey="date"
              tick={{ fill: '#475569', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
              axisLine={{ stroke: 'rgba(0,212,255,0.1)' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#475569', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
              axisLine={{ stroke: 'rgba(0,212,255,0.1)' }}
              tickLine={false}
              tickFormatter={v => `$${v}`}
            />
            <Tooltip
              contentStyle={{
                background: '#0d0d1a',
                border: '1px solid rgba(0,212,255,0.2)',
                borderRadius: 8,
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 11,
                color: '#cbd5e1',
              }}
              formatter={(value) => [`$${Number(value).toFixed(4)}`, 'Kosten']}
              cursor={{ fill: 'rgba(0,212,255,0.05)' }}
            />
            <Bar dataKey="cost" fill="#00d4ff" fillOpacity={0.8} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
