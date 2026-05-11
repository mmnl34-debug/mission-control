export const dynamic = 'force-dynamic'
export const maxDuration = 30

import { NextRequest, NextResponse } from 'next/server'

const CRON_SECRET = process.env.CRON_SECRET || ''
const RESEND_API_KEY = process.env.RESEND_API_KEY || ''
const FROM_EMAIL = process.env.BRIEFING_FROM_EMAIL || 'briefing@yourdomain.com'
const TO_EMAIL = process.env.BRIEFING_TO_EMAIL || 'mmnl34@gmail.com'
const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SB_HEADERS = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` }
const USD_TO_EUR = 0.92

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

function amsterdamHour(): number {
  const h = new Date().toLocaleString('en-US', { timeZone: 'Europe/Amsterdam', hour: 'numeric', hour12: false })
  return parseInt(h)
}

function amsterdamTimeStr(): string {
  return new Date().toLocaleTimeString('nl-NL', { timeZone: 'Europe/Amsterdam', hour: '2-digit', minute: '2-digit' })
}

function amsterdamDateFormatted(): string {
  return new Date().toLocaleDateString('nl-NL', {
    timeZone: 'Europe/Amsterdam',
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
}

async function sbFetch(path: string) {
  try {
    const res = await fetch(`${SB_URL}/rest/v1/${path}`, { headers: SB_HEADERS, cache: 'no-store' })
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

function priorityLabel(p: number): string {
  if (p === 1) return 'KRITIEK'
  if (p === 2) return 'HOOG'
  if (p === 3) return 'NORMAAL'
  return 'LAAG'
}

function priorityColor(p: number): string {
  if (p === 1) return '#ef4444'
  if (p === 2) return '#f59e0b'
  if (p === 3) return '#60a5fa'
  return '#6b7280'
}

type TaskRow = { id: string; title: string; project: string | null; status: string; priority: number }
type NoteRow  = { id: string; title: string | null; content: string; created_at: string }
type EventRow = { id: string; title: string; event_date: string; event_time: string | null; description: string | null; category: string | null }

function buildHtml(params: {
  tasks: TaskRow[]
  notes: NoteRow[]
  todayEvents: EventRow[]
  upcomingEvents: EventRow[]
  activeSessions: number
  todayCost: number
  type: 'ochtend' | 'avond'
  dateStr: string
  timeStr: string
  today: string
}): string {
  const { tasks, notes, todayEvents, upcomingEvents, activeSessions, todayCost, type, dateStr, timeStr } = params
  const isOchtend = type === 'ochtend'
  const greeting = isOchtend ? 'Goedemorgen, Gertjan' : 'Goedenavond, Gertjan'
  const headerLabel = isOchtend ? '🌅 OCHTEND BRIEFING' : '🌆 AVOND RAPPORT'

  // Tasks grouped by project
  const tasksByProject = new Map<string, TaskRow[]>()
  for (const t of tasks) {
    const proj = t.project ?? 'Overig'
    const arr = tasksByProject.get(proj) ?? []
    arr.push(t)
    tasksByProject.set(proj, arr)
  }

  const inProgressCount = tasks.filter(t => t.status === 'in_progress').length

  // Quick stats
  const statsHtml = [
    { label: 'Open taken', value: tasks.length,    color: '#00d4ff' },
    { label: 'Bezig',      value: inProgressCount, color: '#f59e0b' },
    { label: 'Notities',   value: notes.length,    color: '#a855f7' },
    { label: 'Agents',     value: activeSessions,  color: '#10b981' },
  ].map(s => `
    <td style="width:25%;padding:0 4px;text-align:center;">
      <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:8px;padding:10px 6px;">
        <div style="color:${s.color};font-size:20px;font-weight:700;font-family:monospace;">${s.value}</div>
        <div style="color:#334155;font-size:9px;letter-spacing:0.1em;text-transform:uppercase;margin-top:2px;">${s.label}</div>
      </div>
    </td>
  `).join('')

  // Today events
  const todayEventsHtml = todayEvents.length > 0
    ? todayEvents.map(ev => `
        <div style="padding:10px 12px;margin-bottom:6px;border-left:3px solid #3b82f6;background:rgba(59,130,246,0.05);border-radius:0 6px 6px 0;">
          <div style="color:#e2e8f0;font-size:14px;font-weight:500;">${ev.title}</div>
          ${ev.event_time ? `<div style="color:#00d4ff;font-size:12px;margin-top:3px;font-family:monospace;">⏰ ${ev.event_time.slice(0, 5)}</div>` : ''}
          ${ev.description ? `<div style="color:#94a3b8;font-size:12px;margin-top:2px;">${ev.description}</div>` : ''}
        </div>
      `).join('')
    : '<div style="color:#64748b;font-size:13px;padding:6px 0;">Geen afspraken vandaag — vrije dag 🎉</div>'

  // Upcoming events
  const upcomingHtml = upcomingEvents.length > 0
    ? upcomingEvents.slice(0, 6).map(ev => `
        <div style="padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
          <span style="color:#00d4ff;font-size:11px;font-family:monospace;margin-right:10px;">${ev.event_date}</span>
          <span style="color:#cbd5e1;font-size:12px;">${ev.title}</span>
          ${ev.event_time ? `<span style="color:#64748b;font-size:11px;font-family:monospace;margin-left:8px;">${ev.event_time.slice(0, 5)}</span>` : ''}
        </div>
      `).join('')
    : '<div style="color:#64748b;font-size:13px;">Geen afspraken komende week</div>'

  // Tasks
  const tasksHtml = tasks.length > 0
    ? Array.from(tasksByProject.entries()).map(([project, pts]) => `
        <div style="margin-bottom:16px;">
          <div style="color:#64748b;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:7px;padding-bottom:4px;border-bottom:1px solid rgba(255,255,255,0.05);">
            ${project} &nbsp;(${pts.length})
          </div>
          ${pts.map(t => `
            <div style="display:flex;align-items:center;gap:8px;padding:6px 8px;margin-bottom:3px;background:rgba(255,255,255,0.02);border-radius:4px;border-left:2px solid ${t.status === 'in_progress' ? '#00d4ff' : priorityColor(t.priority)};">
              <span style="width:6px;height:6px;border-radius:50%;background:${t.status === 'in_progress' ? '#00d4ff' : priorityColor(t.priority)};flex-shrink:0;display:inline-block;"></span>
              <span style="color:#cbd5e1;font-size:12px;flex:1;">${t.title}</span>
              <span style="color:${t.status === 'in_progress' ? '#00d4ff' : priorityColor(t.priority)};font-size:9px;letter-spacing:0.1em;font-family:monospace;">${t.status === 'in_progress' ? 'BEZIG' : priorityLabel(t.priority)}</span>
            </div>
          `).join('')}
        </div>
      `).join('')
    : '<div style="color:#10b981;font-size:13px;">✅ Alle taken klaar!</div>'

  // Notes
  const notesHtml = notes.length > 0
    ? notes.slice(0, 5).map(n => `
        <div style="padding:10px 12px;margin-bottom:6px;background:rgba(168,85,247,0.06);border:1px solid rgba(168,85,247,0.15);border-radius:6px;">
          ${n.title ? `<div style="color:#c4b5fd;font-size:12px;font-weight:600;margin-bottom:4px;">${n.title}</div>` : ''}
          <div style="color:#94a3b8;font-size:12px;line-height:1.5;">${(n.content ?? '').slice(0, 200)}${(n.content ?? '').length > 200 ? '…' : ''}</div>
        </div>
      `).join('')
    : '<div style="color:#64748b;font-size:13px;">Geen onverwerkte notities</div>'

  const eurCost = (todayCost * USD_TO_EUR).toFixed(3)

  return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Mission Control Briefing</title>
</head>
<body style="margin:0;padding:0;background:#070710;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<div style="max-width:620px;margin:0 auto;padding:20px 14px;">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#0f1623 0%,#111827 100%);border:1px solid rgba(0,212,255,0.2);border-radius:12px;padding:24px;margin-bottom:12px;">
    <table style="width:100%;margin-bottom:16px;" cellpadding="0" cellspacing="0">
      <tr>
        <td>
          <div style="color:#00d4ff;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;font-family:monospace;margin-bottom:5px;">${headerLabel}</div>
          <div style="color:#f1f5f9;font-size:21px;font-weight:700;">${greeting}</div>
          <div style="color:#475569;font-size:12px;margin-top:4px;text-transform:capitalize;">${dateStr}</div>
        </td>
        <td style="text-align:right;vertical-align:top;">
          <div style="color:#00d4ff;font-size:26px;font-weight:700;font-family:monospace;">${timeStr}</div>
          <div style="color:#334155;font-size:10px;font-family:monospace;">Amsterdam</div>
        </td>
      </tr>
    </table>
    <table style="width:100%;" cellpadding="0" cellspacing="0"><tr>${statsHtml}</tr></table>
  </div>

  <!-- Vandaag -->
  <div style="background:#0f1623;border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:18px;margin-bottom:10px;">
    <div style="color:#00d4ff;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;font-family:monospace;margin-bottom:12px;">📅 Vandaag</div>
    ${todayEventsHtml}
  </div>

  ${upcomingEvents.length > 0 ? `
  <!-- Komende week -->
  <div style="background:#0f1623;border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:18px;margin-bottom:10px;">
    <div style="color:#818cf8;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;font-family:monospace;margin-bottom:12px;">🗓 Komende 7 dagen</div>
    ${upcomingHtml}
  </div>
  ` : ''}

  <!-- Taken -->
  <div style="background:#0f1623;border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:18px;margin-bottom:10px;">
    <div style="color:#f59e0b;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;font-family:monospace;margin-bottom:12px;">✅ Open taken (${tasks.length})</div>
    ${tasksHtml}
  </div>

  ${notes.length > 0 ? `
  <!-- Notities -->
  <div style="background:#0f1623;border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:18px;margin-bottom:10px;">
    <div style="color:#a855f7;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;font-family:monospace;margin-bottom:12px;">📝 Onverwerkte notities (${notes.length})</div>
    ${notesHtml}
  </div>
  ` : ''}

  <!-- Systeem -->
  <table style="width:100%;margin-bottom:14px;" cellpadding="0" cellspacing="0">
    <tr>
      <td style="width:50%;padding-right:5px;">
        <div style="background:#0f1623;border:1px solid rgba(16,185,129,0.2);border-radius:10px;padding:16px;text-align:center;">
          <div style="color:#10b981;font-size:24px;font-weight:700;font-family:monospace;">${activeSessions}</div>
          <div style="color:#334155;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;">Actieve agents</div>
        </div>
      </td>
      <td style="width:50%;padding-left:5px;">
        <div style="background:#0f1623;border:1px solid rgba(0,212,255,0.2);border-radius:10px;padding:16px;text-align:center;">
          <div style="color:#00d4ff;font-size:24px;font-weight:700;font-family:monospace;">€${eurCost}</div>
          <div style="color:#334155;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;">Kosten vandaag</div>
        </div>
      </td>
    </tr>
  </table>

  <!-- Footer -->
  <div style="text-align:center;padding:10px 0;">
    <a href="https://mission-control-kl7g.vercel.app/briefing" style="color:#00d4ff;font-size:12px;text-decoration:none;font-family:monospace;letter-spacing:0.05em;">→ Open Mission Control Briefing</a>
    <div style="color:#1e293b;font-size:10px;margin-top:6px;font-family:monospace;">Automatische briefing — 2× per dag</div>
  </div>

</div>
</body>
</html>`
}

