export const dynamic = 'force-dynamic'
export const maxDuration = 20

import { NextRequest, NextResponse } from 'next/server'

const CRON_SECRET   = process.env.CRON_SECRET || ''
const RESEND_KEY    = process.env.RESEND_API_KEY || ''
const FROM_EMAIL    = process.env.BRIEFING_FROM_EMAIL || 'noreply@missioncontrol.dev'
const TO_EMAIL      = process.env.BRIEFING_TO_EMAIL || 'mmnl34@gmail.com'
const SB_URL        = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SB_KEY_PUBLIC = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SB_HEADERS    = { apikey: SB_KEY_PUBLIC, Authorization: `Bearer ${SB_KEY_PUBLIC}` }

function authorize(req: NextRequest): boolean {
  if (!CRON_SECRET) return false
  const auth = req.headers.get('authorization') || ''
  if (auth === `Bearer ${CRON_SECRET}`) return true
  if (req.headers.get('x-cron-secret') === CRON_SECRET) return true
  return false
}

type TaskRow = { id: string; title: string; content: string | null; created_at: string; status: string }

async function sbFetch(path: string) {
  try {
    const r = await fetch(`${SB_URL}/rest/v1/${path}`, { headers: SB_HEADERS, cache: 'no-store' })
    if (!r.ok) return []
    return r.json()
  } catch { return [] }
}

async function run() {
  if (!RESEND_KEY) return { ok: false, error: 'RESEND_API_KEY not set' }

  // Find Helix contact tasks created in the last 60 minutes
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const tasks: TaskRow[] = await sbFetch(
    `tasks?project=eq.Helix Studio Contact&created_at=gte.${since}&select=id,title,content,created_at,status&order=created_at.desc`
  )

  if (tasks.length === 0) return { ok: true, sent: false, reason: 'no new contacts' }

  const now = new Date().toLocaleString('nl-NL', { timeZone: 'Europe/Amsterdam', hour: '2-digit', minute: '2-digit' })
  const dateStr = new Date().toLocaleDateString('nl-NL', { timeZone: 'Europe/Amsterdam', weekday: 'long', day: 'numeric', month: 'long' })

  const rowsHtml = tasks.map(t => `
    <div style="padding:12px 14px;margin-bottom:8px;background:rgba(0,212,255,0.04);border:1px solid rgba(0,212,255,0.15);border-radius:8px;border-left:3px solid #00d4ff;">
      <div style="color:#f1f5f9;font-size:14px;font-weight:600;margin-bottom:4px;">${t.title}</div>
      ${t.content ? `<div style="color:#94a3b8;font-size:12px;line-height:1.5;">${t.content.slice(0, 300)}${t.content.length > 300 ? '…' : ''}</div>` : ''}
      <div style="color:#334155;font-size:10px;font-family:monospace;margin-top:6px;">${new Date(t.created_at).toLocaleString('nl-NL', { timeZone: 'Europe/Amsterdam' })}</div>
    </div>
  `).join('')

  const html = `<!DOCTYPE html>
<html lang="nl">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#070710;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:20px 14px;">
  <div style="background:linear-gradient(135deg,#0f1623,#111827);border:1px solid rgba(0,212,255,0.2);border-radius:12px;padding:24px;margin-bottom:12px;">
    <div style="color:#00d4ff;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;font-family:monospace;margin-bottom:6px;">🚨 HELIX STUDIO</div>
    <div style="color:#f1f5f9;font-size:20px;font-weight:700;">Nieuwe contactaanvraag${tasks.length > 1 ? `en (${tasks.length})` : ''}</div>
    <div style="color:#475569;font-size:12px;margin-top:4px;text-transform:capitalize;">${dateStr} · ${now}</div>
  </div>

  <div style="background:#0f1623;border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:18px;margin-bottom:10px;">
    <div style="color:#00d4ff;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;font-family:monospace;margin-bottom:12px;">Contacten</div>
    ${rowsHtml}
  </div>

  <div style="text-align:center;padding:10px 0;">
    <a href="https://mission-control-kl7g.vercel.app/helix" style="color:#00d4ff;font-size:12px;text-decoration:none;font-family:monospace;">→ Open Helix Pipeline</a>
    <div style="color:#1e293b;font-size:10px;margin-top:6px;font-family:monospace;">Automatische notificatie via Mission Control</div>
  </div>
</div>
</body>
</html>`

  const subject = tasks.length === 1
    ? `🚨 Helix contact: ${tasks[0].title}`
    : `🚨 Helix Studio — ${tasks.length} nieuwe contactaanvragen`

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM_EMAIL, to: [TO_EMAIL], subject, html }),
  })

  if (!res.ok) {
    const err = await res.text()
    return { ok: false, error: 'resend_failed', detail: err }
  }

  const data = await res.json() as { id?: string }
  return { ok: true, sent: true, count: tasks.length, id: data.id }
}

export async function GET(req: NextRequest) {
  if (!authorize(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const result = await run()
  return NextResponse.json(result, { status: result.ok ? 200 : 500 })
}

export async function POST(req: NextRequest) {
  if (!authorize(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const result = await run()
  return NextResponse.json(result, { status: result.ok ? 200 : 500 })
}
