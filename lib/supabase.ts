import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type AgentSession = {
  id: string
  session_id: string
  agent_name: string
  status: 'active' | 'idle' | 'completed' | 'error'
  project: string | null
  current_task: string | null
  model: string
  started_at: string
  last_seen_at: string
  ended_at: string | null
  metadata: Record<string, unknown>
}

export type AgentLog = {
  id: string
  session_id: string | null
  agent_name: string
  event_type: 'task_start' | 'task_complete' | 'tool_use' | 'message' | 'error' | 'info'
  message: string
  details: Record<string, unknown>
  created_at: string
}

export type CostRecord = {
  id: string
  session_id: string | null
  agent_name: string | null
  model: string
  input_tokens: number
  output_tokens: number
  cache_read_tokens: number
  cache_write_tokens: number
  cost_usd: number
  recorded_at: string
  date: string
}

export type Project = {
  id: string
  name: string
  description: string | null
  status: 'active' | 'paused' | 'completed' | 'archived'
  linear_project_id: string | null
  color: string
  created_at: string
  updated_at: string
}
