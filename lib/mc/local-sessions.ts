// Leest lokale Claude Code-sessiebestanden (read-only) en leidt per sessie een status af.
// Alleen aanroepen vanuit server-code die al is afgeschermd (zie app/api/sessies/route.ts).
import { open, readdir, stat } from 'node:fs/promises'
import { homedir } from 'node:os'
import path from 'node:path'

export type SessionState = 'needs_you' | 'stalled' | 'working' | 'idle' | 'done'

export type LiveSession = {
  id: string
  project: string
  title: string
  branch: string
  model: string
  state: SessionState
  stateLabel: string
  lastAction: string
  subagents: { name: string; ageSec: number }[]
  contextTokens: number
  ageSec: number
  mtime: number
}

const TAIL_BYTES = 512 * 1024
const MAX_SESSIONS = 30
const MAX_AGE_MS = 24 * 60 * 60 * 1000
const DONE_AFTER_SEC = 30 * 60
const STALLED_AFTER_SEC = 10 * 60
const MAYBE_WAITING_AFTER_SEC = 20
const AGENT_TOOLS = new Set(['Task', 'Agent'])
const USER_INPUT_TOOLS = new Set(['AskUserQuestion', 'ExitPlanMode'])

const SECRET_RE =
  /(sk-[A-Za-z0-9_-]{10,}|gh[pousr]_\w{10,}|github_pat_\w+|xox[abp]-[\w-]+|AKIA[0-9A-Z]{16}|eyJ[\w-]{20,}\.[\w-]+\.[\w-]+|Bearer\s+\S+|(?:api[_-]?key|token|secret|passw(?:or)?d)\s*[=:]\s*\S+)/gi

const redact = (s: string) => s.replace(SECRET_RE, '[geredigeerd]')

const clip = (s: string, n: number) => {
  const flat = s.replace(/\s+/g, ' ').trim()
  return flat.length > n ? flat.slice(0, n - 1) + '…' : flat
}

export function projectsRoot() {
  const base = process.env.CLAUDE_CONFIG_DIR || path.join(homedir(), '.claude')
  return path.join(base, 'projects')
}

type Block = { type?: string; id?: string; name?: string; input?: Record<string, unknown>; tool_use_id?: string }
type Entry = {
  type?: string
  timestamp?: string
  cwd?: string
  gitBranch?: string
  aiTitle?: string
  isSidechain?: boolean
  message?: {
    model?: string
    stop_reason?: string | null
    content?: string | Block[]
    usage?: { input_tokens?: number; cache_read_input_tokens?: number; cache_creation_input_tokens?: number }
  }
}

async function readTail(file: string, size: number): Promise<string> {
  const start = Math.max(0, size - TAIL_BYTES)
  const fh = await open(file, 'r')
  try {
    const buf = Buffer.alloc(size - start)
    await fh.read(buf, 0, buf.length, start)
    const text = buf.toString('utf8')
    // bij een staart-lezing is de eerste regel vrijwel zeker afgekapt
    return start > 0 ? text.slice(text.indexOf('\n') + 1) : text
  } finally {
    await fh.close()
  }
}

function toolHint(input: Record<string, unknown> | undefined): string {
  if (!input) return ''
  for (const k of ['command', 'file_path', 'description', 'pattern', 'query', 'url', 'prompt']) {
    const v = input[k]
    if (typeof v === 'string' && v) return v
  }
  return ''
}

const toMs = (ts?: string) => {
  const n = ts ? Date.parse(ts) : NaN
  return Number.isNaN(n) ? 0 : n
}

