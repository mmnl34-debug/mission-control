'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const THROTTLE_MS = 2500

export function DashboardRealtime() {
  const router = useRouter()
  const lastRefresh = useRef(0)
  const pendingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function scheduleRefresh() {
      const now = Date.now()
      const since = now - lastRefresh.current
      if (since >= THROTTLE_MS) {
        lastRefresh.current = now
        router.refresh()
      } else if (!pendingTimer.current) {
        pendingTimer.current = setTimeout(() => {
          lastRefresh.current = Date.now()
          pendingTimer.current = null
          router.refresh()
        }, THROTTLE_MS - since)
      }
    }

    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cost_tracking' }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notes' }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'planner_events' }, scheduleRefresh)
      .subscribe()

    return () => {
      if (pendingTimer.current) clearTimeout(pendingTimer.current)
      supabase.removeChannel(channel)
    }
  }, [router])

  return null
}
