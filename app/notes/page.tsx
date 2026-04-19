export const dynamic = 'force-dynamic'

import { NotesPage } from '@/components/notes-page'
import type { Note } from '@/lib/supabase'

const SB_URL = 'https://logkkueavewqmaquuwfw.supabase.co'
const SB_KEY = 'sb_publishable_nqPICLQDoaXGb8hshPIYYg_uv9GRuid'
const SB_HEADERS = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` }

async function getNotes(): Promise<Note[]> {
  const res = await fetch(`${SB_URL}/rest/v1/notes?select=*&order=created_at.desc`, {
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

export default async function NotesRoute() {
  const [notes, projects] = await Promise.all([getNotes(), getProjects()])
  return <NotesPage initialNotes={notes} projects={projects} />
}
