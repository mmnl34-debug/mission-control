export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { after } from 'next/server'
import { verifySlackSignature } from '@/lib/slack/verify'
import { handleEvent } from '@/lib/slack/router'
import { assertSlackConfigured } from '@/lib/slack/config'

export async function POST(req: NextRequest) {
  const raw = await req.text()

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  if (payload.type === 'url_verification') {
    return NextResponse.json({ challenge: payload.challenge })
  }

  const cfg = assertSlackConfigured()
  if (!cfg.ok) {
    console.error('[slack/events] slack_not_configured, missing:', cfg.missing)
    return NextResponse.json({ error: 'slack_not_configured', missing: cfg.missing }, { status: 500 })
  }

  const timestamp = req.headers.get('x-slack-request-timestamp')
  const signature = req.headers.get('x-slack-signature')
  if (!verifySlackSignature({ body: raw, timestamp, signature })) {
    console.error('[slack/events] invalid_signature', { timestamp, hasSig: !!signature })
    return NextResponse.json({ error: 'invalid_signature' }, { status: 401 })
  }

  if (payload.type === 'event_callback' && payload.event) {
    const ev = payload.event as Record<string, unknown>
    const evType = ev.type as string
    console.log('[slack/events] received', {
      type: evType,
      channel: ev.channel,
      user: ev.user,
      bot_id: ev.bot_id,
      subtype: ev.subtype,
      ts: ev.ts,
    })
    if (evType === 'message' || evType === 'app_mention') {
      after(async () => {
        try {
          await handleEvent(ev as Parameters<typeof handleEvent>[0])
          console.log('[slack/events] handleEvent done', { channel: ev.channel, ts: ev.ts })
        } catch (err) {
          console.error('[slack/events] handleEvent error', err)
        }
      })
    }
  }

  return NextResponse.json({ ok: true })
}

export async function GET() {
  return NextResponse.json({ status: 'ok', endpoint: 'POST /api/slack/events' })
}
