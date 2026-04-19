import { TrendingUp, CheckSquare, Bot, DollarSign } from 'lucide-react'

const SB_URL = 'https://logkkueavewqmaquuwfw.supabase.co'
const SB_KEY = 'sb_publishable_nqPICLQDoaXGb8hshPIYYg_uv9GRuid'
const SB_HEADERS = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` }

async function sbFetch(path: string) {
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, { headers: SB_HEADERS, cache: 'no-store' })
  if (!res.ok) return []
  return res.json()
}

function getWeekStart() {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Monday
  const monday = new Date(d.setDate(diff))
  monday.setHours(0, 0, 0, 0)
  return monday.toISOString()
}

export async function WeekOverview() {
  const weekStart = getWeekStart()

  const [costs, tasks, sessions] = await Promise.all([
    sbFetch(`cost_tracking?select=cost_usd,input_tokens,output_tokens&recorded_at=gte.${weekStart}`),
    sbFetch(`tasks?select=status,updated_at&updated_at=gte.${weekStart}`),
    sbFetch(`agent_sessions?select=id,started_at&started_at=gte.${weekStart}`),
  ])

  const weekCost   = costs.reduce((s: number, c: { cost_usd: number }) => s + Number(c.cost_usd), 0)
  const weekTokens = costs.reduce((s: number, c: { input_tokens: number; output_tokens: number }) => s + c.input_tokens + c.output_tokens, 0)
  const doneTasks  = tasks.filter((t: { status: string }) => t.status === 'done').length
  const weekSessions = sessions.length

  const stats = [
    { label: 'Klaar deze week', value: doneTasks, icon: CheckSquare, color: '#10b981' },
    { label: 'Sessies', value: weekSessions, icon: Bot, color: '#00d4ff' },
    { label: 'Kosten week', value: `$${weekCost.toFixed(3)}`, icon: DollarSign, color: '#ec4899' },
    { label: 'Tokens week', value: weekTokens >= 1000 ? `${(weekTokens / 1000).toFixed(1)}K` : weekTokens, icon: TrendingUp, color: '#f59e0b' },
  ]

  return (
    <div className="hud-card">
      <div className="hud-corners-bottom" />
      <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: '1px solid rgba(0,212,255,0.08)' }}>
        <span className="hud-label">Deze week</span>
        <span className="font-terminal text-xs" style={{ color: '#334155', fontSize: 10 }}>
          ma t/m nu
        </span>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-0">
        {stats.map((s, i) => {
          const Icon = s.icon
          return (
            <div
              key={s.label}
              className="flex flex-col gap-1.5 p-3"
              style={{ borderRight: i < 3 ? '1px solid rgba(0,212,255,0.06)' : 'none' }}
            >
              <div className="flex items-center gap-1.5">
                <Icon size={10} style={{ color: s.color }} />
                <span className="font-terminal" style={{ fontSize: 9, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {s.label}
                </span>
              </div>
              <span className="font-terminal font-bold" style={{ fontSize: 20, color: '#f1f5f9', lineHeight: 1 }}>
                {s.value}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
