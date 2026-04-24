export const dynamic = 'force-dynamic'
export const maxDuration = 30

import { NextRequest, NextResponse } from 'next/server'
import { postMessage } from '@/lib/slack/client'
import { SLACK_PROVISION_TOKEN, assertSlackConfigured } from '@/lib/slack/config'

function authorize(req: NextRequest): boolean {
  if (!SLACK_PROVISION_TOKEN) return false
  return req.headers.get('x-provision-token') === SLACK_PROVISION_TOKEN
}

export async function POST(req: NextRequest) {
  const cfg = assertSlackConfigured()
  if (!cfg.ok) return NextResponse.json({ error: 'slack_not_configured', missing: cfg.missing }, { status: 500 })
  if (!authorize(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const channel: string | undefined = body?.channel
  const text: string | undefined = body?.text
  const threadTs: string | undefined = body?.thread_ts

  if (!channel || !text) {
    return NextResponse.json(
      { error: 'missing_fields', hint: 'POST body: { "channel": "#orchestrator", "text": "..." }' },
      { status: 400 },
    )
  }

  const res = await postMessage({ channel, text, thread_ts: threadTs })
  if (!res.ok) {
    return NextResponse.json({ error: 'slack_post_failed', detail: res.error }, { status: 500 })
  }
  return NextResponse.json({ ok: true, ts: res.ts, channel: res.channel })
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: 'POST /api/slack/post',
    auth: 'Header: x-provision-token + body { channel: "#orchestrator", text: "...", thread_ts?: "..." }',
  })
}
