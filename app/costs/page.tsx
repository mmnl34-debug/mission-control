export const dynamic = 'force-dynamic'

import { DollarSign, Cpu, TrendingUp, Zap } from 'lucide-react'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale'

const SB_URL = 'https://logkkueavewqmaquuwfw.supabase.co'
const SB_KEY = 'sb_publishable_nqPICLQDoaXGb8hshPIYYg_uv9GRuid'
const SB_HEADERS = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` }

async function getData() {
  const res = await fetch(`${SB_URL}/rest/v1/cost_tracking?select=*&order=recorded_at.desc`, { headers: SB_HEADERS, cache: 'no-store' })
  if (!res.ok) return []
  return res.json()
}

const modelColor: Record<string, string> = {
  'claude-opus-4-6': '#ec4899',
  'claude-sonnet-4-6': '#6366f1',
  'claude-haiku-4-5-20251001': '#10b981',
}

export default async function CostsPage() {
  const records = await getData()

  const totalCost = records.reduce((s: number, r: { cost_usd: number }) => s + Number(r.cost_usd), 0)
  const totalInput = records.reduce((s: number, r: { input_tokens: number }) => s + r.input_tokens, 0)
  const totalOutput = records.reduce((s: number, r: { output_tokens: number }) => s + r.output_tokens, 0)
  const totalCache = records.reduce((s: number, r: { cache_read_tokens: number }) => s + r.cache_read_tokens, 0)

  // Per model stats
  const byModel: Record<string, { cost: number; tokens: number; count: number }> = {}
  for (const r of records as { model: string; cost_usd: number; input_tokens: number; output_tokens: number }[]) {
    if (!byModel[r.model]) byModel[r.model] = { cost: 0, tokens: 0, count: 0 }
    byModel[r.model].cost += Number(r.cost_usd)
    byModel[r.model].tokens += r.input_tokens + r.output_tokens
    byModel[r.model].count++
  }

  // Per agent stats
  const byAgent: Record<string, { cost: number; tokens: number }> = {}
  for (const r of records as { agent_name: string | null; cost_usd: number; input_tokens: number; output_tokens: number }[]) {
    const name = r.agent_name ?? 'onbekend'
    if (!byAgent[name]) byAgent[name] = { cost: 0, tokens: 0 }
    byAgent[name].cost += Number(r.cost_usd)
    byAgent[name].tokens += r.input_tokens + r.output_tokens
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Kosten & tokens</h1>
        <p className="text-sm mt-0.5" style={{ color: '#94a3b8' }}>{records.length} sessies geregistreerd</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Totale kosten', value: `$${totalCost.toFixed(4)}`, icon: DollarSign, color: '#ec4899' },
          { label: 'Input tokens', value: `${(totalInput / 1000).toFixed(1)}K`, icon: Cpu, color: '#6366f1' },
          { label: 'Output tokens', value: `${(totalOutput / 1000).toFixed(1)}K`, icon: TrendingUp, color: '#10b981' },
          { label: 'Cache tokens', value: `${(totalCache / 1000).toFixed(1)}K`, icon: Zap, color: '#f59e0b' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl p-4" style={{ background: '#1a1a26', border: '1px solid #2a2a3d' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs" style={{ color: '#94a3b8' }}>{stat.label}</span>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${stat.color}20` }}>
                <stat.icon size={14} style={{ color: stat.color }} />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Per model */}
        <div className="rounded-xl p-4" style={{ background: '#1a1a26', border: '1px solid #2a2a3d' }}>
          <h2 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
            <Cpu size={14} style={{ color: '#6366f1' }} /> Per model
          </h2>
          <div className="space-y-3">
            {Object.entries(byModel).sort((a, b) => b[1].cost - a[1].cost).map(([model, stats]) => {
              const pct = totalCost > 0 ? (stats.cost / totalCost) * 100 : 0
              const color = modelColor[model] ?? '#94a3b8'
              return (
                <div key={model}>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span style={{ color: '#94a3b8' }}>{model}</span>
                    <span className="font-medium text-white">${stats.cost.toFixed(4)}</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full" style={{ background: '#2a2a3d' }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                  </div>
                  <div className="text-xs mt-1" style={{ color: '#475569' }}>
                    {(stats.tokens / 1000).toFixed(1)}K tokens · {stats.count} sessies
                  </div>
                </div>
              )
            })}
            {Object.keys(byModel).length === 0 && (
              <p className="text-sm text-center py-4" style={{ color: '#475569' }}>Geen data</p>
            )}
          </div>
        </div>

        {/* Per agent */}
        <div className="rounded-xl p-4" style={{ background: '#1a1a26', border: '1px solid #2a2a3d' }}>
          <h2 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
            <TrendingUp size={14} style={{ color: '#6366f1' }} /> Per agent
          </h2>
          <div className="space-y-3">
            {Object.entries(byAgent).sort((a, b) => b[1].cost - a[1].cost).map(([agent, stats]) => {
              const pct = totalCost > 0 ? (stats.cost / totalCost) * 100 : 0
              return (
                <div key={agent}>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span style={{ color: '#94a3b8' }}>{agent}</span>
                    <span className="font-medium text-white">${stats.cost.toFixed(4)}</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full" style={{ background: '#2a2a3d' }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: '#6366f1' }} />
                  </div>
                  <div className="text-xs mt-1" style={{ color: '#475569' }}>
                    {(stats.tokens / 1000).toFixed(1)}K tokens
                  </div>
                </div>
              )
            })}
            {Object.keys(byAgent).length === 0 && (
              <p className="text-sm text-center py-4" style={{ color: '#475569' }}>Geen data</p>
            )}
          </div>
        </div>
      </div>

      {/* Detail table */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #2a2a3d' }}>
        <div className="px-4 py-3" style={{ background: '#1a1a26', borderBottom: '1px solid #2a2a3d' }}>
          <h2 className="text-sm font-medium text-white">Sessiedetails</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: '#13131c', borderBottom: '1px solid #2a2a3d' }}>
                {['Agent', 'Model', 'Input', 'Output', 'Cache', 'Kosten', 'Datum'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left font-medium" style={{ color: '#475569' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map((r: {
                id: string; agent_name: string | null; model: string;
                input_tokens: number; output_tokens: number; cache_read_tokens: number;
                cost_usd: number; recorded_at: string
              }, i: number) => (
                <tr key={r.id} style={{ borderBottom: i < records.length - 1 ? '1px solid #1f1f2e' : 'none', background: '#1a1a26' }}>
                  <td className="px-4 py-2.5 text-white">{r.agent_name ?? '—'}</td>
                  <td className="px-4 py-2.5" style={{ color: modelColor[r.model] ?? '#94a3b8' }}>{r.model}</td>
                  <td className="px-4 py-2.5" style={{ color: '#94a3b8' }}>{(r.input_tokens / 1000).toFixed(1)}K</td>
                  <td className="px-4 py-2.5" style={{ color: '#94a3b8' }}>{(r.output_tokens / 1000).toFixed(1)}K</td>
                  <td className="px-4 py-2.5" style={{ color: '#94a3b8' }}>{(r.cache_read_tokens / 1000).toFixed(1)}K</td>
                  <td className="px-4 py-2.5 font-medium text-white">${Number(r.cost_usd).toFixed(4)}</td>
                  <td className="px-4 py-2.5" style={{ color: '#475569' }}>
                    {format(new Date(r.recorded_at), 'd MMM HH:mm', { locale: nl })}
                  </td>
                </tr>
              ))}
              {records.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm" style={{ color: '#475569' }}>Geen data</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
