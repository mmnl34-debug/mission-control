export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://logkkueavewqmaquuwfw.supabase.co'
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'sb_publishable_nqPICLQDoaXGb8hshPIYYg_uv9GRuid'

export async function GET() {
  const sb = createClient(SUPABASE_URL, SUPABASE_KEY)

  const [sessions, recentLogs, todayCosts, tasks] = await Promise.all([
    sb.from('agent_sessions').select('agent_name, status, project, current_task').in('status', ['active']),
    sb.from('agent_logs').select('event_type, message, agent_name, created_at')
      .order('created_at', { ascending: false }).limit(5),
    sb.from('cost_tracking').select('cost_usd, input_tokens, output_tokens')
      .gte('recorded_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
    sb.from('tasks').select('title, status').eq('status', 'in_progress').limit(5),
  ])

  const activeSessions = sessions.data ?? []
  const logs = recentLogs.data ?? []
  const costs = todayCosts.data ?? []
  const inProgressTasks = tasks.data ?? []

  const totalCostToday = costs.reduce((sum, r) => sum + (r.cost_usd ?? 0), 0)
  const totalTokensToday = costs.reduce((sum, r) => sum + (r.input_tokens ?? 0) + (r.output_tokens ?? 0), 0)
  const errors = logs.filter(l => l.event_type === 'error')

  return NextResponse.json({
    activeSessions,
    recentLogs: logs,
    errors,
    todayCost: totalCostToday,
    todayTokens: totalTokensToday,
    inProgressTasks,
  })
}
