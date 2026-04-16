'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

type JarvisState = 'idle' | 'listening' | 'processing' | 'speaking'

interface StatusData {
  activeSessions: { agent_name: string; status: string; project: string | null; current_task: string | null }[]
  recentLogs: { event_type: string; message: string; agent_name: string }[]
  errors: { event_type: string; message: string; agent_name: string }[]
  todayCost: number
  todayTokens: number
  inProgressTasks: { title: string; status: string }[]
}

// Simple command matcher
function parseCommand(transcript: string): string {
  const t = transcript.toLowerCase().trim()
  if (/good morning|good evening|good afternoon|hello|hi jarvis|hey jarvis|goedemorgen|goedenavond|hallo|hey/.test(t)) return 'greeting'
  if (/status|rapport|overview|overzicht|hoe gaat|how are|how is|report/.test(t)) return 'status'
  if (/agent|sessie|session|actief|active/.test(t)) return 'agents'
  if (/feed|log|event|activiteit|activity/.test(t)) return 'feed'
  if (/tak|task|todo|bezig|in progress/.test(t)) return 'tasks'
  if (/kost|cost|geld|dollar|spend|budget|token/.test(t)) return 'costs'
  if (/help|wat kan|command|hoe werk|what can/.test(t)) return 'help'
  if (/stop|sluit|close|shut down|afsluiten|goodbye|bye/.test(t)) return 'close'
  return 'unknown'
}

async function fetchStatus(): Promise<StatusData | null> {
  try {
    const res = await fetch('/api/jarvis-status')
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

function buildResponse(command: string, data: StatusData | null): string {
  switch (command) {
    case 'status': {
      if (!data) return 'Unable to retrieve dashboard data at this time.'
      const agentCount = data.activeSessions.length
      const errorCount = data.errors.length
      const cost = data.todayCost.toFixed(4)
      const tokens = data.todayTokens.toLocaleString()

      let msg = `Mission Control status report. `
      if (agentCount === 0) {
        msg += `No agents currently active. `
      } else if (agentCount === 1) {
        const a = data.activeSessions[0]
        msg += `One agent online: ${a.agent_name}${a.project ? ` on ${a.project}` : ''}. `
      } else {
        msg += `${agentCount} agents online. `
      }
      msg += `Today's spend: ${cost} dollars, ${tokens} tokens. `
      if (errorCount > 0) {
        msg += `Warning: ${errorCount} error${errorCount > 1 ? 's' : ''} detected in recent activity.`
      } else {
        msg += `No errors detected. All systems nominal.`
      }
      return msg
    }

    case 'agents': {
      if (!data) return 'Unable to retrieve agent data.'
      const sessions = data.activeSessions
      if (sessions.length === 0) return 'No agents are currently active. All systems are standing by.'
      const list = sessions.map(s =>
        `${s.agent_name}${s.project ? ` working on ${s.project}` : ''}${s.current_task ? `, task: ${s.current_task}` : ''}`
      ).join('. ')
      return `${sessions.length} active agent${sessions.length > 1 ? 's' : ''}: ${list}.`
    }

    case 'feed': {
      if (!data || data.recentLogs.length === 0) return 'No recent activity in the feed.'
      const recent = data.recentLogs.slice(0, 3)
      const items = recent.map(l => `${l.agent_name}: ${l.message}`).join('. ')
      return `Recent activity: ${items}.`
    }

    case 'tasks': {
      if (!data || data.inProgressTasks.length === 0) return 'No tasks currently in progress.'
      const list = data.inProgressTasks.map(t => t.title).join(', ')
      return `Tasks in progress: ${list}.`
    }

    case 'costs': {
      if (!data) return 'Unable to retrieve cost data.'
      return `Today's total spend is ${data.todayCost.toFixed(4)} dollars, using ${data.todayTokens.toLocaleString()} tokens.`
    }

    case 'greeting':
      return 'Good to see you. All systems are online. Say status for a full report, or help for available commands.'

    case 'help':
      return 'Available commands: status, agents, feed, tasks, costs. Say stop to close me.'

    case 'close':
      return 'Signing off. JARVIS standing by.'

    default:
      return `Command not recognized. Say "help" for available commands.`
  }
}

async function speakText(text: string): Promise<void> {
  const res = await fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })

  if (!res.ok) throw new Error('TTS request failed')

  const blob = await res.blob()
  const url = URL.createObjectURL(blob)

  return new Promise((resolve, reject) => {
    const audio = new Audio(url)
    audio.onended = () => {
      URL.revokeObjectURL(url)
      resolve()
    }
    audio.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Audio playback failed'))
    }
    audio.play().catch(reject)
  })
}

