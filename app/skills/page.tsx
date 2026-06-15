'use client'

import { useState, useMemo } from 'react'
import { Search, Zap, ChevronRight } from 'lucide-react'

type Skill = { name: string; desc: string; category: string; tags?: string[] }

const SKILLS: Skill[] = [
  // BMAD Method (50)
  { name: 'bmad-analyst',           category: 'BMAD Method',     desc: 'Requirements analyse & stakeholder interviews' },
  { name: 'bmad-architect',         category: 'BMAD Method',     desc: 'Solution architectuur & technische keuzes' },
  { name: 'bmad-pm',                category: 'BMAD Method',     desc: 'Project management & planning' },
  { name: 'bmad-dev',               category: 'BMAD Method',     desc: 'Full-stack development implementation' },
  { name: 'bmad-qa',                category: 'BMAD Method',     desc: 'Quality assurance & test strategie' },
  { name: 'bmad-ux-expert',         category: 'BMAD Method',     desc: 'UX expertise & user research' },
  { name: 'bmad-sm',                category: 'BMAD Method',     desc: 'Scrum master & agile ceremonies' },
  { name: 'bmad-po',                category: 'BMAD Method',     desc: 'Product owner & backlog beheer' },
  { name: 'bmad-orchestrator',      category: 'BMAD Method',     desc: 'Team coördinatie & workflow' },
  { name: 'bmad-story-drafter',     category: 'BMAD Method',     desc: 'User stories schrijven' },
  { name: 'bmad-doc-shaman',        category: 'BMAD Method',     desc: 'Documentatie & kennisbeheer' },
  { name: 'bmad-retrospective',     category: 'BMAD Method',     desc: 'Sprint retrospectives faciliteren' },
  { name: 'bmad-epic-creator',      category: 'BMAD Method',     desc: 'Epics & initiatieven ontwerpen' },
  { name: 'bmad-risk',              category: 'BMAD Method',     desc: 'Risicobeoordeling & mitigatie' },
  // Security (subset shown)
  { name: 'c-review',               category: 'Security',        desc: 'Multi-agent code review pipeline', tags: ['audit', 'vuln'] },
  { name: 'semgrep',                category: 'Security',        desc: 'Statische code analyse met SARS output' },
  { name: 'security-reviewer',      category: 'Security',        desc: 'OWASP Top 10, secrets, unsafe patterns' },
  { name: 'vps-secure-hardener',    category: 'Security',        desc: 'Server hardening scripts' },
  { name: 'vps-secure-monitor',     category: 'Security',        desc: 'Realtime server monitoring' },
  { name: 'vps-secure-firewall',    category: 'Security',        desc: 'UFW/iptables firewall configuratie' },
  { name: 'vps-secure-backup',      category: 'Security',        desc: 'Geautomatiseerde back-up strategie' },
  { name: 'vps-secure-audit',       category: 'Security',        desc: 'Security audit & compliance check' },
  { name: 'vps-secure-incident',    category: 'Security',        desc: 'Incident response protocol' },
  // Development
  { name: 'executor',               category: 'Development',     desc: 'Focused implementation agent (Sonnet)' },
  { name: 'debugger',               category: 'Development',     desc: 'Root-cause analyse & stack trace' },
  { name: 'code-reviewer',          category: 'Development',     desc: 'Code review met severity ratings' },
  { name: 'code-simplifier',        category: 'Development',     desc: 'Code vereenvoudiging & refactoring' },
  { name: 'test-engineer',          category: 'Development',     desc: 'Test strategie, TDD, flaky test fixing' },
  { name: 'git-master',             category: 'Development',     desc: 'Atomic commits, rebasing, history' },
  { name: 'writer',                 category: 'Development',     desc: 'README, API docs, comments (Haiku)' },
  { name: 'local-build-reminder',   category: 'Development',     desc: 'Herinnert aan lokale build na wijzigingen' },
  { name: 'planner',                category: 'Development',     desc: 'Strategisch planning met interview workflow' },
  { name: 'architect',              category: 'Development',     desc: 'Architecture & debugging advisor (Opus)' },
  { name: 'spec-kit',               category: 'Development',     desc: 'Spec-Driven Development via specify CLI' },
  // Design & UI
  { name: 'designer',               category: 'Design & UI',     desc: 'UI/UX designer-developer (Sonnet)' },
  { name: 'wd-uiux',               category: 'Design & UI',     desc: 'Interface & interactie-ontwerp' },
  { name: 'wd-coder',              category: 'Design & UI',     desc: 'Webdesign coder op component niveau' },
  { name: 'wd-checker',            category: 'Design & UI',     desc: 'QA, linting, typechecks, code review' },
  { name: 'ad-uxui',               category: 'Design & UI',     desc: 'Landingspage UX, funnel interfaces' },
  { name: 'ad-graphic-designer',   category: 'Design & UI',     desc: 'Statische creatives, key visuals, banners' },
  { name: 'skillui',               category: 'Design & UI',     desc: 'Design system extractor v1.3.4' },
  { name: 'figma',                 category: 'Design & UI',     desc: 'Figma MCP integratie & design sync' },
  // AI & Agents
  { name: 'autopilot',             category: 'AI & Agents',     desc: 'Autonome taakuitvoering OMC tier-0' },
  { name: 'ralph',                 category: 'AI & Agents',     desc: 'Iteratieve implementatielus' },
  { name: 'ultrawork',             category: 'AI & Agents',     desc: 'Maximale output met multi-agent swarm' },
  { name: 'team',                  category: 'AI & Agents',     desc: 'Team orchestratie: orchestrator + 4 managers' },
  { name: 'ralplan',               category: 'AI & Agents',     desc: 'Ralph + planning combinatie workflow' },
  { name: 'deep-interview',        category: 'AI & Agents',     desc: 'Diepgaand interview-gebaseerd onderzoek' },
  { name: 'deep-analyze',          category: 'AI & Agents',     desc: 'Grondige code & systeem analyse' },
  { name: 'ultrathink',            category: 'AI & Agents',     desc: 'Uitgebreide redenering met Opus' },
  { name: 'agent-browser',         category: 'AI & Agents',     desc: 'Browser-gebruik via Anthropic agent' },
  { name: 'skillsmith',            category: 'AI & Agents',     desc: 'Meta-skill builder: maak nieuwe skills' },
  // Marketing & Ads
  { name: 'mgr-ad',               category: 'Marketing & Ads',  desc: 'Manager paid media & performance' },
  { name: 'ad-copywriter',        category: 'Marketing & Ads',  desc: 'Headlines, body, CTA\'s voor advertenties' },
  { name: 'ad-performance',       category: 'Marketing & Ads',  desc: 'Biedstrategie, optimalisatie, ROAS' },
  { name: 'ad-sea',               category: 'Marketing & Ads',  desc: 'Google Ads / Bing search-ads' },
  { name: 'ad-seo',               category: 'Marketing & Ads',  desc: 'Organic search, on-page en technical SEO' },
  { name: 'ad-social-ads',        category: 'Marketing & Ads',  desc: 'Meta/TikTok/LinkedIn paid social' },
  { name: 'ad-cro',               category: 'Marketing & Ads',  desc: 'Conversion-rate optimalisatie landingspages' },
  { name: 'ad-media-plan',        category: 'Marketing & Ads',  desc: 'Mediaplan, budgetverdeling, kanalenmix' },
  // CRM & Email
  { name: 'mgr-crm',             category: 'CRM & Email',       desc: 'Manager e-mail marketing & CRM-data' },
  { name: 'em-copywriter',       category: 'CRM & Email',       desc: 'Subject lines, preheaders, body copy' },
  { name: 'em-developer',        category: 'CRM & Email',       desc: 'HTML/MJML mailbouw' },
  { name: 'em-flowbouwer',       category: 'CRM & Email',       desc: 'Automation flows & journeys' },
  { name: 'em-deliverability',   category: 'CRM & Email',       desc: 'SPF/DKIM/DMARC, reputation, placement' },
  { name: 'em-segmentatie',      category: 'CRM & Email',       desc: 'Audience segmentatie & dynamische lijsten' },
  { name: 'em-personalisatie',   category: 'CRM & Email',       desc: 'Dynamic content, merge-tags, 1:1 ervaringen' },
  // Social Media
  { name: 'mgr-social',          category: 'Social Media',      desc: 'Manager kanaal-overstijgende social content' },
  { name: 'sm-instagram',        category: 'Social Media',      desc: 'Reels, feed, stories' },
  { name: 'sm-linkedin',         category: 'Social Media',      desc: 'B2B posts, thought leadership' },
  { name: 'sm-youtube',          category: 'Social Media',      desc: 'Long-form, shorts, thumbnails, video-SEO' },
  { name: 'sm-content-strategy', category: 'Social Media',      desc: 'Content pillars & funnel-rol per kanaal' },
  { name: 'sm-editor',           category: 'Social Media',      desc: 'Merkstem, copy polish, fact-check' },
  // Video & Media
  { name: 'ai-video-creator',    category: 'Video & Media',     desc: 'Animated AI video ads via FAL ~$5/video' },
  { name: 'video',               category: 'Video & Media',     desc: 'Claude Code Video Toolkit v0.15.0' },
  { name: 'elevenlabs',          category: 'Video & Media',     desc: 'TTS & voice cloning integratie' },
  { name: 'acestep',             category: 'Video & Media',     desc: 'AI muziekgeneratie' },
  { name: 'ffmpeg',              category: 'Video & Media',     desc: 'Video/audio verwerking & conversie' },
  { name: 'remotion',            category: 'Video & Media',     desc: 'Programmatic video met React' },
  { name: 'higgsfield',          category: 'Video & Media',     desc: 'Higgsfield AI-video connector MCP' },
  // Overig
  { name: 'graphify',            category: 'Overig',            desc: 'Project naar knowledge graph v0.8.37' },
  { name: 'obscura',             category: 'Overig',            desc: 'Headless browser stealth v0.1.0' },
  { name: 'codex',               category: 'Overig',            desc: 'OpenAI Codex CLI: second opinion' },
  { name: 'twenty-crm',          category: 'Overig',            desc: 'Open-source CRM alternatief (49k stars)' },
  { name: 'ai-slop-cleaner',     category: 'Overig',            desc: 'AI gegenereerde inhoud opschonen' },
  { name: 'remember',            category: 'Overig',            desc: 'Persistente geheugen opslag' },
  { name: 'autoresearch',        category: 'Overig',            desc: 'Autonome research workflow' },
  { name: 'ultragoal',           category: 'Overig',            desc: 'Doelgericht langetermijn agent' },
  { name: 'omc-setup',           category: 'Overig',            desc: 'OMC orchestratie laag installatie' },
]

