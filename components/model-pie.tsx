'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

type ModelData = {
  name: string
  cost: number
  color: string
}

type Props = {
  modelData: ModelData[]
  totalCost: number
}

export function ModelPie({ modelData, totalCost }: Props) {
  return (
    <div className="hud-card p-4">
      <div className="hud-corners-bottom" />
      <h3 className="hud-label mb-4">Per model</h3>
      <div className="flex items-center justify-center" style={{ height: 220 }}>
        {modelData.length > 0 ? (
          <div className="relative" style={{ width: 200, height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={modelData}
                  dataKey="cost"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  strokeWidth={0}
                >
                  {modelData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} fillOpacity={0.85} />
                  ))}
                </Pie>
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
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center text */}
            <div
              className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
            >
              <span className="font-terminal text-lg font-bold" style={{ color: '#f1f5f9' }}>
                ${totalCost.toFixed(2)}
              </span>
              <span className="font-terminal text-xs" style={{ color: '#475569' }}>totaal</span>
            </div>
          </div>
        ) : (
          <p className="font-terminal text-xs" style={{ color: '#334155' }}>Geen data</p>
        )}
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-2 justify-center">
        {modelData.map(m => (
          <div key={m.name} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: m.color }} />
            <span className="font-terminal text-xs" style={{ color: '#94a3b8' }}>
              {m.name.replace('claude-', '').split('-').slice(0, 2).join('-')}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