export function JarvisVoiceInterface() {
  const [state, setState] = useState<JarvisState>('idle')
  const [transcript, setTranscript] = useState('')
  const [response, setResponse] = useState('')
  const [expanded, setExpanded] = useState(false)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const isSpeakingRef = useRef(false)

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
    recognitionRef.current = null
  }, [])

  const processCommand = useCallback(async (text: string) => {
    setState('processing')
    setTranscript(text)

    const command = parseCommand(text)

    let data: StatusData | null = null
    if (['status', 'agents', 'feed', 'tasks', 'costs'].includes(command)) {
      data = await fetchStatus()
    }

    const reply = buildResponse(command, data)
    setResponse(reply)

    setState('speaking')
    isSpeakingRef.current = true

    try {
      await speakText(reply)
    } catch (e) {
      console.error('TTS error:', e)
    } finally {
      isSpeakingRef.current = false
      if (command === 'close') {
        setState('idle')
        setExpanded(false)
        setTranscript('')
        setResponse('')
      } else {
        setState('idle')
      }
    }
  }, [])

  const startListening = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition is not supported in this browser. Use Microsoft Edge or Google Chrome.')
      return
    }

    const SpeechRecognitionAPI =
      (window as unknown as { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition!

    const recognition = new SpeechRecognitionAPI()
    recognition.lang = 'en-US'
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognitionRef.current = recognition

    recognition.onstart = () => setState('listening')

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const text = event.results[0][0].transcript
      stopListening()
      processCommand(text)
    }

    recognition.onerror = () => {
      stopListening()
      setState('idle')
    }

    recognition.onend = () => {
      if (state === 'listening') setState('idle')
    }

    recognition.start()
  }, [state, stopListening, processCommand])

  const handleActivate = useCallback(async () => {
    if (state !== 'idle') {
      stopListening()
      isSpeakingRef.current = false
      setState('idle')
      return
    }

    setExpanded(true)
    setTranscript('')
    setResponse('')
    setState('speaking')
    isSpeakingRef.current = true

    try {
      await speakText('Mission Control online. How can I assist?')
    } catch (e) {
      console.error('Greeting failed:', e)
    } finally {
      isSpeakingRef.current = false
      setState('listening')
      startListening()
    }
  }, [state, stopListening, startListening])

  // Keyboard shortcut: Ctrl+J
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.altKey && e.key === 'j') {
        e.preventDefault()
        handleActivate()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleActivate])

  // Cleanup on unmount
  useEffect(() => {
    return () => stopListening()
  }, [stopListening])

  const stateColors: Record<JarvisState, string> = {
    idle: 'rgba(0,212,255,0.7)',
    listening: '#00ff88',
    processing: '#ffd700',
    speaking: '#00d4ff',
  }

  const stateLabels: Record<JarvisState, string> = {
    idle: 'J.A.R.V.I.S',
    listening: 'LISTENING',
    processing: 'PROCESSING',
    speaking: 'SPEAKING',
  }

  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999 }}>
      {/* Expanded panel */}
      {expanded && (
        <div
          style={{
            position: 'absolute',
            bottom: 72,
            right: 0,
            width: 320,
            background: 'rgba(7,7,15,0.95)',
            border: '1px solid rgba(0,212,255,0.25)',
            borderRadius: 12,
            padding: '16px',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 0 40px rgba(0,212,255,0.1), inset 0 1px 0 rgba(0,212,255,0.1)',
          }}
        >
          {/* Corner brackets */}
          <div style={{ position: 'absolute', top: 6, left: 6, width: 12, height: 12, borderTop: '1px solid rgba(0,212,255,0.6)', borderLeft: '1px solid rgba(0,212,255,0.6)' }} />
          <div style={{ position: 'absolute', top: 6, right: 6, width: 12, height: 12, borderTop: '1px solid rgba(0,212,255,0.6)', borderRight: '1px solid rgba(0,212,255,0.6)' }} />
          <div style={{ position: 'absolute', bottom: 6, left: 6, width: 12, height: 12, borderBottom: '1px solid rgba(0,212,255,0.6)', borderLeft: '1px solid rgba(0,212,255,0.6)' }} />
          <div style={{ position: 'absolute', bottom: 6, right: 6, width: 12, height: 12, borderBottom: '1px solid rgba(0,212,255,0.6)', borderRight: '1px solid rgba(0,212,255,0.6)' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: stateColors[state],
              boxShadow: `0 0 8px ${stateColors[state]}`,
              animation: state === 'listening' ? 'pulse 1s ease-in-out infinite' : 'none',
            }} />
            <span style={{
              fontSize: 10,
              letterSpacing: '0.15em',
              color: stateColors[state],
              fontFamily: 'monospace',
              fontWeight: 600,
            }}>
              {stateLabels[state]}
            </span>
          </div>

          {/* Waveform visualizer */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, height: 32, marginBottom: 12 }}>
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                style={{
                  width: 3,
                  borderRadius: 2,
                  background: stateColors[state],
                  opacity: state === 'idle' ? 0.2 : 0.8,
                  height: state === 'idle' ? 4
                    : state === 'processing' ? `${8 + Math.sin(i * 0.8) * 6}px`
                    : `${6 + Math.sin(i * 0.9 + Date.now() * 0.005) * 14}px`,
                  animation: (state === 'listening' || state === 'speaking')
                    ? `wave ${0.4 + i * 0.07}s ease-in-out infinite alternate`
                    : 'none',
                  minHeight: 4,
                  maxHeight: 28,
                }}
              />
            ))}
          </div>

          {transcript && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 9, color: 'rgba(0,212,255,0.5)', letterSpacing: '0.1em', marginBottom: 4, fontFamily: 'monospace' }}>YOU SAID</div>
              <div style={{ fontSize: 12, color: '#e2e8f0', fontStyle: 'italic', lineHeight: 1.4 }}>"{transcript}"</div>
            </div>
          )}

          {response && (
            <div>
              <div style={{ fontSize: 9, color: 'rgba(0,212,255,0.5)', letterSpacing: '0.1em', marginBottom: 4, fontFamily: 'monospace' }}>JARVIS</div>
              <div style={{ fontSize: 12, color: '#00d4ff', lineHeight: 1.5 }}>{response}</div>
            </div>
          )}

          <div style={{ marginTop: 12, fontSize: 9, color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace', letterSpacing: '0.05em' }}>
            SAY: status · agents · feed · tasks · costs · stop
          </div>
        </div>
      )}

      {/* Main button */}
      <button
        onClick={handleActivate}
        title="JARVIS Voice Interface (Alt+J)"
        style={{
          width: 52,
          height: 52,
          borderRadius: '50%',
          border: `2px solid ${stateColors[state]}`,
          background: 'rgba(7,7,15,0.9)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `0 0 20px ${stateColors[state]}40, 0 0 40px ${stateColors[state]}20`,
          transition: 'all 0.3s ease',
          backdropFilter: 'blur(10px)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Pulse ring when listening */}
        {(state === 'listening' || state === 'speaking') && (
          <div style={{
            position: 'absolute',
            inset: -4,
            borderRadius: '50%',
            border: `2px solid ${stateColors[state]}`,
            animation: 'ripple 1.5s ease-out infinite',
            opacity: 0.5,
          }} />
        )}

        {state === 'idle' && (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stateColors.idle} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        )}

        {state === 'listening' && (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00ff88" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" fill="rgba(0,255,136,0.2)" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        )}

        {state === 'processing' && (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffd700" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
            <circle cx="12" cy="12" r="10" strokeDasharray="40 20" />
          </svg>
        )}

        {state === 'speaking' && (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="rgba(0,212,255,0.2)" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          </svg>
        )}
      </button>

      <style>{`
        @keyframes ripple {
          0% { transform: scale(1); opacity: 0.5; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes wave {
          0% { height: 4px; }
          100% { height: 24px; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
