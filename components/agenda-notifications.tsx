'use client'

import { useEffect } from 'react'
import { parseISO, differenceInMinutes } from 'date-fns'

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

type SlimEvent = {
  id: string
  title: string
  description: string | null
  event_date: string
  event_time: string | null
}

async function fetchTodayEvents(): Promise<SlimEvent[]> {
  const today = new Date().toISOString().slice(0, 10)
  try {
    const res = await fetch(
      `${SB_URL}/rest/v1/planner_events?status=eq.planned&event_date=eq.${today}&event_time=not.is.null&select=id,title,description,event_date,event_time`,
      {
        headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
        cache: 'no-store',
      }
    )
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

function notifKey(id: string, window: number) {
  const date = new Date().toISOString().slice(0, 10)
  return `mc_notif_${date}_${id}_${window}`
}

function fireNotification(title: string, body: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) return
  if (Notification.permission !== 'granted') return
  try {
    new Notification(title, { body, icon: '/favicon.ico', tag: title })
  } catch {
    // ignore — some browsers block programmatic notifications
  }
}

function checkEvents(events: SlimEvent[]) {
  const now = new Date()
  for (const ev of events) {
    if (!ev.event_time) continue
    const eventDt = parseISO(`${ev.event_date}T${ev.event_time}`)
    const mins = differenceInMinutes(eventDt, now)

    // 90 minuten: venster 80–100
    if (mins >= 80 && mins <= 100) {
      const key = notifKey(ev.id, 90)
      if (!localStorage.getItem(key)) {
        fireNotification(`⏰ Afspraak over ~90 min`, ev.title + (ev.description ? `\n${ev.description}` : ''))
        localStorage.setItem(key, '1')
      }
    }

    // 60 minuten: venster 50–70
    if (mins >= 50 && mins <= 70) {
      const key = notifKey(ev.id, 60)
      if (!localStorage.getItem(key)) {
        fireNotification(`⏰ Afspraak over ~60 min`, ev.title + (ev.description ? `\n${ev.description}` : ''))
        localStorage.setItem(key, '1')
      }
    }

    // 30 minuten: venster 22–38
    if (mins >= 22 && mins <= 38) {
      const key = notifKey(ev.id, 30)
      if (!localStorage.getItem(key)) {
        fireNotification(`🔔 Afspraak over ~30 min — vertrek op tijd!`, ev.title)
        localStorage.setItem(key, '1')
      }
    }
  }
}

export function AgendaNotifications() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return

    // Vraag toestemming zodra pagina geladen is
    if (Notification.permission === 'default') {
      Notification.requestPermission()
    }

    async function tick() {
      if (Notification.permission !== 'granted') return
      const events = await fetchTodayEvents()
      checkEvents(events)
    }

    tick()
    const id = setInterval(tick, 60_000)
    return () => clearInterval(id)
  }, [])

  return null
}
