'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Bell, BellOff, Plus, X, Check, Clock, Trash2, Zap, Pencil, PlayCircle, AlertTriangle,
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { nl } from 'date-fns/locale'
import { supabase, type AlertRule, type AlertRuleType } from '@/lib/supabase'

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SB_HEADERS = {
  apikey: SB_KEY,
  Authorization: `Bearer ${SB_KEY}`,
  'Content-Type': 'application/json',
}

const TYPE_OPTIONS: { value: AlertRuleType; label: string; unit: string; unitBefore: boolean; hint: string }[] = [
  { value: 'daily_cost',   label: 'Dagelijkse API-kosten > drempel (USD)',    unit: '$',   unitBefore: true,  hint: 'alleen Slack-bot API-kosten (session_id = slack-*). Claude Code lokaal telt niet mee.' },
  { value: 'hourly_spike', label: 'API-kostenpiek laatste uur > drempel (USD)', unit: '$', unitBefore: true,  hint: 'alleen Slack-bot API-kosten in de laatste 60 min.' },
  { value: 'agent_idle',   label: 'Agent idle > drempel (minuten)',            unit: 'min', unitBefore: false, hint: 'triggert als een active agent langer dan drempel niet heeft geseend' },
]

function typeMeta(t: AlertRuleType) {
  return TYPE_OPTIONS.find((o) => o.value === t) ?? TYPE_OPTIONS[0]
}

function fmtThreshold(rule: AlertRule): string {
  const m = typeMeta(rule.type)
  return m.unitBefore ? `${m.unit}${rule.threshold}` : `${rule.threshold} ${m.unit}`
}

type Draft = {
  name: string
  type: AlertRuleType
  threshold: string
  channel: string
  cooldown_minutes: string
}

const EMPTY_DRAFT: Draft = {
  name: '',
  type: 'daily_cost',
  threshold: '',
  channel: '#orchestrator',
  cooldown_minutes: '60',
}

type Props = { initialRules: AlertRule[] }

