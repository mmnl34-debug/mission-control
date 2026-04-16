export const dynamic = 'force-dynamic'

import { DollarSign, Cpu, TrendingUp, Zap, BarChart3 } from 'lucide-react'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale'
import { CostsChart } from '@/components/costs-chart'
import { ModelPie } from '@/components/model-pie'

const SB_URL = 'https://logkkueavewqmaquuwfw.supabase.co'
const SB_KEY = 'sb_publishable_nqPICLQDoaXGb8hshPIYYg_uv9GRuid'
const SB_HEADERS = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` }

async function getData() {
  const res = await fetch(`${SB_URL}/rest/v1/cost_tracking?select=*&order=recorded_at.desc`, { headers: SB_HEADERS, cache: 'no-store' })
  if (!res.ok) return []
  return res.json()
}

const modelColorMap: Record<string, string> = {
  'claude-opus-4-6': '#ec4899',
  'claude-sonnet-4-6': '#00d4ff',
  'claude-haiku-4-5-20251001': '#10b981',
}

export default async function CostsPage() {
  const records = await getData()

  const totalCost = records.reduce((s: number, r: { cost_usd: number }) => s + Number(r.cost_usd), 0)
  const totalInput = records.reduce((s: number, r: { input_tokens: number }) => s + r.input_tokens, 0)
  const totalOutput = records.reduce((s: number, r: { output_tokens: number }) => s + r.output_tokens, 0)
  const totalCache = records.reduce((s: number, r: { cache_read_tokens: number }) => s + r.cache_read_tokens, 0)
  const totalCacheWrite = records.reduce((s: number, r: { cache_write_tokens: number }) => s + (r.cache_write_tokens ?? 0), 0)

  // Token efficiency metrics
  const totalTokens = totalInput + totalOutput
  const cacheableTokens = totalInput + totalCache + totalCacheWrite
  const cacheHitRate = cacheableTokens > 0 ? (totalCache / cacheableTokens) * 100 : 0
  const tokensPerDollar = totalCost > 0 ? totalTokens / totalCost : 0
  const efficiencyScore = Math.min(100, Math.round(cacheHitRate * 0.6 + Math.min(tokensPerDollar / 50000, 40)))

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

  // Daily data for bar chart (last 14 days)
  const dailyMap: Record<string, number> = {}
  const now = new Date()
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    dailyMap[key] = 0
  }
  for (const r of records as { date: string; cost_usd: number }[]) {
    if (r.date && dailyMap[r.date] !== undefined) {
      dailyMap[r.date] += Number(r.cost_usd)
    }
  }
  const dailyData = Object.entries(dailyMap).map(([date, cost]) => ({
    date: date.slice(5), // MM-DD
    cost: Math.round(cost * 10000) / 10000,
  }))

  // Model data for pie chart
  const modelData = Object.entries(byModel).map(([name, stats]) => ({
    name,
    cost: stats.cost,
    color: modelColorMap[name] ?? '#94a3b8',
  }))

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Kosten & tokens</h1>
        <p className="text-sm mt-0.5" style={{ color: '#94a3b8' }}>{records.length} sessies geregistreerd</p>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CostsChart dailyData={dailyData} />
        <ModelPie modelData={modelData} totalCost={totalCost} />
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Totale kosten', value: `$${totalCost.toFixed(4)}`, icon: DollarSign, color: '#ec4899' },
          { label: 'Input tokens', value: `${(totalInput / 1000).toFixed(1)}K`, icon: Cpu, color: '#00d4ff' },
          { label: 'Output tokens', value: `${(totalOutput / 1000).toFixed(1)}K`, icon: TrendingUp, color: '#10b981' },
          { label: 'Cache tokens', value: `${(totalCache / 1000).toFixed(1)}K`, icon: Zap, color: '#f59e0b' },
        ].map((stat) => (
          <div key={stat.label} className="hud-card p-4">
            <div className="hud-corners-bottom" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-terminal" style={{ color: '#94a3b8' }}>{stat.label}</span>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${stat.color}20` }}>
                <stat.icon size={14} style={{ color: stat.color }} />
              </div>
            </div>
            <div className="text-2xl font-bold font-terminal text-white">{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Per model */}
        <div className="hud-card p-4">
          <div className="hud-corners-bottom" />
          <h2 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
            <Cpu size={14} style={{ color: '#00d4ff' }} /> Per model
          </h2>
          <div className="space-y-3">
            {Object.entries(byModel).sort((a, b) => b[1].cost - a[1].cost).map(([model, stats]) => {
              const pct = totalCost > 0 ? (stats.cost / totalCost) * 100 : 0
              const color = modelColorMap[model] ?? '#94a3b8'
              return (
                <div key={model}>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-terminal" style={{ color: '#94a3b8' }}>{model}</span>
                    <span className="font-terminal font-medium text-white">${stats.cost.toFixed(4)}</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                  </div>
                  <div className="text-xs font-terminal mt-1" style={{ color: '#475569' }}>
                    {(stats.tokens / 1000).toFixed(1)}K tokens · {stats.count} sessies
                  </div>
                </div>
              )
            })}
            {Object.keys(byModel).length === 0 && (
              <p className="text-sm font-terminal text-center py-4" style={{ color: '#475569' }}>Geen data</p>
            )}
          </div>
        </div>

        {/* Per agent */}
        <div className="hud-card p-4">
          <div className="hud-corners-bottom" />
          <h2 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
            <TrendingUp size={14} style={{ color: '#00d4ff' }} /> Per agent
          </h2>
          <div className="space-y-3">
            {Object.entries(byAgent).sort((a, b) => b[1].cost - a[1].cost).map(([agent, stats]) => {
              const pct = totalCost > 0 ? (stats.cost / totalCost) * 100 : 0
              return (
                <div key={agent}>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-terminal" style={{ color: '#94a3b8' }}>{agent}</span>
                    <span className="font-terminal font-medium text-white">${stats.cost.toFixed(4)}</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: '#00d4ff' }} />
                  </div>
                  <div className="text-xs font-terminal mt-1" style={{ color: '#475569' }}>
                    {(stats.tokens / 1000).toFixed(1)}K tokens
                  </div>
                </div>
              )
            })}
            {Object.keys(byAgent).length === 0 && (
              <p className="text-sm font-terminal text-center py-4" style={{ color: '#475569' }}>Geen data</p>
            )}
          </div>
        </div>
      </div>

      {/* Token Efficiency */}
      <div className="hud-card p-4">
        <div className="hud-corners-bottom" />
        <h2 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
          <BarChart3 size={14} style={{ color: '#00d4ff' }} /> Token Efficiency Score
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Score meter */}
          <div className="flex flex-col items-center justify-center p-4 rounded-lg" style={{ background: 'rgba(0,212,255,0.04)', border: '1px solid rgba(0,212,255,0.1)' }}>
            <div className="font-terminal text-4xl font-bold mb-1" style={{
              color: efficiencyScore >= 70 ? '#10b981' : efficiencyScore >= 40 ? '#f59e0b' : '#ef4444',
              textShadow: `0 0 20px ${efficiencyScore >= 70 ? '#10b981' : efficiencyScore >= 40 ? '#f59e0b' : '#ef4444'}60`,
            }}>
              {efficiencyScore}
            </div>
            <div className="font-terminal text-xs" style={{ color: '#475569' }}>efficiency score</div>
            <div className="w-full mt-3 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div className="h-full rounded-full transition-all" style={{
                width: `${efficiencyScore}%`,
                background: efficiencyScore >= 70 ? 'linear-gradient(90deg,#10b981,#00d4ff)' : efficiencyScore >= 40 ? '#f59e0b' : '#ef4444',
              }} />
            </div>
          </div>

          {/* Cache hit rate */}
          <div className="p-4 rounded-lg" style={{ background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.1)' }}>
            <div className="font-terminal text-xs mb-2" style={{ color: '#94a3b8' }}>Cache Hit Rate</div>
            <div className="font-terminal text-2xl font-bold mb-1" style={{ color: '#f59e0b' }}>
              {cacheHitRate.toFixed(1)}%
            </div>
            <div className="w-full h-1 rounded-full mb-2" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div className="h-full rounded-full" style={{ width: `${cacheHitRate}%`, background: '#f59e0b' }} />
            </div>
            <div className="font-terminal text-xs" style={{ color: '#475569' }}>
              {(totalCache / 1000).toFixed(1)}K cache hits
            </div>
          </div>

          {/* Tokens per dollar */}
          <div className="p-4 rounded-lg" style={{ background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.1)' }}>
            <div className="font-terminal text-xs mb-2" style={{ color: '#94a3b8' }}>Tokens per Dollar</div>
            <div className="font-terminal text-2xl font-bold mb-1" style={{ color: '#10b981' }}>
              {tokensPerDollar > 1000 ? `${(tokensPerDollar / 1000).toFixed(0)}K` : tokensPerDollar.toFixed(0)}
            </div>
            <div className="font-terminal text-xs" style={{ color: '#475569' }}>
              ${totalCost > 0 ? (totalCost / totalTokens * 1_000_000).toFixed(2) : '0.00'} per 1M tokens
            </div>
            <div className="font-terminal text-xs mt-1" style={{ color: '#334155' }}>
              {(totalTokens / 1000).toFixed(1)}K totale tokens
            </div>
          </div>
        </div>
      </div>

      {/* Detail table */}
      <div className="hud-card overflow-hidden">
        <div className="hud-corners-bottom" />
        <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(0,212,255,0.08)' }}>
          <h2 className="text-sm font-medium text-white">Sessiedetails</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-terminal">
            <thead>
              <tr style={{ background: 'rgba(0,212,255,0.02)', borderBottom: '1px solid rgba(0,212,255,0.08)' }}>
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
                <tr key={r.id} style={{ borderBottom: i < records.length - 1 ? '1px solid rgba(0,212,255,0.04)' : 'none' }}>
                  <td className="px-4 py-2.5 text-white">{r.agent_name ?? '—'}</td>
                  <td className="px-4 py-2.5" style={{ color: modelColorMap[r.model] ?? '#94a3b8' }}>{r.model}</td>
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
