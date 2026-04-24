export const dynamic = 'force-dynamic'
export const maxDuration = 30

import { NextRequest, NextResponse } from 'next/server'
import { runAlertCheck } from '@/lib/alert-engine'

function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get('origin') || ''
  const host = req.headers.get('host') || ''
  if (!origin) return true
  try {
    const u = new URL(origin)
    return u.host === host
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const url = new URL(req.url)
  const force = url.searchParams.get('force') === '1'
  const result = await runAlertCheck({ force })
  return NextResponse.json(result, { status: result.status })
}
