import { TrendingUp, AlertTriangle, Cpu } from 'lucide-react'

const SB_URL = 'https://logkkueavewqmaquuwfw.supabase.co'
const SB_KEY = 'sb_publishable_nqPICLQDoaXGb8hshPIYYg_uv9GRuid'
const SB_HEADERS = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` }

async function sbFetch(path: string) {
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, { headers: SB_HEADERS, cache: 'no-store' })
  if (!res.ok) return []
  return res.json()
}

type CostRow = { agent_name: string; cost_usd: number; input_tokens: number; output_tokens: number; model: string }
type LogRow  = { agent_name: string; event_type: string; message: string }
type SessionRow = { agent_name: string; session_id: string }

function parseTool(msg: string): string | null {
  const m = msg.match(/^([A-Za-z]+):/)
  if (!m) return null
  return ['Bash', 'Read', 'Write', 'Edit', 'Glob', 'Grep', 'Agent', 'WebFetch'].includes(m[1]) ? m[1] : null
}

export async function AgentEfficiency() {
  const [costs, logs, sessions] = await Promise.all([
    sbFetch('cost_tracking?select=agent_name,cost_usd,input_tokens,output_tokens,model'),
    sbFetch('agent_logs?select=agent_name,event_type,message&limit=2000&order=created_at.desc'),
    sbFetch('agent_sessions?select=agent_name,session_id'),
  ])

  // Aggregate per agent
  const agentMap = new Map<string, {
    totalCost: number
    totalTokens: number
    sessions: Set<string>
    errors: number
    tools: Record<string, number>
    models: Set<string>
  }>()

  for (const c of costs as CostRow[]) {
    if (!c.agent_name) continue
    if (!agentMap.has(c.agent_name)) agentMap.set(c.agent_name, { totalCost: 0, totalTokens: 0, sessions: new Set(), errors: 0, tools: {}, models: new Set() })
    const a = agentMap.get(c.agent_name)!
    a.totalCost += Number(c.cost_usd)
    a.totalTokens += c.input_tokens + c.output_tokens
    a.models.add(c.model)
  }

  for (const s of sessions as SessionRow[]) {
    if (!s.agent_name) continue
    if (!agentMap.has(s.agent_name)) agentMap.set(s.agent_name, { totalCost: 0, totalTokens: 0, sessions: new Set(), errors: 0, tools: {}, models: new Set() })
    agentMap.get(s.agent_name)!.sessions.add(s.session_id)
  }

  for (const l of logs as LogRow[]) {
    if (!l.agent_name) continue
    if (!agentMap.has(l.agent_name)) agentMap.set(l.agent_name, { totalCost: 0, totalTokens: 0, sessions: new Set(), errors: 0, tools: {}, models: new Set() })
    const a = agentMap.get(l.agent_name)!
    if (l.event_type === 'error') a.errors++
    if (l.event_type === 'tool_use') {
      const tool = parseTool(l.message)
      if (tool) a.tools[tool] = (a.tools[tool] ?? 0) + 1
    }
  }

  const agents = Array.from(agentMap.entries())
    .map(([name, d]) => ({
      name,
      totalCost: d.totalCost,
      totalTokens: d.totalTokens,
      sessionCount: d.sessions.size,
      errors: d.errors,
      avgCostPerSession: d.sessions.size > 0 ? d.totalCost / d.sessions.size : 0,
      topTools: Object.entries(d.tools).sort((a, b) => b[1] - a[1]).slice(0, 3),
      model: [...d.models][0] ?? '—',
    }))
    .filter(a => a.totalCost > 0 || a.sessionCount > 0)
    .sort((a, b) => b.totalCost - a.totalCost)

  if (agents.length === 0) {
    return (
      <div className="hud-card p-4">
        <div className="hud-corners-bottom" />
        <p className="font-terminal text-xs text-center py-4" style={{ color: '#334155' }}>Nog geen efficiency data beschikbaar</p>
      </div>
    )
  }

  return (
    <div className="hud-card overflow-hidden">
      <div className="hud-corners-bottom" />
      <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: '1px solid rgba(0,212,255,0.08)' }}>
        <span className="hud-label">Agent Efficiency</span>
        <span className="font-terminal" style={{ fontSize: 10, color: '#334155' }}>{agents.length} agents</span>
      </div>

      {/* Table header */}
      <div
        className="grid font-terminal px-4 py-1.5"
        style={{ gridTemplateColumns: '1fr 80px 80px 60px 60px auto', fontSize: 9, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1px solid rgba(0,212,255,0.06)' }}
      >
        <span>Agent</span>
        <span className="text-right">Kosten</span>
        <span className="text-right">Tokens</span>
        <span className="text-right">Sessies</span>
        <span className="text-right">Fouten</span>
        <span className="text-right">Top tools</span>
      </div>

      {agents.map((agent, i) => (
        <div
          key={agent.name}
          className="grid items-center px-4 py-2.5 font-terminal"
          style={{
            gridTemplateColumns: '1fr 80px 80px 60px 60px auto',
            borderBottom: i < agents.length - 1 ? '1px solid rgba(0,212,255,0.04)' : 'none',
            fontSize: 11,
          }}
        >
          {/* Agent name + model */}
          <div className="min-w-0">
            <div className="truncate" style={{ color: '#f1f5f9' }}>{agent.name}</div>
            <div style={{ fontSize: 9, color: '#334155' }}>{agent.model}</div>
          </div>

          {/* Cost */}
          <div className="text-right">
            <div style={{ color: '#ec4899' }}>${agent.totalCost.toFixed(3)}</div>
            {agent.sessionCount > 0 && (
              <div style={{ fontSize: 9, color: '#334155' }}>${agent.avgCostPerSession.toFixed(3)}/sess</div>
            )}
          </div>

          {/* Tokens */}
          <div className="text-right" style={{ color: '#f59e0b' }}>
            {agent.totalTokens >= 1000 ? `${(agent.totalTokens / 1000).toFixed(1)}K` : agent.totalTokens}
          </div>

          {/* Sessions */}
          <div className="text-right" style={{ color: '#00d4ff' }}>
            <div className="flex items-center justify-end gap-1">
              <Cpu size={9} />
              {agent.sessionCount}
            </div>
          </div>

          {/* Errors */}
          <div className="text-right">
            <div className="flex items-center justify-end gap-1" style={{ color: agent.errors > 0 ? '#ef4444' : '#334155' }}>
              {agent.errors > 0 && <AlertTriangle size={9} />}
              {agent.errors}
            </div>
          </div>

          {/* Top tools */}
          <div className="flex items-center gap-1.5 justify-end flex-wrap">
            {agent.topTools.map(([tool, count]) => (
              <span key={tool} style={{ fontSize: 9, color: '#475569' }}>
                {tool}<span style={{ color: '#1e293b' }}>×{count}</span>
              </span>
            ))}
            {agent.topTools.length === 0 && (
              <span style={{ fontSize: 9, color: '#1e293b' }}>—</span>
            )}
          </div>
        </div>
      ))}

      {/* Footer summary */}
      <div className="flex items-center gap-4 px-4 py-2" style={{ borderTop: '1px solid rgba(0,212,255,0.06)', background: 'rgba(0,0,0,0.2)' }}>
        <div className="flex items-center gap-1.5 font-terminal" style={{ fontSize: 10, color: '#334155' }}>
          <TrendingUp size={10} style={{ color: '#10b981' }} />
          Totaal: ${agents.reduce((s, a) => s + a.totalCost, 0).toFixed(3)}
        </div>
        <div className="font-terminal" style={{ fontSize: 10, color: '#334155' }}>
          {agents.reduce((s, a) => s + a.totalTokens, 0).toLocaleString('nl-NL')} tokens
        </div>
        <div className="font-terminal" style={{ fontSize: 10, color: '#334155' }}>
          {agents.reduce((s, a) => s + a.errors, 0)} fouten totaal
        </div>
      </div>
    </div>
  )
}