export function AlertsPage({ initialRules }: Props) {
  const [rules, setRules] = useState<AlertRule[]>(initialRules)
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive' | 'fired'>('all')
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<Draft>(EMPTY_DRAFT)
  const [busy, setBusy] = useState<string | null>(null)
  const [pingResult, setPingResult] = useState<string | null>(null)

  useEffect(() => {
    const channel = supabase
      .channel('alerts-page')
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

  const counts = useMemo(() => ({
    all: rules.length,
    active: rules.filter((r) => r.enabled).length,
    inactive: rules.filter((r) => !r.enabled).length,
    fired: rules.filter((r) => !!r.last_fired_at).length,
  }), [rules])

  const filtered = useMemo(() => {
    const byFilter = rules.filter((r) => {
      if (filter === 'active') return r.enabled
      if (filter === 'inactive') return !r.enabled
      if (filter === 'fired') return !!r.last_fired_at
      return true
    })
    return [...byFilter].sort((a, b) => a.name.localeCompare(b.name))
  }, [rules, filter])

  const createRule = async () => {
    const threshold = parseFloat(draft.threshold)
    const cooldown = parseInt(draft.cooldown_minutes, 10)
    if (!draft.name.trim() || isNaN(threshold) || threshold <= 0 || isNaN(cooldown) || cooldown < 1) return
    const payload = {
      name: draft.name.trim(),
      type: draft.type,
      threshold,
      channel: draft.channel.trim() || '#orchestrator',
      cooldown_minutes: cooldown,
      enabled: true,
    }
    const res = await fetch(`${SB_URL}/rest/v1/alert_rules`, {
      method: 'POST',
      headers: { ...SB_HEADERS, Prefer: 'return=representation' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) return
    const [created] = (await res.json()) as AlertRule[]
    setRules((prev) => [...prev.filter((r) => r.id !== created.id), created])
    setCreating(false)
    setDraft(EMPTY_DRAFT)
  }

  const startEdit = (rule: AlertRule) => {
    setEditingId(rule.id)
    setEditDraft({
      name: rule.name,
      type: rule.type,
      threshold: String(rule.threshold),
      channel: rule.channel,
      cooldown_minutes: String(rule.cooldown_minutes),
    })
  }

  const saveEdit = async (rule: AlertRule) => {
    const threshold = parseFloat(editDraft.threshold)
    const cooldown = parseInt(editDraft.cooldown_minutes, 10)
    if (!editDraft.name.trim() || isNaN(threshold) || threshold <= 0 || isNaN(cooldown) || cooldown < 1) {
      setEditingId(null)
      return
    }
    const payload = {
      name: editDraft.name.trim(),
      type: editDraft.type,
      threshold,
      channel: editDraft.channel.trim() || '#orchestrator',
      cooldown_minutes: cooldown,
    }
    setBusy(rule.id)
    await fetch(`${SB_URL}/rest/v1/alert_rules?id=eq.${rule.id}`, {
      method: 'PATCH',
      headers: { ...SB_HEADERS, Prefer: 'return=minimal' },
      body: JSON.stringify(payload),
    })
    setEditingId(null)
    setBusy(null)
  }

  const toggleEnabled = async (rule: AlertRule) => {
    setBusy(rule.id)
    await fetch(`${SB_URL}/rest/v1/alert_rules?id=eq.${rule.id}`, {
      method: 'PATCH',
      headers: { ...SB_HEADERS, Prefer: 'return=minimal' },
      body: JSON.stringify({ enabled: !rule.enabled }),
    })
    setBusy(null)
  }

  const resetCooldown = async (rule: AlertRule) => {
    setBusy(rule.id)
    await fetch(`${SB_URL}/rest/v1/alert_rules?id=eq.${rule.id}`, {
      method: 'PATCH',
      headers: { ...SB_HEADERS, Prefer: 'return=minimal' },
      body: JSON.stringify({ last_fired_at: null }),
    })
    setBusy(null)
  }

  const deleteRule = async (rule: AlertRule) => {
    if (!confirm(`Regel "${rule.name}" verwijderen?`)) return
    setBusy(rule.id)
    await fetch(`${SB_URL}/rest/v1/alert_rules?id=eq.${rule.id}`, {
      method: 'DELETE',
      headers: SB_HEADERS,
    })
    setBusy(null)
  }

  const runCheckNow = async () => {
    setPingResult('bezig…')
    try {
      const res = await fetch('/api/alerts/run-check', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) {
        setPingResult(`❌ ${json.error ?? 'onbekende fout'}`)
      } else {
        const fired = json.fired?.length ?? 0
        const skipped = json.skipped?.length ?? 0
        setPingResult(`✓ ${fired} alert(s) verzonden · ${skipped} overgeslagen`)
      }
    } catch (err) {
      setPingResult(`❌ ${String(err)}`)
    }
  }

  return (
    <div className="relative min-h-full">
      <div className="orb-cyan" style={{ top: '-100px', right: '-100px' }} />

      <div className="relative z-10 p-6 space-y-5">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1
              className="text-2xl font-bold tracking-widest uppercase font-terminal glow-text"
              style={{ color: '#f1f5f9', letterSpacing: '0.2em' }}
            >
              Alerts
            </h1>
            <p className="font-terminal text-xs tracking-wider mt-1" style={{ color: '#334155' }}>
              {counts.all} regels · {counts.active} actief · elke 15 min geëvalueerd via GitHub Actions
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={runCheckNow}
              className="flex items-center gap-2 px-3 py-2 rounded-lg font-terminal text-xs"
              style={{
                background: 'rgba(245,158,11,0.08)',
                border: '1px solid rgba(245,158,11,0.25)',
                color: '#f59e0b',
                cursor: 'pointer',
              }}
            >
              <PlayCircle size={12} />
              Check nu
            </button>
            <button
              onClick={() => { setCreating(true); setDraft(EMPTY_DRAFT) }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg font-terminal text-xs"
              style={{
                background: 'rgba(0,212,255,0.08)',
                border: '1px solid rgba(0,212,255,0.25)',
                color: '#00d4ff',
                cursor: 'pointer',
              }}
            >
              <Plus size={12} />
              Nieuwe regel
            </button>
          </div>
        </div>

        {pingResult && (
          <div
            className="font-terminal text-xs px-3 py-2 rounded"
            style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', color: '#f59e0b' }}
          >
            {pingResult}
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          {([
            { k: 'all', label: 'Alle', count: counts.all },
            { k: 'active', label: 'Actief', count: counts.active },
            { k: 'inactive', label: 'Uit', count: counts.inactive },
            { k: 'fired', label: 'Ooit afgegaan', count: counts.fired },
          ] as const).map((t) => {
            const active = filter === t.k
            return (
              <button
                key={t.k}
                onClick={() => setFilter(t.k)}
                className="px-3 py-1.5 rounded-full font-terminal text-xs"
                style={{
                  background: active ? 'rgba(0,212,255,0.14)' : 'rgba(0,212,255,0.03)',
                  border: `1px solid ${active ? 'rgba(0,212,255,0.35)' : 'rgba(0,212,255,0.1)'}`,
                  color: active ? '#00d4ff' : '#64748b',
                  cursor: 'pointer',
                }}
              >
                {t.label} · {t.count}
              </button>
            )
          })}
        </div>

        {/* Create form */}
        {creating && (
          <div className="hud-card p-4 space-y-3">
            <div className="hud-corners-bottom" />
            <div className="flex items-center justify-between">
              <span className="hud-label">Nieuwe alert-regel</span>
              <button
                onClick={() => { setCreating(false); setDraft(EMPTY_DRAFT) }}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                <X size={14} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="Naam (bv. 'Daggrens $5')"
                className="w-full font-terminal text-sm"
                style={{
                  background: 'rgba(0,212,255,0.03)', border: '1px solid rgba(0,212,255,0.12)',
                  borderRadius: 6, padding: '8px 10px', color: '#f1f5f9', outline: 'none',
                }}
              />
              <select
                value={draft.type}
                onChange={(e) => setDraft({ ...draft, type: e.target.value as AlertRuleType })}
                className="font-terminal text-sm"
                style={{
                  background: 'rgba(0,212,255,0.03)', border: '1px solid rgba(0,212,255,0.12)',
                  borderRadius: 6, padding: '8px 10px', color: '#f1f5f9', outline: 'none',
                }}
              >
                {TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>

              <input
                type="number"
                step="0.5"
                min="0"
                value={draft.threshold}
                onChange={(e) => setDraft({ ...draft, threshold: e.target.value })}
                placeholder={`Drempelwaarde (${typeMeta(draft.type).unit})`}
                className="w-full font-terminal text-sm"
                style={{
                  background: 'rgba(0,212,255,0.03)', border: '1px solid rgba(0,212,255,0.12)',
                  borderRadius: 6, padding: '8px 10px', color: '#f1f5f9', outline: 'none',
                }}
              />
              <input
                type="number"
                step="1"
                min="1"
                value={draft.cooldown_minutes}
                onChange={(e) => setDraft({ ...draft, cooldown_minutes: e.target.value })}
                placeholder="Cooldown in minuten"
                className="w-full font-terminal text-sm"
                style={{
                  background: 'rgba(0,212,255,0.03)', border: '1px solid rgba(0,212,255,0.12)',
                  borderRadius: 6, padding: '8px 10px', color: '#f1f5f9', outline: 'none',
                }}
              />

              <input
                value={draft.channel}
                onChange={(e) => setDraft({ ...draft, channel: e.target.value })}
                placeholder="Slack kanaal (#orchestrator)"
                className="w-full font-terminal text-sm md:col-span-2"
                style={{
                  background: 'rgba(0,212,255,0.03)', border: '1px solid rgba(0,212,255,0.12)',
                  borderRadius: 6, padding: '8px 10px', color: '#f1f5f9', outline: 'none',
                }}
              />
            </div>

            <p className="font-terminal text-xs" style={{ color: '#64748b' }}>
              {typeMeta(draft.type).hint}
            </p>

            <div className="flex justify-end">
              <button
                onClick={createRule}
                disabled={!draft.name.trim() || !draft.threshold}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md font-terminal text-xs"
                style={{
                  background: draft.name.trim() && draft.threshold ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.05)',
                  border: '1px solid rgba(16,185,129,0.3)',
                  color: draft.name.trim() && draft.threshold ? '#10b981' : '#475569',
                  cursor: draft.name.trim() && draft.threshold ? 'pointer' : 'not-allowed',
                }}
              >
                <Check size={12} />
                Regel opslaan
              </button>
            </div>
          </div>
        )}

        {/* Rule list */}
        <div className="space-y-3">
          {filtered.map((rule) => {
            const meta = typeMeta(rule.type)
            const isEditing = editingId === rule.id
            const borderColor = !rule.enabled
              ? 'rgba(100,116,139,0.4)'
              : rule.last_fired_at
                ? 'rgba(245,158,11,0.5)'
                : 'rgba(16,185,129,0.4)'
            return (
              <div
                key={rule.id}
                className="hud-card p-4"
                style={{
                  background: !rule.enabled ? 'rgba(100,116,139,0.02)' : 'rgba(0,212,255,0.02)',
                  borderLeft: `2px solid ${borderColor}`,
                }}
              >
                <div className="hud-corners-bottom" />

                {isEditing ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input
                        value={editDraft.name}
                        onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })}
                        className="w-full font-terminal text-sm"
                        style={{
                          background: 'rgba(0,212,255,0.03)', border: '1px solid rgba(0,212,255,0.12)',
                          borderRadius: 6, padding: '8px 10px', color: '#f1f5f9', outline: 'none',
                        }}
                      />
                      <select
                        value={editDraft.type}
                        onChange={(e) => setEditDraft({ ...editDraft, type: e.target.value as AlertRuleType })}
                        className="font-terminal text-sm"
                        style={{
                          background: 'rgba(0,212,255,0.03)', border: '1px solid rgba(0,212,255,0.12)',
                          borderRadius: 6, padding: '8px 10px', color: '#f1f5f9', outline: 'none',
                        }}
                      >
                        {TYPE_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={editDraft.threshold}
                        onChange={(e) => setEditDraft({ ...editDraft, threshold: e.target.value })}
                        placeholder={`Drempel (${typeMeta(editDraft.type).unit})`}
                        className="w-full font-terminal text-sm"
                        style={{
                          background: 'rgba(0,212,255,0.03)', border: '1px solid rgba(0,212,255,0.12)',
                          borderRadius: 6, padding: '8px 10px', color: '#f1f5f9', outline: 'none',
                        }}
                      />
                      <input
                        type="number"
                        step="1"
                        min="1"
                        value={editDraft.cooldown_minutes}
                        onChange={(e) => setEditDraft({ ...editDraft, cooldown_minutes: e.target.value })}
                        placeholder="Cooldown (min)"
                        className="w-full font-terminal text-sm"
                        style={{
                          background: 'rgba(0,212,255,0.03)', border: '1px solid rgba(0,212,255,0.12)',
                          borderRadius: 6, padding: '8px 10px', color: '#f1f5f9', outline: 'none',
                        }}
                      />
                      <input
                        value={editDraft.channel}
                        onChange={(e) => setEditDraft({ ...editDraft, channel: e.target.value })}
                        className="w-full font-terminal text-sm md:col-span-2"
                        style={{
                          background: 'rgba(0,212,255,0.03)', border: '1px solid rgba(0,212,255,0.12)',
                          borderRadius: 6, padding: '8px 10px', color: '#f1f5f9', outline: 'none',
                        }}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1.5 rounded-md font-terminal text-xs"
                        style={{ background: 'rgba(100,116,139,0.08)', border: '1px solid rgba(100,116,139,0.25)', color: '#94a3b8', cursor: 'pointer' }}
                      >
                        Annuleer
                      </button>
                      <button
                        onClick={() => saveEdit(rule)}
                        disabled={busy === rule.id}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-md font-terminal text-xs"
                        style={{
                          background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)',
                          color: '#10b981', cursor: 'pointer',
                        }}
                      >
                        <Check size={12} /> Opslaan
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-terminal text-sm font-semibold" style={{ color: rule.enabled ? '#f1f5f9' : '#64748b' }}>
                            {rule.name}
                          </h3>
                          <span
                            className="px-1.5 py-0.5 rounded font-terminal"
                            style={{
                              fontSize: 9,
                              background: 'rgba(100,116,139,0.1)',
                              color: '#94a3b8',
                              border: '1px solid rgba(100,116,139,0.2)',
                              letterSpacing: '0.08em',
                              textTransform: 'uppercase',
                            }}
                          >
                            {rule.type.replace('_', ' ')}
                          </span>
                          <span
                            className="px-1.5 py-0.5 rounded font-terminal"
                            style={{
                              fontSize: 9,
                              background: rule.enabled ? 'rgba(16,185,129,0.1)' : 'rgba(100,116,139,0.08)',
                              color: rule.enabled ? '#10b981' : '#64748b',
                              border: `1px solid ${rule.enabled ? 'rgba(16,185,129,0.2)' : 'rgba(100,116,139,0.2)'}`,
                              letterSpacing: '0.08em',
                              textTransform: 'uppercase',
                            }}
                          >
                            {rule.enabled ? 'actief' : 'uit'}
                          </span>
                          {rule.last_fired_at && (
                            <span
                              className="px-1.5 py-0.5 rounded font-terminal flex items-center gap-1"
                              style={{
                                fontSize: 9,
                                background: 'rgba(245,158,11,0.08)',
                                color: '#f59e0b',
                                border: '1px solid rgba(245,158,11,0.2)',
                                letterSpacing: '0.08em',
                                textTransform: 'uppercase',
                              }}
                            >
                              <Zap size={9} /> laatste {formatDistanceToNow(new Date(rule.last_fired_at), { locale: nl, addSuffix: true })}
                            </span>
                          )}
                        </div>
                        <div className="font-terminal text-xs flex flex-wrap gap-3" style={{ color: '#94a3b8' }}>
                          <span>drempel: <strong style={{ color: '#f1f5f9' }}>{fmtThreshold(rule)}</strong></span>
                          <span>cooldown: {rule.cooldown_minutes}m</span>
                          <span>kanaal: <span style={{ color: '#00d4ff' }}>{rule.channel}</span></span>
                        </div>
                        <p className="font-terminal text-xs mt-1" style={{ color: '#64748b' }}>
                          {meta.hint}
                        </p>
                        {rule.last_message && (
                          <div
                            className="mt-2 px-3 py-2 rounded font-terminal text-xs whitespace-pre-wrap"
                            style={{
                              background: 'rgba(245,158,11,0.04)',
                              border: '1px solid rgba(245,158,11,0.15)',
                              color: '#cbd5e1',
                            }}
                          >
                            <div className="flex items-center gap-1 mb-1" style={{ color: '#f59e0b', fontSize: 10 }}>
                              <AlertTriangle size={10} />
                              laatste bericht · {rule.last_fired_at ? format(new Date(rule.last_fired_at), 'd MMM HH:mm', { locale: nl }) : '—'}
                            </div>
                            {rule.last_message}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => toggleEnabled(rule)}
                          disabled={busy === rule.id}
                          title={rule.enabled ? 'Zet uit' : 'Zet aan'}
                          style={{
                            background: rule.enabled ? 'rgba(16,185,129,0.08)' : 'rgba(100,116,139,0.06)',
                            border: `1px solid ${rule.enabled ? 'rgba(16,185,129,0.25)' : 'rgba(100,116,139,0.2)'}`,
                            borderRadius: 5, padding: 5,
                            color: rule.enabled ? '#10b981' : '#64748b',
                            cursor: 'pointer',
                          }}
                        >
                          {rule.enabled ? <Bell size={12} /> : <BellOff size={12} />}
                        </button>
                        <button
                          onClick={() => startEdit(rule)}
                          title="Bewerken"
                          style={{
                            background: 'rgba(0,212,255,0.06)',
                            border: '1px solid rgba(0,212,255,0.2)',
                            borderRadius: 5, padding: 5,
                            color: '#00d4ff', cursor: 'pointer',
                          }}
                        >
                          <Pencil size={12} />
                        </button>
                        {rule.last_fired_at && (
                          <button
                            onClick={() => resetCooldown(rule)}
                            disabled={busy === rule.id}
                            title="Reset cooldown (next check kan weer afgaan)"
                            style={{
                              background: 'rgba(245,158,11,0.06)',
                              border: '1px solid rgba(245,158,11,0.2)',
                              borderRadius: 5, padding: 5,
                              color: '#f59e0b', cursor: 'pointer',
                            }}
                          >
                            <Clock size={12} />
                          </button>
                        )}
                        <button
                          onClick={() => deleteRule(rule)}
                          disabled={busy === rule.id}
                          title="Verwijder"
                          style={{
                            background: 'rgba(239,68,68,0.06)',
                            border: '1px solid rgba(239,68,68,0.2)',
                            borderRadius: 5, padding: 5,
                            color: '#ef4444', cursor: 'pointer',
                          }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )
          })}

          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16" style={{ color: '#334155' }}>
              <Bell size={32} className="mb-3 opacity-30" />
              <p className="font-terminal text-sm">
                {rules.length === 0
                  ? 'Geen regels in de database. Voer eerst scripts/sql/alert_rules.sql uit in Supabase.'
                  : 'Geen regels in dit filter'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
