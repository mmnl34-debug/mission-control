export const dynamic = 'force-dynamic'

import { type Task, type Note, type PlannerEvent, type AgendaCategory, type AgentSession, type CostRecord } from '@/lib/supabase'
import { BriefingPage } from '@/components/briefing-page'

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SB_HEADERS = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` }

async function sbFetch(path: string) {
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, { headers: SB_HEADERS, cache: 'no-store' })
  if (!res.ok) return []
  return res.json()
}

export default async function BriefingRoute() {
  const today = new Date().toISOString().slice(0, 10)
  const in7days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  const [tasks, notes, events, categories, sessions, costs] = await Promise.all([
    sbFetch('tasks?select=*&status=in.(todo,in_progress)&order=priority.asc,created_at.asc'),
    sbFetch('notes?select=*&processed=eq.false&order=created_at.desc&limit=15'),
    sbFetch(`planner_events?select=*&status=eq.planned&event_date=gte.${today}&event_date=lte.${in7days}&order=event_date.asc,event_time.asc`),
    sbFetch('agenda_categories?select=*&order=name.asc'),
    sbFetch('agent_sessions?select=*&order=last_seen_at.desc'),
    sbFetch(`cost_tracking?select=*&date=eq.${today}`),
  ])

  return (
    <BriefingPage
      tasks={tasks as Task[]}
      notes={notes as Note[]}
      events={events as PlannerEvent[]}
      categories={categories as AgendaCategory[]}
      sessions={sessions as AgentSession[]}
      costs={costs as CostRecord[]}
    />
  )
}
