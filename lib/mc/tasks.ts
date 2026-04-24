const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const HEADERS = {
  apikey: SB_KEY,
  Authorization: `Bearer ${SB_KEY}`,
  'Content-Type': 'application/json',
}

export type MCTask = {
  id: string
  title: string
  description: string | null
  status: 'todo' | 'in_progress' | 'done'
  project: string | null
  priority: number
  created_at: string
  updated_at: string
}

export type MCProject = {
  id: string
  name: string
  description: string | null
  status: 'active' | 'paused' | 'completed' | 'archived'
  color: string
  created_at: string
}

async function sb<T>(path: string, init?: RequestInit): Promise<T | null> {
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, {
    ...init,
    headers: { ...HEADERS, ...(init?.headers ?? {}) },
    cache: 'no-store',
  })
  if (!res.ok) return null
  const txt = await res.text()
  if (!txt) return null
  try {
    return JSON.parse(txt) as T
  } catch {
    return null
  }
}

export async function createTask(args: { title: string; project?: string | null; priority?: number; description?: string | null }): Promise<MCTask | null> {
  const payload = {
    title: args.title,
    description: args.description ?? null,
    project: args.project ?? null,
    priority: args.priority ?? 3,
    status: 'todo',
  }
  const data = await sb<MCTask[]>('tasks', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(payload),
  })
  return data?.[0] ?? null
}

export async function listOpenTasks(args: { project?: string; limit?: number } = {}): Promise<MCTask[]> {
  const limit = args.limit ?? 10
  const parts = [
    'select=*',
    'status=in.(todo,in_progress)',
    'order=priority.asc,created_at.asc',
    `limit=${limit}`,
  ]
  if (args.project) parts.push(`project=eq.${encodeURIComponent(args.project)}`)
  const data = await sb<MCTask[]>(`tasks?${parts.join('&')}`)
  return data ?? []
}

export async function findTaskByIdPrefix(prefix: string): Promise<MCTask | null> {
  const clean = prefix.trim().toLowerCase()
  if (!clean) return null
  // UUID casting in PostgREST filters is awkward; prefetch open+done-of-this-week window and filter client-side.
  const data = await sb<MCTask[]>('tasks?select=*&order=updated_at.desc&limit=200')
  if (!data) return null
  const matches = data.filter((t) => t.id.toLowerCase().startsWith(clean))
  if (matches.length !== 1) return null
  return matches[0]
}

export async function setTaskStatus(id: string, status: MCTask['status']): Promise<MCTask | null> {
  const data = await sb<MCTask[]>(`tasks?id=eq.${id}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ status }),
  })
  return data?.[0] ?? null
}

export async function listActiveProjects(): Promise<MCProject[]> {
  const data = await sb<MCProject[]>('projects?status=eq.active&select=*&order=name.asc')
  return data ?? []
}

export async function createProject(args: { name: string; description?: string | null; color?: string }): Promise<MCProject | null> {
  const payload = {
    name: args.name,
    description: args.description ?? null,
    color: args.color ?? '#00d4ff',
    status: 'active',
  }
  const data = await sb<MCProject[]>('projects', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(payload),
  })
  return data?.[0] ?? null
}
