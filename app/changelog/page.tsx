export const dynamic = 'force-dynamic'

import { GitCommit, GitBranch, ExternalLink, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { nl } from 'date-fns/locale'

type Commit = {
  sha: string
  commit: { message: string; author: { date: string; name: string } }
  html_url: string
}

const REPOS = [
  { id: 'mission-control',  label: 'Mission Control',  color: '#00d4ff' },
  { id: 'helix-studio',     label: 'Helix Studio',     color: '#f59e0b' },
  { id: 'e-commerce-demo',  label: 'OBSCURA',          color: '#ec4899' },
  { id: 'saas-landing',     label: 'SaaS Landing',     color: '#10b981' },
]

async function fetchCommits(repo: string): Promise<(Commit & { repo: string; repoLabel: string; color: string })[]> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/mmnl34-debug/${repo}/commits?per_page=15`,
      { headers: { 'User-Agent': 'mission-control-dashboard' }, cache: 'no-store' }
    )
    if (!res.ok) return []
    const commits: Commit[] = await res.json()
    const info = REPOS.find(r => r.id === repo)!
    return commits.map(c => ({ ...c, repo, repoLabel: info.label, color: info.color }))
  } catch {
    return []
  }
}

type EnrichedCommit = Commit & { repo: string; repoLabel: string; color: string }

export default async function ChangelogPage() {
  const all = await Promise.all(REPOS.map(r => fetchCommits(r.id)))
  const commits: EnrichedCommit[] = all.flat().sort(
    (a, b) => new Date(b.commit.author.date).getTime() - new Date(a.commit.author.date).getTime()
  )

  // Group by date
  const byDate: Record<string, EnrichedCommit[]> = {}
  for (const c of commits) {
    const date = c.commit.author.date.slice(0, 10)
    if (!byDate[date]) byDate[date] = []
    byDate[date].push(c)
  }

  const dates = Object.keys(byDate).sort().reverse()

  function formatDate(dateStr: string) {
    const d = new Date(dateStr)
    return d.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })
  }

  function parseConventional(msg: string) {
    const line = msg.split('\n')[0]
    const match = line.match(/^(feat|fix|chore|docs|refactor|style|test|ci|perf|build)\(([^)]+)\):\s*(.+)/)
    if (match) return { type: match[1], scope: match[2], desc: match[3] }
    const short = line.match(/^(feat|fix|chore|docs|refactor|style|test|ci|perf|build):\s*(.+)/)
    if (short) return { type: short[1], scope: null, desc: short[2] }
    return { type: null, scope: null, desc: line.slice(0, 80) }
  }

  const TYPE_COLOR: Record<string, string> = {
    feat: '#10b981', fix: '#f59e0b', chore: '#475569',
    docs: '#94a3b8', refactor: '#4f52a0', ci: '#64748b',
    style: '#ec4899', test: '#00d4ff', perf: '#f59e0b', build: '#94a3b8',
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold font-terminal glow-text" style={{ color: '#f1f5f9' }}>Changelog</h1>
        <p className="font-terminal text-xs mt-1" style={{ color: '#475569' }}>
          Commit-tijdlijn van alle projecten — {commits.length} commits geladen
        </p>
      </div>

      {/* Repo legenda */}
      <div className="flex flex-wrap gap-3">
        {REPOS.map(r => (
          <a
            key={r.id}
            href={`https://github.com/mmnl34-debug/${r.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 font-terminal text-xs px-2.5 py-1 rounded-lg"
            style={{ background: `${r.color}10`, border: `1px solid ${r.color}25`, color: r.color }}
          >
            <GitBranch size={10} /> {r.label} <ExternalLink size={9} />
          </a>
        ))}
      </div>

      {/* Timeline */}
      <div className="space-y-6">
        {dates.map(date => (
          <div key={date}>
            {/* Date divider */}
            <div className="flex items-center gap-3 mb-3">
              <div className="w-2 h-2 rounded-full" style={{ background: '#00d4ff', boxShadow: '0 0 6px #00d4ff', flexShrink: 0 }} />
              <h2 className="font-terminal text-xs capitalize" style={{ color: '#f1f5f9' }}>
                {formatDate(date)}
              </h2>
              <div className="flex-1 h-px" style={{ background: 'rgba(0,212,255,0.08)' }} />
              <span className="font-terminal text-xs" style={{ color: '#334155' }}>
                {byDate[date].length} commit{byDate[date].length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Commits for this date */}
            <div className="space-y-2 ml-5">
              {byDate[date].map(commit => {
                const { type, scope, desc } = parseConventional(commit.commit.message)
                const typeColor = type ? (TYPE_COLOR[type] ?? '#64748b') : '#64748b'
                return (
                  <div
                    key={commit.sha}
                    className="hud-card flex items-start gap-3 px-4 py-3"
                    style={{ borderLeft: `3px solid ${commit.color}30` }}
                  >
                    <GitCommit size={12} className="shrink-0 mt-0.5" style={{ color: commit.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        {/* Repo badge */}
                        <span
                          className="font-terminal px-1.5 py-0.5 rounded"
                          style={{ fontSize: 9, background: `${commit.color}15`, color: commit.color, border: `1px solid ${commit.color}25`, letterSpacing: '0.08em' }}
                        >
                          {commit.repoLabel}
                        </span>
                        {/* Type badge */}
                        {type && (
                          <span
                            className="font-terminal px-1.5 py-0.5 rounded"
                            style={{ fontSize: 9, background: `${typeColor}12`, color: typeColor, border: `1px solid ${typeColor}25` }}
                          >
                            {type}{scope ? `(${scope})` : ''}
                          </span>
                        )}
                      </div>
                      <p className="font-terminal text-xs" style={{ color: '#cbd5e1' }}>{desc}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-1">
                        <Clock size={9} style={{ color: '#334155' }} />
                        <span className="font-terminal" style={{ fontSize: 10, color: '#334155' }}>
                          {formatDistanceToNow(new Date(commit.commit.author.date), { locale: nl, addSuffix: true })}
                        </span>
                      </div>
                      <a
                        href={commit.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-terminal hover:underline"
                        style={{ fontSize: 10, color: '#4f52a0' }}
                      >
                        {commit.sha.slice(0, 7)}
                      </a>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {commits.length === 0 && (
          <div className="hud-card p-8 text-center">
            <GitCommit size={24} className="mx-auto mb-3" style={{ color: '#1e293b' }} />
            <p className="font-terminal text-sm" style={{ color: '#334155' }}>Geen commits beschikbaar</p>
          </div>
        )}
      </div>
    </div>
  )
}
