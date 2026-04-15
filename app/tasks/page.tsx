export const dynamic = 'force-dynamic'

import { type Task } from '@/lib/supabase'
import { TasksPage } from '@/components/tasks-page'

const SB_URL = 'https://logkkueavewqmaquuwfw.supabase.co'
const SB_KEY = 'sb_publishable_nqPICLQDoaXGb8hshPIYYg_uv9GRuid'
const SB_HEADERS = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` }

async function getData() {
  const res = await fetch(`${SB_URL}/rest/v1/tasks?select=*&order=priority.asc,created_at.asc`, {
    headers: SB_HEADERS,
    cache: 'no-store',
  })
  if (!res.ok) return []
  return res.json()
}

export default async function TasksRoute() {
  const tasks = ((await getData()) as Task[]) ?? []

  return <TasksPage initialTasks={tasks} />
}
