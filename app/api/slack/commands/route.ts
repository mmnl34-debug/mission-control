export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { verifySlackSignature } from '@/lib/slack/verify'
import { AGENTS, MANAGERS, SPECIALISTS } from '@/lib/slack/agents-registry'
import {
  createTask,
  listOpenTasks,
  findTaskByIdPrefix,
  setTaskStatus,
  listActiveProjects,
  createProject,
  type MCTask,
} from '@/lib/mc/tasks'

const PRIORITY_EMOJI: Record<number, string> = { 1: ':rotating_light:', 2: ':zap:', 3: ':small_blue_diamond:' }
const STATUS_EMOJI: Record<MCTask['status'], string> = { todo: ':white_circle:', in_progress: ':large_blue_circle:', done: ':white_check_mark:' }

function ephem(text: string) {
  return NextResponse.json({ response_type: 'ephemeral', text })
}

function channelProject(params: URLSearchParams): string | null {
  const channelName = params.get('channel_name') || ''
  if (!channelName || channelName === 'directmessage' || channelName === 'privategroup') return null
  if (channelName === 'orchestrator' || channelName === 'brein') return 'Mission Control'
  return null
}

function fmtTaskLine(t: MCTask): string {
  const prio = PRIORITY_EMOJI[t.priority] ?? ':small_blue_diamond:'
  const status = STATUS_EMOJI[t.status]
  const proj = t.project ? ` _(${t.project})_` : ''
  return `${status} ${prio} \`${t.id.slice(0, 8)}\` ${t.title}${proj}`
}

export async function POST(req: NextRequest) {
  const raw = await req.text()
  const timestamp = req.headers.get('x-slack-request-timestamp')
  const signature = req.headers.get('x-slack-signature')
  if (!verifySlackSignature({ body: raw, timestamp, signature })) {
    return NextResponse.json({ error: 'invalid_signature' }, { status: 401 })
  }

  const params = new URLSearchParams(raw)
  const command = params.get('command') || ''
  const text = (params.get('text') || '').trim()

  if (command === '/agents') {
    const lines = [
      `*Team — ${AGENTS.length} agents*`,
      `_Managers (${MANAGERS.length}):_ ${MANAGERS.map(m => `<#${m.channel}|${m.channel}>`).join(' · ')}`,
      `_Specialisten (${SPECIALISTS.length}):_ ${SPECIALISTS.map(s => s.key).join(', ')}`,
      '',
      'Open een kanaal om rechtstreeks met één agent te praten, of gebruik <#orchestrator|orchestrator> om werk te laten verdelen.',
    ]
    return ephem(lines.join('\n'))
  }

  if (command === '/agent') {
    if (!text) return ephem('Gebruik: `/agent <naam>` — bijv. `/agent mgr-ad`')
    const agent = AGENTS.find(a => a.key === text || a.channel === text)
    if (!agent) return ephem(`Geen agent '${text}' gevonden.`)
    return ephem(
      `*${agent.key}* — ${agent.description}\nKanaal: <#${agent.channel}|${agent.channel}> · Model: ${agent.model}${agent.manager ? ` · Manager: ${agent.manager}` : ''}`,
    )
  }

  if (command === '/task') {
    if (!text) return ephem('Gebruik: `/task <titel>` — optioneel: `/task <titel> #<project>`')
    const projectMatch = text.match(/\s#([^\s][^\n]*)$/)
    const title = (projectMatch ? text.slice(0, projectMatch.index) : text).trim()
    const project = projectMatch ? projectMatch[1].trim() : (channelProject(params) ?? 'Mission Control')
    if (!title) return ephem('Geef een titel mee — `/task <titel>`')
    const task = await createTask({ title, project, priority: 3 })
    if (!task) return ephem(':warning: Task kon niet worden aangemaakt — zie Vercel logs.')
    return ephem(`:white_check_mark: task aangemaakt\n${fmtTaskLine(task)}`)
  }

  if (command === '/tasks') {
    const project = text ? text.replace(/^#/, '').trim() : undefined
    const tasks = await listOpenTasks({ project, limit: 10 })
    if (!tasks.length) return ephem(project ? `Geen open taken voor *${project}*.` : 'Geen open taken — schone lei.')
    const header = project ? `*Open taken voor ${project}* (${tasks.length})` : `*Open taken* (top ${tasks.length})`
    return ephem([header, ...tasks.map(fmtTaskLine)].join('\n'))
  }

  if (command === '/done') {
    if (!text) return ephem('Gebruik: `/done <id-prefix>` — bijv. `/done 1ba85ca2`')
    const task = await findTaskByIdPrefix(text.split(/\s/)[0])
    if (!task) return ephem(`Geen taak gevonden met id-prefix \`${text}\`.`)
    if (task.status === 'done') return ephem(`:information_source: Taak staat al op done: ${fmtTaskLine(task)}`)
    const updated = await setTaskStatus(task.id, 'done')
    if (!updated) return ephem(':warning: Kon status niet updaten.')
    return ephem(`:tada: Afgerond\n${fmtTaskLine(updated)}`)
  }

  if (command === '/projects') {
    const projects = await listActiveProjects()
    if (!projects.length) return ephem('Geen actieve projecten.')
    const lines = projects.map((p) => `• ${p.name}${p.description ? ` — ${p.description}` : ''}`)
    return ephem([`*Actieve projecten* (${projects.length})`, ...lines].join('\n'))
  }

  if (command === '/project') {
    if (!text) return ephem('Gebruik: `/project <naam>` — maakt een nieuw project aan')
    const name = text.replace(/^#/, '').trim()
    const project = await createProject({ name })
    if (!project) return ephem(`:warning: Kon project niet aanmaken (bestaat '${name}' misschien al?)`)
    return ephem(`:sparkles: Project *${project.name}* aangemaakt — status: ${project.status}`)
  }

  return ephem(`Onbekend commando ${command}`)
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: 'POST /api/slack/commands',
    commands: ['/agents', '/agent', '/task', '/tasks', '/done', '/projects', '/project'],
  })
}
