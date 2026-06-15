import { Flame } from 'lucide-react'

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

async function getStreak(): Promise<number> {
  try {
    const res = await fetch(
      `${SB_URL}/rest/v1/agent_sessions?select=last_seen_at&order=last_seen_at.desc`,
      { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` }, cache: 'no-store' }
    )
    if (!res.ok) return 0
    const sessions: { last_seen_at: string }[] = await res.json()

    const dates = [...new Set(sessions.map(s => s.last_seen_at.slice(0, 10)))].sort().reverse()
    if (dates.length === 0) return 0

    let streak = 0
    const today = new Date()
    for (let i = 0; i < dates.length; i++) {
      const expected = new Date(today)
      expected.setDate(expected.getDate() - i)
      const expectedStr = expected.toISOString().slice(0, 10)
      if (dates[i] === expectedStr) {
        streak++
      } else {
        break
      }
    }
    return streak
  } catch {
    return 0
  }
}

export async function StreakWidget() {
  const streak = await getStreak()

  const color = streak >= 7 ? '#f59e0b' : streak >= 3 ? '#10b981' : '#00d4ff'
  const label =
    streak >= 14 ? '🔥 On fire!' :
    streak >= 7  ? '🔥 Op stoom!' :
    streak >= 3  ? '⚡ Goede streak' :
    streak >= 1  ? '✓ Vandaag actief' : '— Begin de streak'

  return (
    <div className="hud-card flex flex-col">
      <div className="hud-corners-bottom" />

      <div
        className="flex items-center justify-between px-3 py-2"
        style={{ borderBottom: '1px solid rgba(0,212,255,0.08)' }}
      >
        <span className="hud-label">Streak</span>
        <Flame size={12} style={{ color: '#f59e0b' }} />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-4 py-5">
        <div
          className="font-terminal font-bold"
          style={{ fontSize: 52, lineHeight: 1, color, textShadow: `0 0 20px ${color}40` }}
        >
          {streak}
        </div>
        <div className="font-terminal text-xs mt-1" style={{ color: '#64748b' }}>
          {streak === 1 ? 'dag actief' : 'dagen actief'}
        </div>
        <div
          className="mt-3 font-terminal text-xs px-3 py-1 rounded-full"
          style={{ background: `${color}12`, border: `1px solid ${color}30`, color }}
        >
          {label}
        </div>
      </div>
    </div>
  )
}
