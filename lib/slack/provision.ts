import { AGENTS } from './agents-registry'
import { createConversation, setConversationPurpose, setConversationTopic, conversationsList } from './client'

export type ProvisionResult = {
  created: string[]
  skipped: string[]
  errors: { channel: string; error: string }[]
}

export async function provisionAllChannels(): Promise<ProvisionResult> {
  const result: ProvisionResult = { created: [], skipped: [], errors: [] }

  const existing = await conversationsList()
  const existingNames = new Set((existing.channels || []).map(c => c.name))

  for (const agent of AGENTS) {
    const name = agent.channel
    if (existingNames.has(name)) {
      result.skipped.push(name)
      continue
    }
    const res = await createConversation({ name })
    if (!res.ok || !res.channel) {
      result.errors.push({ channel: name, error: res.error || 'unknown' })
      continue
    }
    const channelId = res.channel.id

    const topic = agent.manager
      ? `Specialist — valt onder ${agent.manager}`
      : agent.key.startsWith('mgr-')
        ? 'Manager — verdeelt werk over specialisten'
        : agent.key === 'orchestrator'
          ? 'Orchestrator — hoofdingang voor opdrachten'
          : 'Centraal brein — gedeelde context voor het team'

    await setConversationTopic({ channel: channelId, topic })
    await setConversationPurpose({ channel: channelId, purpose: agent.description })
    result.created.push(name)
    // kleine pauze tegen rate-limits
    await new Promise(r => setTimeout(r, 250))
  }
  return result
}