function analyse(id: string, text: string, mtime: number, now: number): LiveSession {
  const entries: Entry[] = []
  for (const line of text.split('\n')) {
    if (!line) continue
    try {
      entries.push(JSON.parse(line) as Entry)
    } catch {
      // onvolledige of beschadigde regel: overslaan
    }
  }

  const uses = new Map<string, { name: string; hint: string; at: number }>()
  const answered = new Set<string>()
  let title = ''
  let cwd = ''
  let branch = ''
  let model = ''
  let contextTokens = 0
  let lastKind: 'assistant_tool' | 'assistant_end' | 'user' | 'none' = 'none'
  let lastToolId = ''

  for (const e of entries) {
    if (e.type === 'ai-title' && e.aiTitle) title = e.aiTitle
    if (e.cwd) cwd = e.cwd
    if (e.gitBranch) branch = e.gitBranch
    if (e.isSidechain) continue
    const m = e.message
    if (e.type === 'assistant' && m) {
      if (m.model) model = m.model
      const u = m.usage
      if (u) {
        contextTokens =
          (u.input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0)
      }
      const blocks = Array.isArray(m.content) ? m.content : []
      for (const b of blocks) {
        if (b.type === 'tool_use' && b.id && b.name) {
          uses.set(b.id, { name: b.name, hint: toolHint(b.input), at: toMs(e.timestamp) })
          lastToolId = b.id
        }
      }
      lastKind = m.stop_reason === 'end_turn' ? 'assistant_end' : 'assistant_tool'
    } else if (e.type === 'user' && m) {
      const blocks = Array.isArray(m.content) ? m.content : []
      let hadResult = false
      for (const b of blocks) {
        if (b.type === 'tool_result' && b.tool_use_id) {
          answered.add(b.tool_use_id)
          hadResult = true
        }
      }
      lastKind = hadResult ? 'assistant_tool' : 'user'
      if (!hadResult) lastToolId = ''
    }
  }

  const pending = [...uses.entries()].filter(([toolId]) => !answered.has(toolId))
  const pendingAgents = pending.filter(([, u]) => AGENT_TOOLS.has(u.name))
  const pendingOther = pending.filter(([, u]) => !AGENT_TOOLS.has(u.name))
  const ageSec = Math.max(0, Math.round((now - mtime) / 1000))

  let state: SessionState
  let stateLabel: string
  if (ageSec > DONE_AFTER_SEC) {
    state = 'done'
    stateLabel = 'Inactief'
  } else if (pendingOther.some(([, u]) => USER_INPUT_TOOLS.has(u.name))) {
    state = 'needs_you'
    stateLabel = 'Wacht op jouw antwoord'
  } else if (lastKind === 'assistant_end' && pending.length === 0) {
    state = 'idle'
    stateLabel = 'Klaar, wacht op prompt'
  } else if (ageSec > STALLED_AFTER_SEC) {
    state = 'stalled'
    stateLabel = 'Mogelijk vastgelopen'
  } else if (pendingOther.length > 0 && pendingAgents.length === 0 && ageSec > MAYBE_WAITING_AFTER_SEC) {
    state = 'needs_you'
    stateLabel = 'Wacht mogelijk op jou (permissie of lange taak)'
  } else {
    state = 'working'
    stateLabel = pendingAgents.length > 0 ? 'Wacht op sub-agent(s)' : 'Aan het werk'
  }

  const lastUse = (lastToolId && uses.get(lastToolId)) || [...uses.values()].at(-1)
  const lastAction = lastUse ? clip(redact(`${lastUse.name} ${lastUse.hint}`), 110) : ''

  const subagents = pendingAgents.slice(-8).map(([, u]) => ({
    name: clip(redact(u.hint || 'sub-agent'), 70),
    ageSec: u.at ? Math.max(0, Math.round((now - u.at) / 1000)) : 0,
  }))

  const project = cwd ? path.basename(cwd) : ''
  return {
    id,
    project: project || 'onbekend',
    title: clip(redact(title), 90),
    branch,
    model,
    state,
    stateLabel,
    lastAction,
    subagents,
    contextTokens,
    ageSec,
    mtime,
  }
}

const URGENCY: Record<SessionState, number> = { needs_you: 0, stalled: 1, working: 2, idle: 3, done: 4 }

export async function listLiveSessions(): Promise<LiveSession[]> {
  const root = projectsRoot()
  const now = Date.now()
  let dirs: string[]
  try {
    dirs = await readdir(root)
  } catch {
    return []
  }

  const candidates: { file: string; id: string; mtime: number; size: number }[] = []
  for (const d of dirs) {
    let files: string[]
    try {
      files = await readdir(path.join(root, d))
    } catch {
      continue
    }
    for (const f of files) {
      if (!f.endsWith('.jsonl')) continue
      const file = path.join(root, d, f)
      try {
        const s = await stat(file)
        if (s.isFile() && now - s.mtimeMs <= MAX_AGE_MS && s.size > 0) {
          candidates.push({ file, id: f.slice(0, -'.jsonl'.length), mtime: s.mtimeMs, size: s.size })
        }
      } catch {
        // bestand verdwenen tussen readdir en stat
      }
    }
  }

  candidates.sort((a, b) => b.mtime - a.mtime)
  const out: LiveSession[] = []
  for (const c of candidates.slice(0, MAX_SESSIONS)) {
    try {
      out.push(analyse(c.id, await readTail(c.file, c.size), c.mtime, now))
    } catch {
      // onleesbaar bestand: overslaan
    }
  }
  return out.sort((a, b) => URGENCY[a.state] - URGENCY[b.state] || b.mtime - a.mtime)
}
