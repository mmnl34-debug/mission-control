export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

const SB_URL = 'https://logkkueavewqmaquuwfw.supabase.co'
const SB_KEY = 'sb_publishable_nqPICLQDoaXGb8hshPIYYg_uv9GRuid'

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('session_id')
  if (!sessionId) {
    return NextResponse.json({ error: 'session_id required' }, { status: 400 })
  }

  const url = `${SB_URL}/rest/v1/agent_logs?session_id=eq.${encodeURIComponent(sessionId)}&order=created_at.asc&limit=200`

  const res = await fetch(url, {
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
    },
    cache: 'no-store',
  })

  if (!res.ok) {
    return NextResponse.json({ error: 'Upstream error' }, { status: res.status })
  }

  const data = await res.json()
  return NextResponse.json(data)
}
