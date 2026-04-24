export const dynamic = 'force-dynamic'

import { AlertsPage } from '@/components/alerts-page'
import type { AlertRule } from '@/lib/supabase'

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SB_HEADERS = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` }

async function getRules(): Promise<AlertRule[]> {
  const res = await fetch(`${SB_URL}/rest/v1/alert_rules?select=*&order=name.asc`, {
    headers: SB_HEADERS,
    cache: 'no-store',
  })
  if (!res.ok) return []
  return res.json()
}

export default async function AlertsRoute() {
  const rules = await getRules()
  return <AlertsPage initialRules={rules} />
}
