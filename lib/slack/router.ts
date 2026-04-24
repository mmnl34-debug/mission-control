import Anthropic from '@anthropic-ai/sdk'
import { ANTHROPIC_API_KEY } from './config'
import { AGENT_BY_CHANNEL, AGENT_BY_KEY, type AgentDef } from './agents-registry'
import { postMessage, conversationsInfo } from './client'

const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY })

const PRICING_PER_MTOK: Record<string, { input: number; output: number }> = {
  'claude-opus-4-7': { input: 15, output: 75 },
  'claude-sonnet-4-6': { input: 3, output: 15 },
  'claude-haiku-4-5-20251001': { input: 1, output: 5 },
}

function computeCostUsd(model: string, inputTokens: number, outputTokens: number): number | null {
  const p = PRICING_PER_MTOK[model]
  if (!p) return null
  return (inputTokens * p.input + outputTokens * p.output) / 1_000_000
}

async function logCost(params: {
  sessionId: string
  agentName: string
  model: string
  inputTokens: number
  outputTokens: number
  costUsd: number
}) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return
  try {
    await fetch(`${url}/rest/v1/cost_tracking`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        session_id: params.sessionId,
        agent_name: params.agentName,
        model: params.model,
        input_tokens: params.inputTokens,
        output_tokens: params.outputTokens,
        cache_read_tokens: 0,
        cache_write_tokens: 0,
        cost_usd: params.costUsd,
      }),
    })
  } catch (err) {
    console.warn('cost_tracking insert failed:', err)
  }
}

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
    const { text: reply, usage } = await runAgent(agent, userText)
    await postMessage({
      channel: event.channel,
      text: reply,
      thread_ts: event.thread_ts || event.ts,
    })
    const cost = computeCostUsd(agent.model, usage.input_tokens, usage.output_tokens)
    if (cost !== null) {
      await logCost({
        sessionId: `slack-${event.channel}-${event.ts ?? Date.now()}`,
        agentName: agent.key,
        model: agent.model,
        inputTokens: usage.input_tokens,
        outputTokens: usage.output_tokens,
        costUsd: cost,
      })
    }
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

async function runAgent(agent: AgentDef, input: string): Promise<{ text: string; usage: Anthropic.Usage }> {
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
  return { text: text || '(geen antwoord)', usage: res.usage }
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
