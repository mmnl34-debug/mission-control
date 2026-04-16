'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

type JarvisState = 'idle' | 'listening' | 'processing' | 'speaking'

// Detecteer sluit-intentie lokaal (geen API call nodig)
function isCloseCommand(t: string): boolean {
  return /\b(stop|sluit|afsluiten|tot ziens|doei|uitschakelen|sluiten)\b/.test(t.toLowerCase())
}

async function askJarvis(transcript: string): Promise<string> {
  try {
    const res = await fetch('/api/jarvis-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript }),
    })
    if (!res.ok) throw new Error('API fout')
    const data = await res.json()
    return data.response ?? 'Geen antwoord ontvangen.'
  } catch {
    return 'Kon geen verbinding maken met JARVIS. Probeer opnieuw.'
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

    // Sluit-commando lokaal afhandelen — geen API call
    if (isCloseCommand(text)) {
      const reply = 'Tot ziens. JARVIS stand-by.'
      setResponse(reply)
      setState('speaking')
      isSpeakingRef.current = true
      try { await speakText(reply) } catch { /* ignore */ } finally {
        isSpeakingRef.current = false
        setState('idle')
        setExpanded(false)
        setTranscript('')
        setResponse('')
      }
      return
    }

    // Alles anders → Claude AI
    const reply = await askJarvis(text)
    setResponse(reply)
    setState('speaking')
    isSpeakingRef.current = true

    try {
      await speakText(reply)
    } catch (e) {
      console.error('TTS error:', e)
    } finally {
      isSpeakingRef.current = false
      setState('idle')
    }
  }, [])

  const startListening = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Spraakherkenning wordt niet ondersteund in deze browser. Gebruik Microsoft Edge of Google Chrome.')
      return
    }

    const SpeechRecognitionAPI =
      (window as unknown as { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition!

    const recognition = new SpeechRecognitionAPI()
    recognition.lang = 'nl-NL'
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
    // Annuleer als iets actief is
    if (state !== 'idle') {
      stopListening()
      isSpeakingRef.current = false
      setState('idle')
      return
    }

    // Panel al open = tweede tap = direct luisteren (mobiel-vriendelijk)
    if (expanded) {
      setTranscript('')
      setResponse('')
      startListening()
      return
    }

    // Eerste tap: begroeting + panel openen
    setExpanded(true)
    setTranscript('')
    setResponse('')
    setState('speaking')
    isSpeakingRef.current = true

    try {
      await speakText('Mission Control online. Hoe kan ik je helpen?')
    } catch (e) {
      console.error('Greeting failed:', e)
    } finally {
      isSpeakingRef.current = false
      // Na begroeting terug naar idle — gebruiker tikt opnieuw om te spreken
      setState('idle')
    }
  }, [state, expanded, stopListening, startListening])

  // Keyboard shortcut: Alt+J
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

  // Custom event: jarvis-activate (dispatched by CommandPalette)
  useEffect(() => {
    const handler = () => handleActivate()
    window.addEventListener('jarvis-activate', handler)
    return () => window.removeEventListener('jarvis-activate', handler)
  }, [handleActivate])

  // Cleanup on unmount
  useEffect(() => {
    return () => stopListening()
  }, [stopListening])

  const color = {
    idle: '#00d4ff',
    listening: '#00ff88',
    processing: '#ffd700',
    speaking: '#00d4ff',
  }[state]

  const label = {
    idle: 'J.A.R.V.I.S',
    listening: 'LUISTEREN',
    processing: 'VERWERKEN',
    speaking: 'SPREKEN',
  }[state]

  const ringSpeed = {
    idle: { outer: '22s', mid: '14s', inner: '9s' },
    listening: { outer: '6s', mid: '4s', inner: '2.5s' },
    processing: { outer: '2s', mid: '1.5s', inner: '1s' },
    speaking: { outer: '10s', mid: '6s', inner: '4s' },
  }[state]

  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999 }}>

      {/* ── PANEL ── */}
      {expanded && (
        <div style={{
          position: 'absolute',
          bottom: 88,
          right: 0,
          width: 320,
          background: 'rgba(4,4,12,0.97)',
          border: `1px solid ${color}40`,
          borderRadius: 4,
          padding: '20px 18px 16px',
          backdropFilter: 'blur(24px)',
          boxShadow: `0 0 60px ${color}18, inset 0 0 40px ${color}06`,
          overflow: 'hidden',
        }}>

          {/* Scan line */}
          <div style={{
            position: 'absolute', left: 0, right: 0, height: 1,
            background: `linear-gradient(90deg, transparent, ${color}60, transparent)`,
            animation: 'hud-scan 3s linear infinite',
            pointerEvents: 'none',
          }} />

          {/* HUD corner brackets */}
          {[
            { top: 0, left: 0, borderTop: `1px solid ${color}`, borderLeft: `1px solid ${color}` },
            { top: 0, right: 0, borderTop: `1px solid ${color}`, borderRight: `1px solid ${color}` },
            { bottom: 0, left: 0, borderBottom: `1px solid ${color}`, borderLeft: `1px solid ${color}` },
            { bottom: 0, right: 0, borderBottom: `1px solid ${color}`, borderRight: `1px solid ${color}` },
          ].map((s, i) => (
            <div key={i} style={{ position: 'absolute', width: 14, height: 14, ...s }} />
          ))}

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 6, height: 6, borderRadius: '50%',
                background: color, boxShadow: `0 0 8px ${color}`,
                animation: state !== 'idle' ? 'hud-dot 1s ease-in-out infinite' : 'none',
              }} />
              <span style={{ fontSize: 10, letterSpacing: '0.2em', color, fontFamily: 'monospace', fontWeight: 700 }}>
                {label}
              </span>
            </div>
            <span style={{ fontSize: 9, color: `${color}60`, fontFamily: 'monospace', letterSpacing: '0.1em' }}>
              SYS:ONLINE
            </span>
          </div>

          {/* Waveform — 20 bars */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 2.5, height: 40, marginBottom: 14,
            borderTop: `1px solid ${color}15`, borderBottom: `1px solid ${color}15`,
            paddingTop: 6, paddingBottom: 6,
          }}>
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} style={{
                width: 2.5, borderRadius: 2,
                background: `linear-gradient(to top, ${color}, ${color}40)`,
                opacity: state === 'idle' ? 0.15 : 0.85,
                minHeight: 3, maxHeight: 32,
                height: state === 'idle' ? 3
                  : state === 'processing' ? `${6 + Math.abs(Math.sin(i * 0.6)) * 18}px`
                  : 3,
                animation: (state === 'listening' || state === 'speaking')
                  ? `hud-wave ${0.3 + (i % 5) * 0.08}s ease-in-out infinite alternate`
                  : state === 'processing'
                  ? `hud-wave ${0.2 + (i % 4) * 0.05}s ease-in-out infinite alternate`
                  : 'none',
              }} />
            ))}
          </div>

          {transcript && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 8, color: `${color}70`, letterSpacing: '0.15em', marginBottom: 4, fontFamily: 'monospace' }}>
                ◂ INPUT ONTVANGEN
              </div>
              <div style={{ fontSize: 12, color: '#c8d8e8', fontStyle: 'italic', lineHeight: 1.5, paddingLeft: 8, borderLeft: `2px solid ${color}40` }}>
                "{transcript}"
              </div>
            </div>
          )}

          {response && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 8, color: `${color}70`, letterSpacing: '0.15em', marginBottom: 4, fontFamily: 'monospace' }}>
                ▸ JARVIS REACTIE
              </div>
              <div style={{ fontSize: 12, color, lineHeight: 1.6, paddingLeft: 8, borderLeft: `2px solid ${color}80` }}>
                {response}
              </div>
            </div>
          )}

          {/* Tik hint — alleen zichtbaar in idle met open panel */}
          {state === 'idle' && (
            <div style={{
              marginTop: 10, padding: '6px 10px', borderRadius: 6, textAlign: 'center',
              background: `${color}10`, border: `1px solid ${color}20`,
              fontSize: 9, color: `${color}80`, fontFamily: 'monospace', letterSpacing: '0.1em',
              animation: 'hud-dot 2s ease-in-out infinite',
            }}>
              ◉ TIK OM TE SPREKEN
            </div>
          )}

          <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.12)', fontFamily: 'monospace', letterSpacing: '0.08em', marginTop: 8 }}>
            VRAAG ALLES IN HET NEDERLANDS · ZEG "STOP" OM TE SLUITEN
          </div>
        </div>
      )}

      {/* ── HUD BUTTON ── */}
      <button
        onClick={handleActivate}
        title="JARVIS (Alt+J)"
        style={{
          width: 72, height: 72,
          background: 'transparent',
          border: 'none', cursor: 'pointer',
          position: 'relative', padding: 0,
          filter: `drop-shadow(0 0 12px ${color}60)`,
        }}
      >
        {/* SVG rings */}
        <svg width="72" height="72" viewBox="0 0 72 72" style={{ position: 'absolute', inset: 0 }}>

          {/* Outer dashed ring — clockwise */}
          <circle cx="36" cy="36" r="33"
            stroke={color} strokeWidth="1" fill="none"
            strokeDasharray="4 3" opacity={state === 'idle' ? 0.25 : 0.6}
            style={{ transformOrigin: '36px 36px', animation: `hud-cw ${ringSpeed.outer} linear infinite` }}
          />

          {/* Arc segments ring — counter-clockwise */}
          <circle cx="36" cy="36" r="27"
            stroke={color} strokeWidth="2" fill="none"
            strokeDasharray={state === 'listening' ? '40 130' : state === 'processing' ? '25 145' : '55 115'}
            strokeLinecap="round"
            opacity={state === 'idle' ? 0.3 : 0.9}
            style={{ transformOrigin: '36px 36px', animation: `hud-ccw ${ringSpeed.mid} linear infinite` }}
          />

          {/* Second arc (offset) — clockwise faster */}
          <circle cx="36" cy="36" r="27"
            stroke={color} strokeWidth="1" fill="none"
            strokeDasharray="15 155" strokeLinecap="round"
            opacity={state === 'idle' ? 0.15 : 0.5}
            style={{ transformOrigin: '36px 36px', animation: `hud-cw ${ringSpeed.inner} linear infinite` }}
          />

          {/* Inner ring */}
          <circle cx="36" cy="36" r="20"
            stroke={color} strokeWidth="1" fill="none"
            opacity={state === 'idle' ? 0.2 : 0.7}
            style={{ animation: state !== 'idle' ? 'hud-dot 2s ease-in-out infinite' : 'none' }}
          />

          {/* Center fill */}
          <circle cx="36" cy="36" r="15"
            fill={`${color}12`} stroke={color} strokeWidth="1"
            opacity={state === 'idle' ? 0.4 : 0.9}
          />

          {/* Processing: extra fast spinning arc */}
          {state === 'processing' && (
            <circle cx="36" cy="36" r="33"
              stroke="#ffd700" strokeWidth="2" fill="none"
              strokeDasharray="12 160" strokeLinecap="round"
              style={{ transformOrigin: '36px 36px', animation: 'hud-cw 0.8s linear infinite' }}
            />
          )}
        </svg>

        {/* Radar sweep — listening only */}
        {state === 'listening' && (
          <div style={{
            position: 'absolute',
            top: 9, left: 9, right: 9, bottom: 9,
            borderRadius: '50%',
            background: 'conic-gradient(from 0deg, rgba(0,255,136,0.45) 0deg, rgba(0,255,136,0.08) 55deg, transparent 80deg)',
            animation: 'hud-cw-div 1.8s linear infinite',
          }} />
        )}

        {/* Speaking: 3 concentric pulse rings */}
        {state === 'speaking' && [0, 0.6, 1.2].map((delay, i) => (
          <div key={i} style={{
            position: 'absolute',
            inset: -6 - i * 4,
            borderRadius: '50%',
            border: `1px solid ${color}`,
            animation: `hud-ripple 2s ease-out ${delay}s infinite`,
            pointerEvents: 'none',
          }} />
        ))}

        {/* Center icon */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {(state === 'idle' || state === 'listening') && (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ opacity: state === 'idle' ? 0.6 : 1 }}
            >
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"
                fill={state === 'listening' ? `${color}20` : 'none'} />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          )}
          {state === 'processing' && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="#ffd700" strokeWidth="2" strokeLinecap="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          )}
          {state === 'speaking' && (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke={color} strokeWidth="2" strokeLinecap="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill={`${color}20`} />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            </svg>
          )}
        </div>
      </button>

      <style>{`
        @keyframes hud-cw    { from { transform: rotate(0deg); }    to { transform: rotate(360deg); } }
        @keyframes hud-ccw   { from { transform: rotate(0deg); }    to { transform: rotate(-360deg); } }
        @keyframes hud-cw-div { from { transform: rotate(0deg); }   to { transform: rotate(360deg); } }
        @keyframes hud-ripple {
          0%   { transform: scale(1);   opacity: 0.7; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        @keyframes hud-scan {
          0%   { top: 0%; }
          100% { top: 100%; }
        }
        @keyframes hud-dot {
          0%, 100% { opacity: 0.5; }
          50%       { opacity: 1; }
        }
        @keyframes hud-wave {
          from { height: 3px; }
          to   { height: 28px; }
        }
      `}</style>
    </div>
  )
}
