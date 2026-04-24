export const dynamic = 'force-dynamic'
export const maxDuration = 30

import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { postMessage } from '@/lib/slack/client'
import { assertSlackConfigured } from '@/lib/slack/config'
import type { AlertRule } from '@/lib/supabase'

const CRON_SECRET = process.env.CRON_SECRET || ''
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

function fmt(n: number, d = 2): string {
  return n.toLocaleString('nl-NL', { minimumFractionDigits: d, maximumFractionDigits: d })
}

type EvalResult = { triggered: boolean; message?: string }

async function evalDailyCost(supabase: SupabaseClient, rule: AlertRule): Promise<EvalResult> {
  const today = amsterdamDate(0)
  const { data } = await supabase.from('cost_tracking').select('cost_usd').eq('date', today)
  const total = (data ?? []).reduce((s, r: { cost_usd: number | string }) => s + Number(r.cost_usd || 0), 0)
  if (total > rule.threshold) {
    return {
      triggered: true,
      message: `:warning: *Dagelijkse kosten overschreden* — vandaag $${fmt(total)} > drempel $${fmt(rule.threshold)} (${rule.name})`,
    }
  }
  return { triggered: false }
}

async function evalHourlySpike(supabase: SupabaseClient, rule: AlertRule): Promise<EvalResult> {
  const cutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { data } = await supabase.from('cost_tracking').select('cost_usd').gte('recorded_at', cutoff)
  const total = (data ?? []).reduce((s, r: { cost_usd: number | string }) => s + Number(r.cost_usd || 0), 0)
  if (total > rule.threshold) {
    return {
      triggered: true,
      message: `:fire: *Kostenpiek laatste uur* — $${fmt(total)} > drempel $${fmt(rule.threshold)} (${rule.name})`,
    }
  }
  return { triggered: false }
}

async function evalAgentIdle(supabase: SupabaseClient, rule: AlertRule): Promise<EvalResult> {
  const cutoff = new Date(Date.now() - rule.threshold * 60 * 1000).toISOString()
  const { data } = await supabase
    .from('agent_sessions')
    .select('agent_name,session_id,last_seen_at,project')
    .eq('status', 'active')
    .lt('last_seen_at', cutoff)
    .limit(20)
  const stuck = data ?? []
  if (stuck.length === 0) return { triggered: false }
  const lines = stuck.map((s) => {
    const minutes = Math.round((Date.now() - new Date(s.last_seen_at).getTime()) / 60000)
    const tag = s.project ? `[${s.project}] ` : ''
    return `• ${tag}${s.agent_name} (session ${String(s.session_id).slice(0, 8)}) — ${minutes}m stil`
  })
  return {
    triggered: true,
    message: `:sleeping: *Agents idle > ${rule.threshold}m* (${stuck.length})\n${lines.join('\n')}`,
  }
}

async function evaluateRule(supabase: SupabaseClient, rule: AlertRule): Promise<EvalResult> {
  switch (rule.type) {
    case 'daily_cost':
      return evalDailyCost(supabase, rule)
    case 'hourly_spike':
      return evalHourlySpike(supabase, rule)
    case 'agent_idle':
      return evalAgentIdle(supabase, rule)
    default:
      return { triggered: false }
  }
}

function cooldownActive(rule: AlertRule): boolean {
  if (!rule.last_fired_at) return false
  const since = Date.now() - new Date(rule.last_fired_at).getTime()
  return since < rule.cooldown_minutes * 60 * 1000
}

async function runCheck() {
  const cfg = assertSlackConfigured()
  if (!cfg.ok) return { ok: false, status: 500, error: 'slack_not_configured', missing: cfg.missing }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON)
  const { data: rulesData, error } = await supabase.from('alert_rules').select('*').eq('enabled', true)
  if (error) return { ok: false, status: 500, error: 'rules_fetch_failed', detail: error.message }
  const rules = (rulesData ?? []) as AlertRule[]

  const fired: { rule: string; message: string }[] = []
  const skipped: { rule: string; reason: string }[] = []

  for (const rule of rules) {
    if (cooldownActive(rule)) {
      skipped.push({ rule: rule.name, reason: 'cooldown' })
      continue
    }
    const result = await evaluateRule(supabase, rule)
    if (!result.triggered || !result.message) {
      skipped.push({ rule: rule.name, reason: 'not_triggered' })
      continue
    }
    const postRes = await postMessage({ channel: rule.channel, text: result.message })
    if (!postRes.ok) {
      skipped.push({ rule: rule.name, reason: `slack_failed:${postRes.error ?? 'unknown'}` })
      continue
    }
    await supabase
      .from('alert_rules')
      .update({ last_fired_at: new Date().toISOString(), last_message: result.message })
      .eq('id', rule.id)
    fired.push({ rule: rule.name, message: result.message })
  }

  return { ok: true, status: 200, evaluated: rules.length, fired, skipped }
}

export async function GET(req: NextRequest) {
  if (!authorize(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const result = await runCheck()
  return NextResponse.json(result, { status: result.status })
}

export async function POST(req: NextRequest) {
  if (!authorize(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const result = await runCheck()
  return NextResponse.json(result, { status: result.status })
}
