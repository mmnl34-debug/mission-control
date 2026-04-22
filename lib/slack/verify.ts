import { createHmac, timingSafeEqual } from 'node:crypto'
import { SLACK_SIGNING_SECRET } from './config'

export function verifySlackSignature(args: {
  body: string
  timestamp: string | null
  signature: string | null
}): boolean {
  if (!SLACK_SIGNING_SECRET) return false
  if (!args.timestamp || !args.signature) return false
  const tsNum = Number(args.timestamp)
  if (!Number.isFinite(tsNum)) return false
  // Anti-replay: max 5 min oud
  if (Math.abs(Date.now() / 1000 - tsNum) > 60 * 5) return false

  const base = `v0:${args.timestamp}:${args.body}`
  const expected = `v0=${createHmac('sha256', SLACK_SIGNING_SECRET).update(base).digest('hex')}`

  const a = Buffer.from(expected)
  const b = Buffer.from(args.signature)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}
