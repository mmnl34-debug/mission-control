export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://logkkueavewqmaquuwfw.supabase.co'
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvZ2trdWVhdmV3cW1hcXV1d2Z3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0NjQ1NzksImV4cCI6MjA5MTA0MDU3OX0.3H-HBY7RTIfp72mEUbV-hztaLn58V4z1M3ot-rl_mms'

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
