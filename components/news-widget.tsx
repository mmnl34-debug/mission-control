import { fetchAllNews, type NewsItem } from '@/lib/news'
import { ExternalLink, Flame, Globe } from 'lucide-react'

function NewsRow({ item }: { item: NewsItem }) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="news-row flex items-start gap-2.5 py-2 group"
      style={{ textDecoration: 'none' }}
    >
      <div
        className="shrink-0 mt-0.5"
        style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(0,212,255,0.4)', marginTop: 6 }}
      />
      <span
        className="font-terminal text-xs leading-snug"
        style={{ color: '#94a3b8', transition: 'color 0.15s' }}
      >
        {item.title}
      </span>
      <ExternalLink
        size={10}
        className="shrink-0 opacity-0 group-hover:opacity-100 mt-0.5"
        style={{ color: '#00d4ff', transition: 'opacity 0.15s', marginLeft: 'auto' }}
      />
    </a>
  )
}

export async function NewsWidget() {
  const { hn, nos } = await fetchAllNews()

  return (
    <div className="hud-card flex flex-col">
      <div className="hud-corners-bottom" />

      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{ borderBottom: '1px solid rgba(0,212,255,0.08)' }}
      >
        <span className="hud-label">Nieuws</span>
        <span className="font-terminal" style={{ fontSize: 10, color: '#334155' }}>
          {hn.length + nos.length} headlines
        </span>
      </div>

      {/* Two columns on desktop, stacked on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2" style={{ flex: 1 }}>

        {/* Hacker News — Tech/AI */}
        <div className="p-3" style={{ borderRight: '1px solid rgba(0,212,255,0.06)' }}>
          <div className="flex items-center gap-2 mb-2">
            <Flame size={11} style={{ color: '#f59e0b' }} />
            <span className="font-terminal" style={{ fontSize: 9, letterSpacing: '0.12em', color: '#f59e0b', textTransform: 'uppercase' }}>
              AI &amp; Tech
            </span>
          </div>
          <div style={{ borderTop: '1px solid rgba(0,212,255,0.05)' }}>
            {hn.length > 0 ? hn.map((item, i) => (
              <div key={i} style={{ borderBottom: '1px solid rgba(0,212,255,0.05)' }}>
                <NewsRow item={item} />
              </div>
            )) : (
              <p className="font-terminal text-xs py-3" style={{ color: '#334155' }}>Laden…</p>
            )}
          </div>
        </div>

        {/* NOS — Nederlands */}
        <div className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <Globe size={11} style={{ color: '#10b981' }} />
            <span className="font-terminal" style={{ fontSize: 9, letterSpacing: '0.12em', color: '#10b981', textTransform: 'uppercase' }}>
              Nederland · NOS
            </span>
          </div>
          <div style={{ borderTop: '1px solid rgba(0,212,255,0.05)' }}>
            {nos.length > 0 ? nos.map((item, i) => (
              <div key={i} style={{ borderBottom: '1px solid rgba(0,212,255,0.05)' }}>
                <NewsRow item={item} />
              </div>
            )) : (
              <p className="font-terminal text-xs py-3" style={{ color: '#334155' }}>Laden…</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
