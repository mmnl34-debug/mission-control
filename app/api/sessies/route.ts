export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { listLiveSessions } from '@/lib/mc/local-sessions'

// Deze route leest lokale sessiebestanden uit ~/.claude. Mission Control staat ook op Vercel
// zonder auth, dus: nooit buiten de eigen machine beschikbaar maken.
const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/

function isLocal(req: NextRequest): boolean {
  if (process.env.VERCEL) return false
  if (!LOCAL_HOST.test(req.headers.get('host') ?? '')) return false // ook tegen DNS-rebinding
  const origin = req.headers.get('origin')
  if (origin) {
    try {
      if (!LOCAL_HOST.test(new URL(origin).host)) return false
    } catch {
      return false
    }
  }
  return true
}

export async function GET(req: NextRequest) {
  if (!isLocal(req)) {
    return NextResponse.json({ error: 'Alleen lokaal beschikbaar' }, { status: 404 })
  }
  const sessions = await listLiveSessions()
  return NextResponse.json({ sessions, at: Date.now() }, { headers: { 'cache-control': 'no-store' } })
}
