import { fetchWeather, weatherEmoji } from '@/lib/weather'
import { MapPin, Droplets, Wind, Thermometer } from 'lucide-react'

export async function WeatherWidget() {
  const w = await fetchWeather('Eindhoven')

  if (!w) {
    return (
      <div className="hud-card flex flex-col" style={{ minHeight: 140 }}>
        <div className="hud-corners-bottom" />
        <div
          className="flex items-center justify-between px-3 py-2"
          style={{ borderBottom: '1px solid rgba(0,212,255,0.08)' }}
        >
          <span className="hud-label">Weer</span>
          <span className="font-terminal text-xs" style={{ color: '#475569' }}>Eindhoven</span>
        </div>
        <div className="flex flex-1 items-center justify-center p-4">
          <span className="font-terminal text-xs" style={{ color: '#334155' }}>
            Weerdata niet beschikbaar
          </span>
        </div>
      </div>
    )
  }

  const emoji = weatherEmoji(w.code)

  return (
    <div className="hud-card flex flex-col">
      <div className="hud-corners-bottom" />

      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{ borderBottom: '1px solid rgba(0,212,255,0.08)' }}
      >
        <span className="hud-label">Weer</span>
        <div className="flex items-center gap-1.5 font-terminal text-xs" style={{ color: '#475569' }}>
          <MapPin size={10} />
          {w.city}
        </div>
      </div>

      {/* Main temp */}
      <div className="p-4 flex items-center gap-4">
        <div style={{ fontSize: 42, lineHeight: 1, userSelect: 'none' }}>{emoji}</div>
        <div>
          <div className="font-terminal font-bold" style={{ fontSize: 36, lineHeight: 1, color: '#f1f5f9' }}>
            {w.temp}<span style={{ fontSize: 20, color: '#64748b' }}>°C</span>
          </div>
          <div className="font-terminal text-xs mt-1 capitalize" style={{ color: '#94a3b8' }}>
            {w.description}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div
        className="grid grid-cols-3 px-3 pb-3 gap-2"
      >
        <div
          className="flex flex-col items-center gap-1 py-2 rounded-lg"
          style={{ background: 'rgba(0,212,255,0.04)', border: '1px solid rgba(0,212,255,0.08)' }}
        >
          <Thermometer size={11} style={{ color: '#00d4ff' }} />
          <span className="font-terminal" style={{ fontSize: 11, color: '#f1f5f9' }}>{w.feelsLike}°</span>
          <span className="font-terminal" style={{ fontSize: 9, color: '#334155' }}>Voelt als</span>
        </div>
        <div
          className="flex flex-col items-center gap-1 py-2 rounded-lg"
          style={{ background: 'rgba(0,212,255,0.04)', border: '1px solid rgba(0,212,255,0.08)' }}
        >
          <Wind size={11} style={{ color: '#00d4ff' }} />
          <span className="font-terminal" style={{ fontSize: 11, color: '#f1f5f9' }}>{w.windSpeed}</span>
          <span className="font-terminal" style={{ fontSize: 9, color: '#334155' }}>km/u</span>
        </div>
        <div
          className="flex flex-col items-center gap-1 py-2 rounded-lg"
          style={{ background: 'rgba(0,212,255,0.04)', border: '1px solid rgba(0,212,255,0.08)' }}
        >
          <Droplets size={11} style={{ color: '#00d4ff' }} />
          <span className="font-terminal" style={{ fontSize: 11, color: '#f1f5f9' }}>{w.humidity}%</span>
          <span className="font-terminal" style={{ fontSize: 9, color: '#334155' }}>Luchtvochtig.</span>
        </div>
      </div>
    </div>
  )
}
