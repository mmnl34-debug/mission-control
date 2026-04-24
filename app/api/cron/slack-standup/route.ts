export const dynamic = 'force-dynamic'
export const maxDuration = 30

import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { postMessage } from '@/lib/slack/client'
import { assertSlackConfigured } from '@/lib/slack/config'
import type { Task, CostRecord } from '@/lib/supabase'

const CRON_SECRET = process.env.CRON_SECRET || ''
const STANDUP_CHANNEL = process.env.SLACK_STANDUP_CHANNEL || '#orchestrator'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

function authorize(req: NextRequest): boolean {
  if (!CRON_SECRET) return false
  const auth = req.headers.get('authorization') || ''
  if (auth === `Bearer ${CRON_SECRET}`) return true
  if (req.headers.get('x-cron-secret') === CRON_SECRET) return true
  return false
}

function amsterdamDate(offsetDays = 0): string {
  const now = new Date()
  const ams = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Amsterdam' }))
  ams.setDate(ams.getDate() + offsetDays)
  return ams.toISOString().slice(0, 10)
}

function amsterdamBoundaryUTC(dateISO: string): string {
  const local = new Date(`${dateISO}T00:00:00`)
  const offsetMin = new Date(local.toLocaleString('en-US', { timeZone: 'Europe/Amsterdam' })).getTime() - local.getTime()
  return new Date(local.getTime() - offsetMin).toISOString()
}

function fmt(n: number, digits = 2): string {
  return n.toLocaleString('nl-NL', { minimumFractionDigits: digits, maximumFractionDigits: digits })
}

async function buildStandup(supabase: SupabaseClient): Promise<string> {
  const today = amsterdamDate(0)
  const yesterday = amsterdamDate(-1)
  const startYesterday = amsterdamBoundaryUTC(yesterday)
  const startToday = amsterdamBoundaryUTC(today)

  const [doneRes, inProgressRes, todoRes, costRes] = await Promise.all([
    supabase
      .from('tasks')
      .select('id,title,project,priority,updated_at')
      .eq('status', 'done')
      .gte('updated_at', startYesterday)
      .lt('updated_at', startToday)
      .order('updated_at', { ascending: false }),
    supabase
      .from('tasks')
      .select('id,title,project,priority,updated_at')
      .eq('status', 'in_progress')
      .order('priority', { ascending: true }),
    supabase
      .from('tasks')
      .select('id,title,project,priority,created_at')
      .eq('status', 'todo')
      .order('priority', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(8),
    supabase
      .from('cost_tracking')
      .select('cost_usd,input_tokens,output_tokens,cache_read_tokens,cache_write_tokens')
      .eq('date', yesterday),
  ])

  const done = (doneRes.data ?? []) as Task[]
  const inProgress = (inProgressRes.data ?? []) as Task[]
  const todo = (todoRes.data ?? []) as Task[]
  const costs = (costRes.data ?? []) as Pick<CostRecord, 'cost_usd' | 'input_tokens' | 'output_tokens' | 'cache_read_tokens' | 'cache_write_tokens'>[]

  const totalCost = costs.reduce((sum, c) => sum + Number(c.cost_usd || 0), 0)
  const totalTokens = costs.reduce(
    (sum, c) => sum + Number(c.input_tokens || 0) + Number(c.output_tokens || 0) + Number(c.cache_read_tokens || 0) + Number(c.cache_write_tokens || 0),
    0,
  )

  const line = (t: Task) => {
    const prefix = t.project ? `[${t.project}] ` : ''
    return `• ${prefix}${t.title}`
  }

  const parts: string[] = []
  parts.push(`*:sunrise: Daily standup — ${today}*`)
  parts.push('')
  parts.push(`*:white_check_mark: Gisteren klaar (${done.length})*`)
  parts.push(done.length ? done.slice(0, 10).map(line).join('\n') : '_geen_')
  parts.push('')
  parts.push(`*:hourglass_flowing_sand: Nu onderhanden (${inProgress.length})*`)
  parts.push(inProgress.length ? inProgress.map(line).join('\n') : '_geen_')
  parts.push('')
  parts.push(`*:dart: Open todo top ${todo.length}*`)
  parts.push(todo.length ? todo.map(line).join('\n') : '_geen_')
  parts.push('')
  parts.push(`*:moneybag: Kosten gisteren:* $${fmt(totalCost, 2)} — ${totalTokens.toLocaleString('nl-NL')} tokens`)

  return parts.join('\n')
}

async function runStandup() {
  const cfg = assertSlackConfigured()
  if (!cfg.ok) {
    return { ok: false, status: 500, error: 'slack_not_configured', missing: cfg.missing }
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON)
  const text = await buildStandup(supabase)
  const res = await postMessage({ channel: STANDUP_CHANNEL, text })
  if (!res.ok) {
    return { ok: false, status: 500, error: 'slack_post_failed', detail: res.error, preview: text }
  }
  return { ok: true, status: 200, channel: res.channel, ts: res.ts }
}

export async function GET(req: NextRequest) {
  if (!authorize(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const result = await runStandup()
  return NextResponse.json(result, { status: result.status })
}

export async function POST(req: NextRequest) {
  if (!authorize(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const result = await runStandup()
  return NextResponse.json(result, { status: result.status })
}
