export const dynamic = 'force-dynamic'

import { PlannerPage } from '@/components/planner-page'
import type { PlannerEvent } from '@/lib/supabase'

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SB_HEADERS = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` }

async function getEvents(): Promise<PlannerEvent[]> {
  const res = await fetch(`${SB_URL}/rest/v1/planner_events?select=*&order=event_date.asc,event_time.asc`, {
    headers: SB_HEADERS,
    cache: 'no-store',
  })
  if (!res.ok) return []
  return res.json()
}

async function getProjects(): Promise<string[]> {
  const res = await fetch(`${SB_URL}/rest/v1/projects?select=name&order=name.asc`, {
    headers: SB_HEADERS,
    cache: 'no-store',
  })
  if (!res.ok) return []
  const data = await res.json()
  return data.map((p: { name: string }) => p.name)
}

export default async function PlannerRoute() {
  const [events, projects] = await Promise.all([getEvents(), getProjects()])
  return <PlannerPage initialEvents={events} projects={projects} />
}
