'use client'

import { useEffect, useState } from 'react'
import { parseISO, differenceInMinutes } from 'date-fns'
import { Bell, X } from 'lucide-react'

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
      { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` }, cache: 'no-store' }
    )
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

function notifKey(id: string, win: number) {
  return `mc_notif_${new Date().toISOString().slice(0, 10)}_${id}_${win}`
}

function fireNotification(title: string, body: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) return
  if (Notification.permission !== 'granted') return
  try {
    new Notification(title, { body, icon: '/favicon.ico', tag: title })
  } catch { /* ignore */ }
}

function checkEvents(events: SlimEvent[]) {
  const now = new Date()
  for (const ev of events) {
    if (!ev.event_time) continue
    const eventDt = parseISO(`${ev.event_date}T${ev.event_time}`)
    const mins = differenceInMinutes(eventDt, now)

    if (mins >= 80 && mins <= 100) {
      const key = notifKey(ev.id, 90)
      if (!localStorage.getItem(key)) {
        fireNotification('⏰ Afspraak over ~90 min', ev.title + (ev.description ? `\n${ev.description}` : ''))
        localStorage.setItem(key, '1')
      }
    }
    if (mins >= 50 && mins <= 70) {
      const key = notifKey(ev.id, 60)
      if (!localStorage.getItem(key)) {
        fireNotification('⏰ Afspraak over ~60 min', ev.title + (ev.description ? `\n${ev.description}` : ''))
        localStorage.setItem(key, '1')
      }
    }
    if (mins >= 22 && mins <= 38) {
      const key = notifKey(ev.id, 30)
      if (!localStorage.getItem(key)) {
        fireNotification('🔔 Afspraak over ~30 min — vertrek op tijd!', ev.title)
        localStorage.setItem(key, '1')
      }
    }
  }
}

export function AgendaNotifications() {
  const [permission, setPermission] = useState<NotificationPermission | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return
    setPermission(Notification.permission)
  }, [])

  useEffect(() => {
    if (permission !== 'granted') return

    async function tick() {
      const events = await fetchTodayEvents()
      checkEvents(events)
    }

    tick()
    const id = setInterval(tick, 60_000)
    return () => clearInterval(id)
  }, [permission])

  async function requestPermission() {
    const result = await Notification.requestPermission()
    setPermission(result)
  }

  // Geen banner nodig als al toegestaan, geweigerd, of weggetipt
  if (permission !== 'default' || dismissed) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 14px',
        borderRadius: 10,
        background: 'rgba(7,7,15,0.97)',
        border: '1px solid rgba(0,212,255,0.3)',
        boxShadow: '0 0 24px rgba(0,212,255,0.15)',
        backdropFilter: 'blur(16px)',
        maxWidth: 320,
      }}
    >
      <Bell size={14} style={{ color: '#00d4ff', flexShrink: 0 }} />
      <span className="font-terminal text-xs" style={{ color: '#cbd5e1', flex: 1 }}>
        Notificaties inschakelen voor agenda-herinneringen?
      </span>
      <button
        onClick={requestPermission}
        className="font-terminal text-xs px-2 py-1 rounded"
        style={{
          background: 'rgba(0,212,255,0.15)',
          border: '1px solid rgba(0,212,255,0.4)',
          color: '#00d4ff',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        Ja, inschakelen
      </button>
      <button
        onClick={() => setDismissed(true)}
        style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: 2, flexShrink: 0 }}
      >
        <X size={12} />
      </button>
    </div>
  )
}
