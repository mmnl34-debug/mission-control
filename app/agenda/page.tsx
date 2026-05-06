export const dynamic = 'force-dynamic'

import { AgendaPage } from '@/components/agenda-page'
import type { PlannerEvent, AgendaCategory } from '@/lib/supabase'

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SB_HEADERS = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` }

async function getEvents(): Promise<PlannerEvent[]> {
  const res = await fetch(
    `${SB_URL}/rest/v1/planner_events?select=*&order=event_date.asc,event_time.asc`,
    { headers: SB_HEADERS, cache: 'no-store' },
  )
  if (!res.ok) return []
  return res.json()
}

async function getCategories(): Promise<AgendaCategory[]> {
  try {
    const res = await fetch(
      `${SB_URL}/rest/v1/agenda_categories?select=*&order=name.asc`,
      { headers: SB_HEADERS, cache: 'no-store' },
    )
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

async function getProjects(): Promise<string[]> {
  const res = await fetch(
    `${SB_URL}/rest/v1/projects?select=name&order=name.asc`,
    { headers: SB_HEADERS, cache: 'no-store' },
  )
  if (!res.ok) return []
  const data = await res.json()
  return data.map((p: { name: string }) => p.name)
}

export default async function AgendaRoute() {
  const [events, categories, projects] = await Promise.all([
    getEvents(),
    getCategories(),
    getProjects(),
  ])
  return (
    <AgendaPage
      initialEvents={events}
      initialCategories={categories}
      projects={projects}
    />
  )
}
