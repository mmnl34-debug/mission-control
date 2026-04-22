import { SLACK_API, SLACK_BOT_TOKEN } from './config'

async function slackCall<T = unknown>(method: string, body: Record<string, unknown>): Promise<T & { ok: boolean; error?: string }> {
  const res = await fetch(`${SLACK_API}/${method}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify(body),
  })
  return res.json() as Promise<T & { ok: boolean; error?: string }>
}

export async function postMessage(args: {
  channel: string
  text: string
  thread_ts?: string
  blocks?: unknown[]
}) {
  return slackCall<{ ts: string; channel: string }>('chat.postMessage', args)
}

export async function createConversation(args: { name: string; is_private?: boolean }) {
  return slackCall<{ channel: { id: string; name: string } }>('conversations.create', args)
}

export async function setConversationTopic(args: { channel: string; topic: string }) {
  return slackCall('conversations.setTopic', args)
}

export async function setConversationPurpose(args: { channel: string; purpose: string }) {
  return slackCall('conversations.setPurpose', args)
}

export async function conversationsList() {
  const url = `${SLACK_API}/conversations.list?limit=1000&types=public_channel,private_channel`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${SLACK_BOT_TOKEN}` } })
  return res.json() as Promise<{ ok: boolean; channels: { id: string; name: string }[]; error?: string }>
}

export async function conversationsInfo(channel: string) {
  const url = `${SLACK_API}/conversations.info?channel=${encodeURIComponent(channel)}`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${SLACK_BOT_TOKEN}` } })
  return res.json() as Promise<{ ok: boolean; channel?: { id: string; name: string }; error?: string }>
}

export async function inviteToConversation(args: { channel: string; users: string }) {
  return slackCall('conversations.invite', args)
}

export async function authTest() {
  const res = await fetch(`${SLACK_API}/auth.test`, {
    headers: { Authorization: `Bearer ${SLACK_BOT_TOKEN}` },
  })
  return res.json() as Promise<{ ok: boolean; user_id?: string; team?: string; error?: string }>
}
