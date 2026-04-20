export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET() {
  const results: Record<string, unknown> = {
    env: {
      url: SUPABASE_URL,
      keyPresent: !!SUPABASE_KEY,
      keyPrefix: SUPABASE_KEY.slice(0, 20),
    }
  }

  // Test raw fetch (bypass SDK)
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/agent_sessions?select=id,status&limit=3`, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
      cache: 'no-store',
    })
    const text = await res.text()
    results.rawFetch = { status: res.status, body: text }
  } catch (e) {
    results.rawFetch = { error: String(e) }
  }

  // Test via Supabase SDK
  try {
    const { createClient } = await import('@supabase/supabase-js')
    const sb = createClient(SUPABASE_URL, SUPABASE_KEY)
    const { data, error } = await sb.from('agent_sessions').select('id,status').limit(3)
    results.sdkFetch = { data, error }
  } catch (e) {
    results.sdkFetch = { error: String(e) }
  }

  return NextResponse.json(results)
}
