'use client'

import { useEffect, useState, useCallback } from 'react'
import { AlertTriangle, Calendar, X, CheckCircle } from 'lucide-react'

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const H = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` }

type Alert = { type: 'task' | 'event'; message: string; count: number }

export function JarvisProactive() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [dismissed, setDismissed] = useState(false)
  const [checked, setChecked] = useState(false)

  const check = useCallback(async () => {
    try {
      const today = new Date().toISOString().slice(0, 10)
      const todayEnd = `${today}T23:59:59.999Z`

      const [critTasks, overdueEvents] = await Promise.all([
        fetch(`${SB_URL}/rest/v1/tasks?status=eq.todo&priority=eq.1&select=id,title&limit=10`, { headers: H })
          .then(r => r.ok ? r.json() : []),
        fetch(`${SB_URL}/rest/v1/planner_events?status=eq.planned&event_date=eq.${today}&select=id,title&limit=10`, { headers: H })
          .then(r => r.ok ? r.json() : []),
      ])

      const newAlerts: Alert[] = []
      if (critTasks.length > 0) {
        newAlerts.push({ type: 'task', count: critTasks.length, message: critTasks.length === 1 ? critTasks[0].title : `${critTasks.length} kritieke taken open` })
      }
      if (overdueEvents.length > 0) {
        newAlerts.push({ type: 'event', count: overdueEvents.length, message: overdueEvents.length === 1 ? overdueEvents[0].title : `${overdueEvents.length} afspraken vandaag` })
      }

      setAlerts(newAlerts)
      setChecked(true)

      // Auto-dismiss after 20 seconds
      if (newAlerts.length > 0) {
        setTimeout(() => setDismissed(true), 20000)
      }
    } catch {
      setChecked(true)
    }
  }, [])

  useEffect(() => {
    // Small delay so page finishes loading first
    const t = setTimeout(check, 2500)
    return () => clearTimeout(t)
  }, [check])

  if (!checked || dismissed || alerts.length === 0) return null

  return (
    <div style={{
      position: 'fixed',
      top: 'calc(env(safe-area-inset-top, 0px) + 12px)',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 9000,
      minWidth: 280,
      maxWidth: 480,
      width: 'calc(100% - 32px)',
    }}>
      <div style={{
        background: 'rgba(7,7,15,0.97)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid rgba(245,158,11,0.3)',
        borderRadius: 10,
        padding: '10px 14px',
        boxShadow: '0 0 30px rgba(245,158,11,0.15), 0 8px 32px rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
      }}>
        {/* Icon */}
        <div style={{ flexShrink: 0, marginTop: 1 }}>
          <AlertTriangle size={14} style={{ color: '#f59e0b' }} />
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="font-terminal" style={{ fontSize: 9, color: '#f59e0b', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 5 }}>
            JARVIS ALERT
          </div>
          <div className="space-y-1">
            {alerts.map((a, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {a.type === 'task'
                  ? <CheckCircle size={10} style={{ color: '#ef4444', flexShrink: 0 }} />
                  : <Calendar size={10} style={{ color: '#3b82f6', flexShrink: 0 }} />
                }
                <span className="font-terminal text-xs truncate" style={{ color: '#cbd5e1' }}>{a.message}</span>
                {a.count > 1 && (
                  <span className="font-terminal shrink-0 px-1.5 py-0.5 rounded" style={{ fontSize: 8, background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}>
                    {a.count}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Dismiss */}
        <button
          onClick={() => setDismissed(true)}
          style={{
            flexShrink: 0,
            width: 22,
            height: 22,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: '#475569',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 4,
          }}
          aria-label="Sluit alert"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  )
}
