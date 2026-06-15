'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Play, Pause, RotateCcw, Coffee, Target, Zap, CheckCircle2 } from 'lucide-react'

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const HEADERS = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' }

const WORK_SECS  = 25 * 60
const SHORT_SECS = 5  * 60
const LONG_SECS  = 15 * 60

type Mode = 'work' | 'short' | 'long'

function fmt(secs: number) {
  const m = String(Math.floor(secs / 60)).padStart(2, '0')
  const s = String(secs % 60).padStart(2, '0')
  return `${m}:${s}`
}

const MODES: { key: Mode; label: string; secs: number; color: string }[] = [
  { key: 'work',  label: '25 min focus', secs: WORK_SECS,  color: '#00d4ff' },
  { key: 'short', label: '5 min pauze',  secs: SHORT_SECS, color: '#10b981' },
  { key: 'long',  label: '15 min rust',  secs: LONG_SECS,  color: '#f59e0b' },
]

export default function FocusPage() {
  const [mode, setMode]           = useState<Mode>('work')
  const [secs, setSecs]           = useState(WORK_SECS)
  const [running, setRunning]     = useState(false)
  const [completed, setCompleted] = useState(0)
  const [sessions, setSessions]   = useState<{ mode: Mode; finishedAt: string }[]>([])
  const [tasks, setTasks]         = useState<{ id: string; title: string }[]>([])
  const [activeTask, setActiveTask] = useState<string>('')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Load open tasks
  useEffect(() => {
    fetch(`${SB_URL}/rest/v1/tasks?status=not.eq.done&select=id,title&order=priority.asc&limit=20`, {
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
    })
      .then(r => r.json())
      .then(setTasks)
      .catch(() => {})
  }, [])

  const currentMode = MODES.find(m => m.key === mode)!

  const stop = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = null
    setRunning(false)
  }, [])

  const onComplete = useCallback(() => {
    stop()
    if (mode === 'work') {
      setCompleted(c => c + 1)
      setSessions(prev => [{ mode: 'work' as Mode, finishedAt: new Date().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }) }, ...prev].slice(0, 8))
      // Log to Supabase
      fetch(`${SB_URL}/rest/v1/notes`, {
        method: 'POST',
        headers: { ...HEADERS, Prefer: 'return=minimal' },
        body: JSON.stringify({
          title: `🍅 Pomodoro voltooid${activeTask ? ` — ${tasks.find(t => t.id === activeTask)?.title ?? ''}` : ''}`,
          content: `Focus sessie voltooid om ${new Date().toLocaleTimeString('nl-NL')}`,
          project: 'Mission Control',
          processed: true,
        }),
      }).catch(() => {})
    }
  }, [mode, stop, activeTask, tasks])

  const start = useCallback(() => {
    setRunning(true)
    intervalRef.current = setInterval(() => {
      setSecs(prev => {
        if (prev <= 1) { onComplete(); return 0 }
        return prev - 1
      })
    }, 1000)
  }, [onComplete])

  // Update page title with timer
  useEffect(() => {
    if (running) {
      document.title = `${fmt(secs)} — ${mode === 'work' ? '🍅 Focus' : '☕ Pauze'}`
    } else {
      document.title = 'Focus — Mission Control'
    }
    return () => { document.title = 'Mission Control' }
  }, [secs, running, mode])

  const switchMode = (m: Mode) => {
    stop()
    setMode(m)
    setSecs(MODES.find(x => x.key === m)!.secs)
  }

  const reset = () => {
    stop()
    setSecs(currentMode.secs)
  }

  const pct = (1 - secs / currentMode.secs) * 100
  const circumference = 2 * Math.PI * 80
  const strokeDashoffset = circumference * (1 - pct / 100)

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold font-terminal glow-text" style={{ color: '#f1f5f9' }}>Focus Timer</h1>
        <p className="font-terminal text-xs mt-1" style={{ color: '#475569' }}>Pomodoro techniek — 25 min focus, 5 min pauze</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timer */}
        <div className="lg:col-span-2 hud-card p-6">
          <div className="hud-corners-bottom" />

          {/* Mode selector */}
          <div className="flex gap-2 mb-8">
            {MODES.map(m => (
              <button
                key={m.key}
                onClick={() => switchMode(m.key)}
                className="flex-1 py-2 rounded-lg font-terminal text-xs"
                style={{
                  background: mode === m.key ? `${m.color}18` : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${mode === m.key ? `${m.color}40` : 'rgba(255,255,255,0.06)'}`,
                  color: mode === m.key ? m.color : '#475569',
                  cursor: 'pointer',
                }}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Circular progress */}
          <div className="flex flex-col items-center gap-6">
            <div style={{ position: 'relative', width: 200, height: 200 }}>
              <svg width="200" height="200" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="100" cy="100" r="80" fill="none" stroke="rgba(0,212,255,0.06)" strokeWidth="8" />
                <circle
                  cx="100" cy="100" r="80" fill="none"
                  stroke={currentMode.color}
                  strokeWidth="8"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 0.5s ease', filter: `drop-shadow(0 0 6px ${currentMode.color})` }}
                />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span className="font-terminal font-bold" style={{ fontSize: 44, lineHeight: 1, color: currentMode.color, letterSpacing: '-0.02em' }}>
                  {fmt(secs)}
                </span>
                <span className="font-terminal text-xs mt-1" style={{ color: '#475569' }}>
                  {mode === 'work' ? '🍅 focus' : '☕ pauze'}
                </span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-4">
              <button
                onClick={reset}
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#475569', cursor: 'pointer' }}
              >
                <RotateCcw size={15} />
              </button>
              <button
                onClick={running ? stop : start}
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{
                  background: `${currentMode.color}18`,
                  border: `2px solid ${currentMode.color}`,
                  color: currentMode.color,
                  cursor: 'pointer',
                  boxShadow: running ? `0 0 20px ${currentMode.color}40` : 'none',
                }}
              >
                {running ? <Pause size={22} /> : <Play size={22} style={{ marginLeft: 2 }} />}
              </button>
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <span className="font-terminal text-sm font-bold" style={{ color: '#f59e0b' }}>🍅{completed}</span>
              </div>
            </div>
          </div>

          {/* Task selector */}
          <div className="mt-8">
            <label className="font-terminal block mb-2" style={{ fontSize: 10, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Actieve taak (optioneel)
            </label>
            <select
              value={activeTask}
              onChange={e => setActiveTask(e.target.value)}
              className="w-full bg-transparent font-terminal text-xs px-3 py-2 rounded-lg"
              style={{ color: activeTask ? '#f1f5f9' : '#475569', border: '1px solid rgba(0,212,255,0.15)', background: 'rgba(0,212,255,0.03)', cursor: 'pointer' }}
            >
              <option value="">— Geen specifieke taak —</option>
              {tasks.map(t => (
                <option key={t.id} value={t.id} style={{ background: '#0d0d1a', color: '#f1f5f9' }}>
                  {t.title.slice(0, 60)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Stats + Session log */}
        <div className="space-y-3">
          {/* Stats */}
          <div className="hud-card p-4">
            <div className="hud-corners-bottom" />
            <h3 className="font-terminal text-xs uppercase tracking-widest mb-3" style={{ color: '#334155' }}>
              Vandaag
            </h3>
            <div className="space-y-3">
              {[
                { icon: Target,       label: 'Voltooide sessies', value: completed,       color: '#00d4ff' },
                { icon: Zap,          label: 'Focustijd',         value: `${completed * 25} min`, color: '#f59e0b' },
                { icon: Coffee,       label: 'Pauzetijd',         value: `${Math.max(0, completed - 1) * 5} min`, color: '#10b981' },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${s.color}15` }}>
                    <s.icon size={12} style={{ color: s.color }} />
                  </div>
                  <div>
                    <div className="font-terminal text-xs font-bold" style={{ color: '#f1f5f9' }}>{s.value}</div>
                    <div className="font-terminal" style={{ fontSize: 9, color: '#334155' }}>{s.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Session log */}
          <div className="hud-card p-4">
            <div className="hud-corners-bottom" />
            <h3 className="font-terminal text-xs uppercase tracking-widest mb-3" style={{ color: '#334155' }}>
              Sessie log
            </h3>
            {sessions.length === 0 ? (
              <p className="font-terminal text-xs text-center py-4" style={{ color: '#1e293b' }}>
                Start een sessie om te tracken
              </p>
            ) : (
              <div className="space-y-1.5">
                {sessions.map((s, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <CheckCircle2 size={11} style={{ color: '#10b981', flexShrink: 0 }} />
                    <span className="font-terminal text-xs" style={{ color: '#94a3b8' }}>🍅 Voltooid</span>
                    <span className="font-terminal ml-auto" style={{ fontSize: 10, color: '#334155' }}>{s.finishedAt}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
