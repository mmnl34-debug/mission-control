import type { AgentSession } from '@/lib/supabase'

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SB_HEADERS = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` }

const STATUS_COLORS: Record<string, string> = {
  active: '#00d4ff',
  idle: '#f59e0b',
  completed: '#10b981',
  error: '#ef4444',
}

const NODE_W = 80
const NODE_H = 36
const H_GAP = 10
const LABEL_H = 18

function truncate(s: string | null | undefined, n: number): string {
  if (!s) return ''
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}

async function getSessions(): Promise<AgentSession[]> {
  try {
    const res = await fetch(
      `${SB_URL}/rest/v1/agent_sessions?select=*&order=last_seen_at.desc`,
      { headers: SB_HEADERS, cache: 'no-store' }
    )
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

export async function PipelineMini() {
  const allSessions = await getSessions()

  // Active first, then idle, max 6
  const sorted = [
    ...allSessions.filter(s => s.status === 'active'),
    ...allSessions.filter(s => s.status === 'idle'),
    ...allSessions.filter(s => s.status !== 'active' && s.status !== 'idle'),
  ].slice(0, 6)

  const activeCount = allSessions.filter(s => s.status === 'active').length
  const total = allSessions.length

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2" style={{ minHeight: 120 }}>
        <span className="font-terminal text-xs" style={{ color: '#334155' }}>
          Geen pipeline sessies
        </span>
        <span className="font-terminal" style={{ color: '#1e293b', fontSize: 10 }}>
          0 actief · 0 totaal
        </span>
      </div>
    )
  }

  // Group by project for connection lines
  const groups = new Map<string, AgentSession[]>()
  for (const s of sorted) {
    const key = s.project ?? 'Algemeen'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(s)
  }

  // Build positions
  const positions: Array<{ session: AgentSession; x: number; y: number }> = []
  let col = 0
  for (const groupSessions of groups.values()) {
    for (const session of groupSessions) {
      positions.push({
        session,
        x: col * (NODE_W + H_GAP),
        y: LABEL_H,
      })
      col++
    }
  }

  const svgW = Math.max(positions.length * (NODE_W + H_GAP) - H_GAP, NODE_W)
  const svgH = LABEL_H + NODE_H + 8

  return (
    <div className="space-y-2">
      <div className="overflow-auto">
        <svg width={svgW} height={svgH} style={{ display: 'block', minWidth: '100%' }}>
          {/* Connection lines within same project group */}
          {Array.from(groups.values()).map((groupSessions, gi) => {
            if (groupSessions.length < 2) return null
            const groupPositions = positions.filter(p =>
              groupSessions.some(s => s.id === p.session.id)
            )
            return groupPositions.slice(0, -1).map((from, i) => {
              const to = groupPositions[i + 1]
              return (
                <line
                  key={`g${gi}-l${i}`}
                  x1={from.x + NODE_W}
                  y1={from.y + NODE_H / 2}
                  x2={to.x}
                  y2={to.y + NODE_H / 2}
                  stroke="rgba(0,212,255,0.25)"
                  strokeWidth={1}
                  strokeDasharray="3,3"
                />
              )
            })
          })}

          {/* Nodes */}
          {positions.map(({ session, x, y }) => {
            const c = STATUS_COLORS[session.status] ?? '#64748b'
            return (
              <g key={session.id}>
                {/* Node background */}
                <rect
                  x={x}
                  y={y}
                  width={NODE_W}
                  height={NODE_H}
                  rx={4}
                  fill="rgba(255,255,255,0.03)"
                  stroke="rgba(0,212,255,0.12)"
                  strokeWidth={1}
                />
                {/* Left status bar */}
                <rect
                  x={x}
                  y={y + 4}
                  width={2.5}
                  height={NODE_H - 8}
                  rx={1}
                  fill={c}
                />
                {/* Status dot */}
                <circle cx={x + NODE_W - 8} cy={y + 10} r={3} fill={c} opacity={0.8} />
                {/* Agent name */}
                <text
                  x={x + 8}
                  y={y + 15}
                  fill="#cbd5e1"
                  fontSize={8}
                  fontWeight="bold"
                  fontFamily="'JetBrains Mono', 'Fira Code', monospace"
                >
                  {truncate(session.agent_name, 12)}
                </text>
                {/* Project/task */}
                <text
                  x={x + 8}
                  y={y + 27}
                  fill="#475569"
                  fontSize={7}
                  fontFamily="'JetBrains Mono', 'Fira Code', monospace"
                >
                  {truncate(session.project ?? session.current_task ?? session.model, 13)}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      {/* Footer count */}
      <p className="font-terminal" style={{ color: '#334155', fontSize: 10 }}>
        <span style={{ color: '#00d4ff' }}>{activeCount}</span> actief
        {' · '}
        {total} totaal
      </p>
    </div>
  )
}