const CATEGORY_COLOR: Record<string, string> = {
  'BMAD Method':     '#f59e0b',
  'Security':        '#ef4444',
  'Development':     '#3b82f6',
  'Design & UI':     '#8b5cf6',
  'AI & Agents':     '#00d4ff',
  'Marketing & Ads': '#10b981',
  'CRM & Email':     '#a855f7',
  'Social Media':    '#ec4899',
  'Video & Media':   '#f97316',
  'Overig':          '#64748b',
}

const CATEGORY_TOTALS: Record<string, number> = {
  'BMAD Method':     50,
  'Security':        73,
  'Development':     85,
  'Design & UI':     47,
  'AI & Agents':     35,
  'Marketing & Ads': 40,
  'CRM & Email':     25,
  'Social Media':    15,
  'Video & Media':   20,
  'Overig':          115,
}

const ALL_CATS = Object.keys(CATEGORY_COLOR)

export default function SkillsPage() {
  const [query, setQuery] = useState('')
  const [activeCat, setActiveCat] = useState<string | null>(null)

  const filtered = useMemo(() => {
    let list = SKILLS
    if (activeCat) list = list.filter(s => s.category === activeCat)
    if (query.trim()) {
      const q = query.toLowerCase()
      list = list.filter(s =>
        s.name.includes(q) || s.desc.toLowerCase().includes(q) || s.category.toLowerCase().includes(q)
      )
    }
    return list
  }, [query, activeCat])

  const shown = filtered.length
  const total = 505

  return (
    <div className="p-4 lg:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold font-terminal glow-text" style={{ color: '#f1f5f9' }}>Skills</h1>
          <p className="font-terminal text-xs mt-1" style={{ color: '#475569' }}>
            {total} geïnstalleerde skills · {shown} getoond
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.15)' }}>
          <Zap size={12} style={{ color: '#00d4ff' }} />
          <span className="font-terminal text-xs" style={{ color: '#00d4ff' }}>{total} skills</span>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Zoek skill op naam, omschrijving of categorie…"
          className="w-full bg-transparent font-terminal text-sm pl-9 pr-4 py-2.5 rounded-lg outline-none"
          style={{ color: '#f1f5f9', border: '1px solid rgba(0,212,255,0.2)', background: 'rgba(0,212,255,0.03)' }}
        />
      </div>

      {/* Category tabs */}
      <div className="flex gap-1.5 flex-wrap">
        <button
          onClick={() => setActiveCat(null)}
          className="px-3 py-1 rounded-lg font-terminal text-xs"
          style={{
            background: !activeCat ? 'rgba(0,212,255,0.12)' : 'rgba(255,255,255,0.02)',
            border: `1px solid ${!activeCat ? 'rgba(0,212,255,0.3)' : 'rgba(255,255,255,0.06)'}`,
            color: !activeCat ? '#00d4ff' : '#475569',
            cursor: 'pointer',
          }}
        >
          Alles ({total})
        </button>
        {ALL_CATS.map(cat => {
          const active = activeCat === cat
          const color = CATEGORY_COLOR[cat]
          return (
            <button
              key={cat}
              onClick={() => setActiveCat(active ? null : cat)}
              className="px-3 py-1 rounded-lg font-terminal text-xs"
              style={{
                background: active ? `${color}12` : 'rgba(255,255,255,0.02)',
                border: `1px solid ${active ? `${color}30` : 'rgba(255,255,255,0.06)'}`,
                color: active ? color : '#475569',
                cursor: 'pointer',
              }}
            >
              {cat} ({CATEGORY_TOTALS[cat]})
            </button>
          )
        })}
      </div>

      {/* Skills grid */}
      {filtered.length === 0 ? (
        <div className="hud-card p-10 text-center">
          <Search size={24} className="mx-auto mb-3" style={{ color: '#1e293b' }} />
          <p className="font-terminal text-sm" style={{ color: '#334155' }}>Geen skills gevonden voor "{query}"</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
          {filtered.map(skill => {
            const color = CATEGORY_COLOR[skill.category] ?? '#475569'
            return (
              <div key={skill.name} className="hud-card px-4 py-3 flex items-start gap-3" style={{ borderLeft: `3px solid ${color}25` }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-terminal text-xs font-bold" style={{ color: '#f1f5f9' }}>{skill.name}</span>
                    <span className="font-terminal px-1.5 py-0.5 rounded" style={{ fontSize: 8, background: `${color}12`, color, border: `1px solid ${color}20` }}>
                      {skill.category}
                    </span>
                  </div>
                  <p className="font-terminal text-xs mt-0.5 truncate" style={{ color: '#64748b' }}>{skill.desc}</p>
                </div>
                <ChevronRight size={12} style={{ color: '#1e293b', flexShrink: 0, marginTop: 2 }} />
              </div>
            )
          })}
        </div>
      )}

      {activeCat && filtered.length > 0 && CATEGORY_TOTALS[activeCat] > filtered.length && (
        <p className="font-terminal text-center" style={{ fontSize: 10, color: '#334155' }}>
          Toont {filtered.length} van {CATEGORY_TOTALS[activeCat]} {activeCat} skills — gebruik /oh-my-claudecode:omc-reference voor de volledige lijst
        </p>
      )}
    </div>
  )
}
