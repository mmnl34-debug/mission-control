export const dynamic = 'force-dynamic'

import { Server, Cpu, HardDrive, Package, Zap, Terminal, Box, CheckCircle, XCircle } from 'lucide-react'

const DEPS = [
  { name: 'Next.js',       version: '16.2.3', color: '#f1f5f9' },
  { name: 'React',         version: '19.2.7', color: '#61dafb' },
  { name: 'TypeScript',    version: '5.x',    color: '#3178c6' },
  { name: 'Tailwind CSS',  version: '4.2.2',  color: '#06b6d4' },
  { name: 'Supabase JS',   version: '2.103+', color: '#10b981' },
  { name: 'date-fns',      version: '4.1.0',  color: '#f59e0b' },
  { name: 'lucide-react',  version: '1.8.0',  color: '#94a3b8' },
  { name: 'recharts',      version: '3.8.1',  color: '#ff7300' },
  { name: 'Anthropic SDK', version: '0.102+', color: '#d97706' },
]

const CLI_TOOLS = [
  { name: 'Claude Code',  version: '1.x',     icon: '🤖' },
  { name: 'Vercel CLI',   version: '54.x',    icon: '▲' },
  { name: 'pnpm',         version: '10.x',    icon: '📦' },
  { name: 'Codex CLI',    version: '0.139.0', icon: '💡' },
  { name: 'graphify',     version: '0.8.37',  icon: '🕸' },
  { name: 'specify CLI',  version: '0.10.1',  icon: '📋' },
  { name: 'obscura',      version: '0.1.0',   icon: '🌐' },
  { name: 'bwrap',        version: '0.9.0',   icon: '🛡' },
]

const SKILL_CATS = [
  { name: 'Security',        count: 73,  color: '#ef4444' },
  { name: 'Development',     count: 85,  color: '#3b82f6' },
  { name: 'Design & UI',     count: 47,  color: '#8b5cf6' },
  { name: 'BMAD Method',     count: 50,  color: '#f59e0b' },
  { name: 'Marketing & Ads', count: 40,  color: '#10b981' },
  { name: 'CRM & Email',     count: 25,  color: '#a855f7' },
  { name: 'AI & Agents',     count: 35,  color: '#00d4ff' },
  { name: 'Social Media',    count: 15,  color: '#ec4899' },
  { name: 'Video & Media',   count: 20,  color: '#f97316' },
  { name: 'Overig',          count: 115, color: '#64748b' },
]

const ENV_CHECKS = [
  { key: 'Supabase URL',   envKey: 'NEXT_PUBLIC_SUPABASE_URL' },
  { key: 'OpenWeatherMap', envKey: 'OPENWEATHER_API_KEY' },
  { key: 'Resend API',     envKey: 'RESEND_API_KEY' },
  { key: 'Cron Secret',    envKey: 'CRON_SECRET' },
  { key: 'ElevenLabs',     envKey: 'ELEVENLABS_API_KEY' },
  { key: 'Anthropic Key',  envKey: 'ANTHROPIC_API_KEY' },
]

