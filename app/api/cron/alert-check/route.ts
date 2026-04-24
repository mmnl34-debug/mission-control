export const dynamic = 'force-dynamic'
export const maxDuration = 30

import { NextRequest, NextResponse } from 'next/server'
import { runAlertCheck } from '@/lib/alert-engine'

const CRON_SECRET = process.env.CRON_SECRET || ''

function authorize(req: NextRequest): boolean {
  if (!CRON_SECRET) return false
  const auth = req.headers.get('authorization') || ''
  if (auth === `Bearer ${CRON_SECRET}`) return true
  if (req.headers.get('x-cron-secret') === CRON_SECRET) return true
  return false
}

export async function GET(req: NextRequest) {
  if (!authorize(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const result = await runAlertCheck()
  return NextResponse.json(result, { status: result.status })
}

export async function POST(req: NextRequest) {
  if (!authorize(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const result = await runAlertCheck()
  return NextResponse.json(result, { status: result.status })
}