async function runBriefingEmail() {
  if (!RESEND_API_KEY) {
    return { ok: false, status: 500, error: 'RESEND_API_KEY not configured' }
  }

  const today = amsterdamDate(0)
  const in7days = amsterdamDate(7)
  const hour = amsterdamHour()
  const type: 'ochtend' | 'avond' = hour < 14 ? 'ochtend' : 'avond'
  const dateStr = amsterdamDateFormatted()
  const timeStr = amsterdamTimeStr()

  const [tasks, notes, events, sessions, costs] = await Promise.all([
    sbFetch('tasks?select=id,title,project,status,priority&status=in.(todo,in_progress)&order=priority.asc,created_at.asc'),
    sbFetch('notes?select=id,title,content,created_at&processed=eq.false&order=created_at.desc&limit=10'),
    sbFetch(`planner_events?select=id,title,event_date,event_time,description,category&status=eq.planned&event_date=gte.${today}&event_date=lte.${in7days}&order=event_date.asc,event_time.asc`),
    sbFetch('agent_sessions?select=id&status=eq.active'),
    sbFetch(`cost_tracking?select=cost_usd&date=eq.${today}`),
  ])

  const todayEvents = (events as EventRow[]).filter(e => e.event_date === today)
  const upcomingEvents = (events as EventRow[]).filter(e => e.event_date > today)
  const activeSessions = (sessions as { id: string }[]).length
  const todayCost = (costs as { cost_usd: number }[]).reduce((s, c) => s + Number(c.cost_usd || 0), 0)

  const html = buildHtml({
    tasks: tasks as TaskRow[],
    notes: notes as NoteRow[],
    todayEvents,
    upcomingEvents,
    activeSessions,
    todayCost,
    type,
    dateStr,
    timeStr,
    today,
  })

  const subject = type === 'ochtend'
    ? `🌅 Ochtend briefing — ${today}`
    : `🌆 Avond rapport — ${today}`

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM_EMAIL, to: [TO_EMAIL], subject, html }),
  })

  if (!res.ok) {
    const err = await res.text()
    return { ok: false, status: 500, error: 'resend_failed', detail: err }
  }

  const data = await res.json() as { id?: string }
  return { ok: true, status: 200, id: data.id, type, to: TO_EMAIL }
}

export async function GET(req: NextRequest) {
  if (!authorize(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const result = await runBriefingEmail()
  return NextResponse.json(result, { status: result.status })
}

export async function POST(req: NextRequest) {
  if (!authorize(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const result = await runBriefingEmail()
  return NextResponse.json(result, { status: result.status })
}
