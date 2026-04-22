export const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN || ''
export const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET || ''
export const SLACK_PROVISION_TOKEN = process.env.SLACK_PROVISION_TOKEN || ''
export const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || ''

export const SLACK_API = 'https://slack.com/api'

export function assertSlackConfigured(): { ok: true } | { ok: false; missing: string[] } {
  const missing: string[] = []
  if (!SLACK_BOT_TOKEN) missing.push('SLACK_BOT_TOKEN')
  if (!SLACK_SIGNING_SECRET) missing.push('SLACK_SIGNING_SECRET')
  if (!ANTHROPIC_API_KEY) missing.push('ANTHROPIC_API_KEY')
  return missing.length ? { ok: false, missing } : { ok: true }
}
