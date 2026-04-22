export const dynamic = 'force-dynamic'
export const maxDuration = 300

import { NextRequest, NextResponse } from 'next/server'
import { AGENTS } from '@/lib/slack/agents-registry'
import { conversationsList, inviteToConversation } from '@/lib/slack/client'
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
  const userId: string | undefined = body?.user_id
  if (!userId) return NextResponse.json({ error: 'missing_user_id', hint: 'POST body: { "user_id": "U0ABC1234" }' }, { status: 400 })

  const list = await conversationsList()
  if (!list.ok) return NextResponse.json({ error: 'slack_list_failed', detail: list.error }, { status: 500 })

  const byName = new Map((list.channels || []).map(c => [c.name, c.id]))
  const wantedNames = new Set(AGENTS.map(a => a.channel))

  const invited: string[] = []
  const alreadyIn: string[] = []
  const errors: { channel: string; error: string }[] = []

  for (const name of wantedNames) {
    const id = byName.get(name)
    if (!id) {
      errors.push({ channel: name, error: 'channel_not_found' })
      continue
    }
    const res = await inviteToConversation({ channel: id, users: userId })
    if (res.ok) {
      invited.push(name)
    } else if (res.error === 'already_in_channel') {
      alreadyIn.push(name)
    } else {
      errors.push({ channel: name, error: res.error || 'unknown' })
    }
    await new Promise(r => setTimeout(r, 150))
  }

  return NextResponse.json({ ok: true, invited, alreadyIn, errors })
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: 'POST /api/slack/invite-owner',
    auth: 'Header: x-provision-token + body { user_id: "U..." }',
  })
}
