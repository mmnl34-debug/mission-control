export const dynamic = 'force-dynamic'

import { type AgentLog, type AgentSession } from '@/lib/supabase'
import { FeedPage } from '@/components/feed-page'

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SB_HEADERS = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` }

async function sbFetch(path: string) {
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, { headers: SB_HEADERS, cache: 'no-store' })
  if (!res.ok) return []
  return res.json()
}

async function getData() {
  const [logs, sessions] = await Promise.all([
    sbFetch('agent_logs?select=*&order=created_at.desc&limit=50'),
    sbFetch('agent_sessions?select=*&status=eq.active'),
  ])
  return {
    logs: (logs as AgentLog[]) ?? [],
    activeSessions: ((sessions as AgentSession[]) ?? []).length,
  }
}

export default async function FeedRoute() {
  const { logs, activeSessions } = await getData()

  return <FeedPage initialLogs={logs} activeSessions={activeSessions} />
}
