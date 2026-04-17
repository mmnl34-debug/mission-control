const SB_URL = 'https://logkkueavewqmaquuwfw.supabase.co'
const SB_KEY = 'sb_publishable_nqPICLQDoaXGb8hshPIYYg_uv9GRuid'

type ServiceStatus = {
  name: string
  status: 'up' | 'down' | 'degraded'
  latencyMs: number
}

async function pingService(
  name: string,
  url: string,
  init: RequestInit
): Promise<ServiceStatus> {
  const start = Date.now()
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 4000)
    const res = await fetch(url, { ...init, signal: controller.signal, cache: 'no-store' })
    clearTimeout(timeout)
    const latencyMs = Date.now() - start
    const status = res.ok ? 'up' : 'degraded'
    return { name, status, latencyMs }
  } catch {
    return { name, status: 'down', latencyMs: Date.now() - start }
  }
}

export async function ServiceHealth() {
  const services = await Promise.all([
    pingService('Supabase', `${SB_URL}/rest/v1/agent_sessions?select=id&limit=1`, {
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
    }),
    pingService('GitHub', 'https://api.github.com/repos/mmnl34-debug/mission-control', {
      headers: { 'User-Agent': 'mission-control-dashboard' },
    }),
    pingService('ElevenLabs', 'https://api.elevenlabs.io/v1/voices?page_size=1', {
      headers: { 'xi-api-key': 'sk_f5cbfbb7238641630a3a4befac3183fab4671aa390566ad3' },
    }),
  ])

  const dotColor = (status: ServiceStatus['status']) => {
    if (status === 'up') return '#10b981'
    if (status === 'degraded') return '#f59e0b'
    return '#ef4444'
  }

  return (
    <div
      className="font-terminal text-xs"
      style={{
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px 16px',
        padding: '8px 12px', borderRadius: 8,
        background: 'rgba(0,212,255,0.03)',
        border: '1px solid rgba(0,212,255,0.08)',
      }}
    >
      <span className="hud-label" style={{ fontSize: '9px', flexShrink: 0 }}>SERVICES</span>
      {services.map((svc) => (
        <div key={svc.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%', flexShrink: 0, display: 'inline-block',
            background: dotColor(svc.status),
            boxShadow: `0 0 4px ${dotColor(svc.status)}`,
          }} />
          <span style={{ color: '#94a3b8' }}>{svc.name}</span>
          <span className="svc-latency" style={{ color: '#475569' }}>{svc.latencyMs}ms</span>
        </div>
      ))}
    </div>
  )
}
