export const dynamic = 'force-dynamic'
export const maxDuration = 300

import { NextRequest, NextResponse } from 'next/server'
import { provisionAllChannels } from '@/lib/slack/provision'
import { authTest } from '@/lib/slack/client'
import { SLACK_PROVISION_TOKEN, assertSlackConfigured } from '@/lib/slack/config'

function authorize(req: NextRequest): boolean {
  if (!SLACK_PROVISION_TOKEN) return false
  return req.headers.get('x-provision-token') === SLACK_PROVISION_TOKEN
}

export async function POST(req: NextRequest) {
  const cfg = assertSlackConfigured()
  if (!cfg.ok) return NextResponse.json({ error: 'slack_not_configured', missing: cfg.missing }, { status: 500 })
  if (!authorize(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const auth = await authTest()
  if (!auth.ok) return NextResponse.json({ error: 'slack_auth_failed', detail: auth.error }, { status: 500 })

  const result = await provisionAllChannels()
  return NextResponse.json({ ok: true, ...result })
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: 'POST /api/slack/provision',
    auth: 'Header: x-provision-token: <SLACK_PROVISION_TOKEN>',
    note: 'Eenmalig uitvoeren om alle 58 kanalen aan te maken.',
  })
}
