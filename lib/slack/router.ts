import Anthropic from '@anthropic-ai/sdk'
import { ANTHROPIC_API_KEY } from './config'
import { AGENT_BY_CHANNEL, AGENT_BY_KEY, type AgentDef } from './agents-registry'
import { postMessage, conversationsInfo } from './client'

const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY })

type SlackEvent = {
  type: string
  user?: string
  text?: string
  channel?: string
  ts?: string
  thread_ts?: string
  bot_id?: string
  subtype?: string
  channel_type?: string
}

const channelIdCache = new Map<string, string>()
async function channelNameFromId(id: string): Promise<string | null> {
  if (channelIdCache.has(id)) return channelIdCache.get(id)!
  const info = await conversationsInfo(id)
  if (info.ok && info.channel) {
    channelIdCache.set(id, info.channel.name)
    return info.channel.name
  }
  return null
}

function stripMentions(text: string): string {
  return text.replace(/<@[A-Z0-9]+>/g, '').trim()
}

export async function handleEvent(event: SlackEvent) {
  if (!event.channel || !event.text) return
  if (event.bot_id) return
  if (event.subtype && event.subtype !== 'thread_broadcast') return

  const channelName = await channelNameFromId(event.channel)
  if (!channelName) return

  const agent = AGENT_BY_CHANNEL[channelName]
  if (!agent) return

  const userText = stripMentions(event.text)
  if (!userText) return

  try {
    const reply = await runAgent(agent, userText)
    await postMessage({
      channel: event.channel,
      text: reply,
      thread_ts: event.thread_ts || event.ts,
    })
    await handleDelegations(reply, event.channel, event.thread_ts || event.ts)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await postMessage({
      channel: event.channel,
      text: `:warning: agent-fout: ${msg}`,
      thread_ts: event.thread_ts || event.ts,
    })
  }
}

async function runAgent(agent: AgentDef, input: string): Promise<string> {
  const res = await anthropic.messages.create({
    model: agent.model,
    max_tokens: 1500,
    system: agent.systemPrompt,
    messages: [{ role: 'user', content: input }],
  })
  const text = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('\n')
  return text || '(geen antwoord)'
}

const DELEGATE_RE = /^>>\s*DELEGATE:\s*([a-z0-9-]+)\s*::\s*(.+)$/gim

async function handleDelegations(reply: string, sourceChannel: string, threadTs: string | undefined) {
  const matches = [...reply.matchAll(DELEGATE_RE)]
  for (const m of matches) {
    const targetKey = m[1]
    const task = m[2].trim()
    const target = AGENT_BY_KEY[targetKey]
    if (!target) continue
    const targetChannel = `#${target.channel}`
    await postMessage({
      channel: targetChannel,
      text: `:inbox_tray: Taak van <#${sourceChannel}>:\n${task}`,
    })
    if (threadTs) {
      await postMessage({
        channel: sourceChannel,
        text: `:arrow_forward: doorgezet naar <#${targetChannel}>`,
        thread_ts: threadTs,
      })
    }
  }
}
