export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { verifySlackSignature } from '@/lib/slack/verify'
import { AGENTS, MANAGERS, SPECIALISTS } from '@/lib/slack/agents-registry'

export async function POST(req: NextRequest) {
  const raw = await req.text()
  const timestamp = req.headers.get('x-slack-request-timestamp')
  const signature = req.headers.get('x-slack-signature')
  if (!verifySlackSignature({ body: raw, timestamp, signature })) {
    return NextResponse.json({ error: 'invalid_signature' }, { status: 401 })
  }

  const params = new URLSearchParams(raw)
  const command = params.get('command') || ''
  const text = (params.get('text') || '').trim()

  if (command === '/agents') {
    const lines = [
      `*Team — ${AGENTS.length} agents*`,
      `_Managers (${MANAGERS.length}):_ ${MANAGERS.map(m => `<#${m.channel}|${m.channel}>`).join(' · ')}`,
      `_Specialisten (${SPECIALISTS.length}):_ ${SPECIALISTS.map(s => s.key).join(', ')}`,
      '',
      'Open een kanaal om rechtstreeks met één agent te praten, of gebruik <#orchestrator|orchestrator> om werk te laten verdelen.',
    ]
    return NextResponse.json({ response_type: 'ephemeral', text: lines.join('\n') })
  }

  if (command === '/agent') {
    if (!text) {
      return NextResponse.json({ response_type: 'ephemeral', text: 'Gebruik: `/agent <naam>` — bijv. `/agent mgr-ad`' })
    }
    const agent = AGENTS.find(a => a.key === text || a.channel === text)
    if (!agent) return NextResponse.json({ response_type: 'ephemeral', text: `Geen agent '${text}' gevonden.` })
    return NextResponse.json({
      response_type: 'ephemeral',
      text: `*${agent.key}* — ${agent.description}\nKanaal: <#${agent.channel}|${agent.channel}> · Model: ${agent.model}${agent.manager ? ` · Manager: ${agent.manager}` : ''}`,
    })
  }

  return NextResponse.json({ response_type: 'ephemeral', text: `Onbekend commando ${command}` })
}

export async function GET() {
  return NextResponse.json({ status: 'ok', endpoint: 'POST /api/slack/commands' })
}
