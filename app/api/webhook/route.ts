export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET!

export async function POST(req: NextRequest) {
  // Authenticatie via header
  const secret = req.headers.get('x-webhook-secret')
  if (secret !== WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const {
    agent_name = 'webhook',
    event_type = 'info',
    message = '',
    details = {},
    session_id = null,
  } = body

  // Valideer event_type
  const validTypes = ['task_start', 'task_complete', 'tool_use', 'message', 'error', 'info']
  const safeType = validTypes.includes(event_type as string) ? event_type : 'info'

  const payload = {
    agent_name: String(agent_name).slice(0, 100),
    event_type: safeType,
    message: String(message).slice(0, 500),
    details: typeof details === 'object' ? details : { raw: details },
    session_id: session_id ?? null,
  }

  const res = await fetch(`${SB_URL}/rest/v1/agent_logs`, {
    method: 'POST',
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const err = await res.text()
    return NextResponse.json({ error: 'Database insert failed', detail: err }, { status: 500 })
  }

  const inserted = await res.json()
  return NextResponse.json({ ok: true, id: inserted[0]?.id }, { status: 201 })
}

// Health check
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: 'POST /api/webhook',
    auth: 'Header: x-webhook-secret: <secret>',
    payload: {
      agent_name: 'string',
      event_type: 'task_start | task_complete | tool_use | message | error | info',
      message: 'string',
      details: 'object (optional)',
      session_id: 'string (optional)',
    },
  })
}