export default async function SysteemPage() {
  const nodeVersion = process.version
  const platform = `${process.platform}/${process.arch}`
  const uptimeSec = Math.floor(process.uptime())
  const mem = process.memoryUsage()
  const memStr = `${Math.round(mem.heapUsed / 1024 / 1024)}/${Math.round(mem.heapTotal / 1024 / 1024)} MB`
  const uptimeStr = uptimeSec < 60 ? `${uptimeSec}s`
    : uptimeSec < 3600 ? `${Math.floor(uptimeSec / 60)}m`
    : `${Math.floor(uptimeSec / 3600)}u ${Math.floor((uptimeSec % 3600) / 60)}m`

  const envChecks = ENV_CHECKS.map(e => ({
    ...e,
    ok: !!process.env[e.envKey],
  }))

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold font-terminal glow-text" style={{ color: '#f1f5f9' }}>Systeem</h1>
        <p className="font-terminal text-xs mt-1" style={{ color: '#475569' }}>
          Runtime omgeving · geïnstalleerde tools · skills overzicht
        </p>
      </div>

      {/* Runtime metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Node.js',  value: nodeVersion, icon: Server,    color: '#10b981' },
          { label: 'Platform', value: platform,    icon: Cpu,       color: '#00d4ff' },
          { label: 'Memory',   value: memStr,      icon: HardDrive, color: '#f59e0b' },
          { label: 'Uptime',   value: uptimeStr,   icon: Zap,       color: '#a855f7' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="hud-card p-4">
            <div className="hud-corners-bottom" />
            <div className="flex items-center gap-2 mb-2">
              <Icon size={12} style={{ color }} />
              <span className="font-terminal" style={{ fontSize: 9, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.12em' }}>{label}</span>
            </div>
            <div className="font-terminal font-bold text-sm" style={{ color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* npm deps */}
      <div className="hud-card p-4">
        <div className="hud-corners-bottom" />
        <div className="flex items-center gap-2 mb-4" style={{ borderBottom: '1px solid rgba(0,212,255,0.08)', paddingBottom: 10 }}>
          <Package size={12} style={{ color: '#00d4ff' }} />
          <span className="font-terminal" style={{ fontSize: 10, color: '#475569', letterSpacing: '0.12em', textTransform: 'uppercase' }}>npm dependencies</span>
          <span className="font-terminal text-xs ml-auto" style={{ color: '#334155' }}>{DEPS.length} packages</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
          {DEPS.map(d => (
            <div key={d.name} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <span className="font-terminal text-xs" style={{ color: '#94a3b8' }}>{d.name}</span>
              <span className="font-terminal text-xs font-bold" style={{ color: d.color }}>{d.version}</span>
            </div>
          ))}
        </div>
      </div>

      {/* CLI Tools */}
      <div className="hud-card p-4">
        <div className="hud-corners-bottom" />
        <div className="flex items-center gap-2 mb-4" style={{ borderBottom: '1px solid rgba(0,212,255,0.08)', paddingBottom: 10 }}>
          <Terminal size={12} style={{ color: '#00d4ff' }} />
          <span className="font-terminal" style={{ fontSize: 10, color: '#475569', letterSpacing: '0.12em', textTransform: 'uppercase' }}>CLI Tools</span>
          <span className="font-terminal text-xs ml-auto" style={{ color: '#334155' }}>{CLI_TOOLS.length} geïnstalleerd</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {CLI_TOOLS.map(t => (
            <div key={t.name} className="flex items-center gap-3 px-3 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
              <span style={{ fontSize: 13, flexShrink: 0 }}>{t.icon}</span>
              <span className="font-terminal text-xs flex-1 truncate" style={{ color: '#cbd5e1' }}>{t.name}</span>
              <span className="font-terminal shrink-0" style={{ fontSize: 10, color: '#475569' }}>v{t.version}</span>
              <CheckCircle size={10} style={{ color: '#10b981', flexShrink: 0 }} />
            </div>
          ))}
        </div>
      </div>

      {/* Skills grid */}
      <div className="hud-card p-4">
        <div className="hud-corners-bottom" />
        <div className="flex items-center gap-2 mb-4" style={{ borderBottom: '1px solid rgba(0,212,255,0.08)', paddingBottom: 10 }}>
          <Box size={12} style={{ color: '#00d4ff' }} />
          <span className="font-terminal" style={{ fontSize: 10, color: '#475569', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Skills per categorie</span>
          <span className="font-terminal text-xs font-bold ml-auto" style={{ color: '#00d4ff' }}>505 totaal</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
          {SKILL_CATS.map(cat => (
            <div key={cat.name} className="px-3 py-3 rounded-lg text-center" style={{ background: `${cat.color}08`, border: `1px solid ${cat.color}20` }}>
              <div className="font-terminal font-bold" style={{ color: cat.color, fontSize: 20, lineHeight: 1 }}>{cat.count}</div>
              <div className="font-terminal mt-1" style={{ fontSize: 9, color: '#64748b' }}>{cat.name}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Environment vars */}
      <div className="hud-card p-4">
        <div className="hud-corners-bottom" />
        <div className="flex items-center gap-2 mb-4" style={{ borderBottom: '1px solid rgba(0,212,255,0.08)', paddingBottom: 10 }}>
          <Zap size={12} style={{ color: '#00d4ff' }} />
          <span className="font-terminal" style={{ fontSize: 10, color: '#475569', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Environment variabelen</span>
          <span className="font-terminal text-xs ml-auto" style={{ color: '#334155' }}>
            {envChecks.filter(e => e.ok).length}/{envChecks.length} ok
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {envChecks.map(e => (
            <div key={e.key} className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${e.ok ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.1)'}` }}>
              {e.ok
                ? <CheckCircle size={10} style={{ color: '#10b981', flexShrink: 0 }} />
                : <XCircle size={10} style={{ color: '#ef4444', flexShrink: 0 }} />
              }
              <span className="font-terminal text-xs flex-1 truncate" style={{ color: '#64748b' }}>{e.key}</span>
              <span className="font-terminal shrink-0" style={{ fontSize: 9, color: e.ok ? '#10b981' : '#ef4444' }}>
                {e.ok ? 'OK' : 'MIST'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
