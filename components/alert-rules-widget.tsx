'use client'

import { useEffect, useState } from 'react'
import { Bell, BellOff, Pencil, Check, X, Zap } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { nl } from 'date-fns/locale'
import { supabase, type AlertRule, type AlertRuleType } from '@/lib/supabase'

type Props = { initialRules: AlertRule[] }

const TYPE_LABELS: Record<AlertRuleType, string> = {
  daily_cost: 'dagelijks',
  hourly_spike: 'piek/u',
  agent_idle: 'agent idle',
}

const TYPE_UNITS: Record<AlertRuleType, string> = {
  daily_cost: '$',
  hourly_spike: '$',
  agent_idle: 'min',
}

function unitBefore(type: AlertRuleType) {
  return TYPE_UNITS[type] === '$'
}

export function AlertRulesWidget({ initialRules }: Props) {
  const [rules, setRules] = useState<AlertRule[]>(initialRules)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    const channel = supabase
      .channel('alert-rules-widget')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alert_rules' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setRules((prev) => [...prev, payload.new as AlertRule])
        } else if (payload.eventType === 'UPDATE') {
          setRules((prev) => prev.map((r) => (r.id === (payload.new as AlertRule).id ? (payload.new as AlertRule) : r)))
        } else if (payload.eventType === 'DELETE') {
          setRules((prev) => prev.filter((r) => r.id !== (payload.old as { id: string }).id))
        }
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const toggleEnabled = async (rule: AlertRule) => {
    setBusy(rule.id)
    await supabase.from('alert_rules').update({ enabled: !rule.enabled }).eq('id', rule.id)
    setBusy(null)
  }

  const saveThreshold = async (rule: AlertRule) => {
    const val = parseFloat(draft)
    if (isNaN(val) || val <= 0) {
      setEditingId(null)
      return
    }
    setBusy(rule.id)
    await supabase.from('alert_rules').update({ threshold: val }).eq('id', rule.id)
    setEditingId(null)
    setBusy(null)
  }

  const sortedRules = [...rules].sort((a, b) => a.name.localeCompare(b.name))
  const activeCount = rules.filter((r) => r.enabled).length

  return (
    <div className="hud-card">
      <div className="hud-corners-bottom" />
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{ borderBottom: '1px solid rgba(0,212,255,0.08)' }}
      >
        <div className="flex items-center gap-2">
          <span className="hud-label">Alerts</span>
          <span
            className="font-terminal text-xs px-1.5 py-0.5 rounded"
            style={{
              background: activeCount > 0 ? 'rgba(0,212,255,0.1)' : 'rgba(100,116,139,0.1)',
              color: activeCount > 0 ? '#00d4ff' : '#64748b',
              fontSize: '10px',
            }}
          >
            {activeCount} actief
          </span>
        </div>
        <span className="font-terminal text-xs" style={{ color: '#334155' }}>
          realtime
        </span>
      </div>

      <div className="p-3 space-y-2">
        {sortedRules.length === 0 && (
          <div className="flex items-center justify-center py-4">
            <Bell size={14} style={{ color: '#334155' }} />
            <span className="font-terminal text-xs ml-2" style={{ color: '#334155' }}>
              Geen regels — voer SQL-migratie uit
            </span>
          </div>
        )}

        {sortedRules.map((rule) => {
          const isEditing = editingId === rule.id
          const dot = !rule.enabled ? '#475569' : rule.last_fired_at ? '#f59e0b' : '#10b981'
          const dimmed = !rule.enabled
          const unit = TYPE_UNITS[rule.type]
          const lastFired = rule.last_fired_at
            ? formatDistanceToNow(new Date(rule.last_fired_at), { locale: nl, addSuffix: true })
            : 'nog nooit'

          return (
            <div key={rule.id} className="flex items-center gap-2 py-1.5">
              <button
                onClick={() => toggleEnabled(rule)}
                disabled={busy === rule.id}
                title={rule.enabled ? 'Zet uit' : 'Zet aan'}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                {rule.enabled ? (
                  <Bell size={11} style={{ color: dot }} />
                ) : (
                  <BellOff size={11} style={{ color: dot }} />
                )}
              </button>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className="font-terminal text-xs truncate"
                    style={{ color: dimmed ? '#475569' : '#cbd5e1' }}
                  >
                    {rule.name}
                  </span>
                  <span
                    className="font-terminal px-1 py-0.5 rounded shrink-0"
                    style={{
                      background: 'rgba(100,116,139,0.1)',
                      color: '#94a3b8',
                      fontSize: '9px',
                      letterSpacing: '0.08em',
                    }}
                  >
                    {TYPE_LABELS[rule.type]}
                  </span>
                </div>
                <p className="font-terminal" style={{ color: '#334155', fontSize: '10px' }}>
                  laatst: {lastFired} · cooldown {rule.cooldown_minutes}m · {rule.channel}
                </p>
              </div>

              <div className="shrink-0">
                {isEditing ? (
                  <div className="flex items-center gap-1">
                    {unitBefore(rule.type) && (
                      <span className="font-terminal text-xs" style={{ color: '#475569' }}>
                        {unit}
                      </span>
                    )}
                    <input
                      autoFocus
                      type="number"
                      step="0.5"
                      min="0"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveThreshold(rule)
                        if (e.key === 'Escape') setEditingId(null)
                      }}
                      className="bg-transparent outline-none font-terminal text-xs"
                      style={{ color: '#f1f5f9', border: 'none', width: 56, textAlign: 'right' }}
                    />
                    {!unitBefore(rule.type) && (
                      <span className="font-terminal text-xs" style={{ color: '#475569' }}>
                        {unit}
                      </span>
                    )}
                    <button
                      onClick={() => saveThreshold(rule)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#10b981', padding: 0 }}
                    >
                      <Check size={12} />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 0 }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setEditingId(rule.id)
                      setDraft(String(rule.threshold))
                    }}
                    className="flex items-center gap-1"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: dimmed ? '#475569' : '#f1f5f9' }}
                    title="Drempel aanpassen"
                  >
                    <span className="font-terminal text-xs">
                      {unitBefore(rule.type) ? unit : ''}
                      {rule.threshold}
                      {!unitBefore(rule.type) ? ` ${unit}` : ''}
                    </span>
                    <Pencil size={10} style={{ color: '#334155' }} />
                  </button>
                )}
              </div>

              {rule.enabled && rule.last_fired_at && (
                <Zap size={10} style={{ color: '#f59e0b' }} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
