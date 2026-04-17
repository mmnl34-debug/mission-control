export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { fetchWeather, weatherEmoji } from '@/lib/weather'
import { fetchHNNews, fetchNOSNews } from '@/lib/news'

const SB_URL = 'https://logkkueavewqmaquuwfw.supabase.co'
const SB_KEY = 'sb_publishable_nqPICLQDoaXGb8hshPIYYg_uv9GRuid'
const SB_HEADERS = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` }

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

async function getDashboardContext(): Promise<string> {
  try {
    const [sessions, logs, costs, tasks] = await Promise.all([
      fetch(`${SB_URL}/rest/v1/agent_sessions?select=agent_name,status,project,current_task,model&order=last_seen_at.desc&limit=10`, { headers: SB_HEADERS, cache: 'no-store' }).then(r => r.ok ? r.json() : []),
      fetch(`${SB_URL}/rest/v1/agent_logs?select=event_type,message,agent_name,created_at&order=created_at.desc&limit=20`, { headers: SB_HEADERS, cache: 'no-store' }).then(r => r.ok ? r.json() : []),
      fetch(`${SB_URL}/rest/v1/cost_tracking?select=cost_usd,input_tokens,output_tokens,model,agent_name,recorded_at&order=recorded_at.desc&limit=50`, { headers: SB_HEADERS, cache: 'no-store' }).then(r => r.ok ? r.json() : []),
      fetch(`${SB_URL}/rest/v1/tasks?select=title,status,priority&order=priority.asc&limit=20`, { headers: SB_HEADERS, cache: 'no-store' }).then(r => r.ok ? r.json() : []),
    ])

    const active = sessions.filter((s: { status: string }) => s.status === 'active')
    const errors = logs.filter((l: { event_type: string }) => l.event_type === 'error')
    const today = new Date().toISOString().slice(0, 10)
    const todayCosts = costs.filter((c: { recorded_at: string }) => c.recorded_at?.startsWith(today))
    const totalToday = todayCosts.reduce((s: number, c: { cost_usd: number }) => s + Number(c.cost_usd), 0)
    const totalTokens = todayCosts.reduce((s: number, c: { input_tokens: number; output_tokens: number }) => s + c.input_tokens + c.output_tokens, 0)
    const inProgress = tasks.filter((t: { status: string }) => t.status === 'in_progress')
    const todo = tasks.filter((t: { status: string }) => t.status === 'todo')
    const done = tasks.filter((t: { status: string }) => t.status === 'done')

    return `
## Live Mission Control Data (${new Date().toLocaleString('nl-NL')})

### Agents
- Actief: ${active.length} van ${sessions.length} sessies
${active.map((s: { agent_name: string; project: string | null; current_task: string | null; model: string }) => `  - ${s.agent_name}${s.project ? ` | project: ${s.project}` : ''}${s.current_task ? ` | taak: ${s.current_task.slice(0, 80)}` : ''} | model: ${s.model}`).join('\n')}

### Kosten vandaag
- Totaal: $${totalToday.toFixed(4)}
- Tokens: ${totalTokens.toLocaleString('nl-NL')}
${todayCosts.slice(0, 5).map((c: { agent_name: string | null; model: string; cost_usd: number }) => `  - ${c.agent_name ?? 'onbekend'} (${c.model}): $${Number(c.cost_usd).toFixed(4)}`).join('\n')}

### Recente activiteit (laatste 10)
${logs.slice(0, 10).map((l: { event_type: string; agent_name: string; message: string }) => `  - [${l.event_type}] ${l.agent_name}: ${l.message?.slice(0, 100)}`).join('\n')}

### Fouten (recent)
${errors.length === 0 ? '  - Geen fouten' : errors.slice(0, 5).map((e: { agent_name: string; message: string }) => `  - ${e.agent_name}: ${e.message?.slice(0, 100)}`).join('\n')}

### Taken
- Todo: ${todo.length} | Bezig: ${inProgress.length} | Klaar: ${done.length}
${inProgress.map((t: { title: string }) => `  - [BEZIG] ${t.title}`).join('\n')}
${todo.slice(0, 5).map((t: { title: string }) => `  - [TODO] ${t.title}`).join('\n')}
`.trim()
  } catch {
    return 'Dashboard data tijdelijk niet beschikbaar.'
  }
}

async function getWeatherContext(): Promise<string> {
  const w = await fetchWeather('Eindhoven')
  if (!w) return 'Weerdata niet beschikbaar.'
  const emoji = weatherEmoji(w.code)
  return `### Weer Eindhoven
${emoji} ${w.temp}°C, voelt als ${w.feelsLike}°C
Omschrijving: ${w.description}
Wind: ${w.windSpeed} km/u | Luchtvochtigheid: ${w.humidity}%`
}

async function getNewsContext(): Promise<string> {
  const [hn, nos] = await Promise.all([fetchHNNews(5), fetchNOSNews(5)])
  const hnText = hn.map(n => `  - ${n.title}`).join('\n') || '  - Geen nieuws beschikbaar'
  const nosText = nos.map(n => `  - ${n.title}`).join('\n') || '  - Geen nieuws beschikbaar'
  return `### Nieuws
#### AI & Tech (Hacker News)
${hnText}

#### Nederland (NOS)
${nosText}`
}

export async function POST(req: NextRequest) {
  const { transcript } = await req.json()

  if (!transcript || typeof transcript !== 'string') {
    return NextResponse.json({ error: 'Geen transcript' }, { status: 400 })
  }

  // Alleen weer/nieuws ophalen als de vraag er waarschijnlijk over gaat
  const lc = transcript.toLowerCase()
  const wantsWeather = lc.includes('weer') || lc.includes('temp') || lc.includes('graden') || lc.includes('regen') || lc.includes('wind')
  const wantsNews = lc.includes('nieuws') || lc.includes('news') || lc.includes('headline') || lc.includes('nos') || lc.includes('hacker')

  const [context, weatherCtx, newsCtx] = await Promise.all([
    getDashboardContext(),
    wantsWeather ? getWeatherContext() : Promise.resolve(''),
    wantsNews ? getNewsContext() : Promise.resolve(''),
  ])

  const extraContext = [weatherCtx, newsCtx].filter(Boolean).join('\n\n')

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    system: `Je bent JARVIS, de intelligente AI assistent van Mission Control — een persoonlijk dashboard voor het monitoren van Claude Code AI agents van Gertjan.

Je spreekt altijd in het Nederlands. Je antwoorden zijn kort, direct en informatief (maximaal 3 zinnen). Je spreekt als een zelfverzekerde, professionele AI assistent — denk aan JARVIS uit Iron Man maar dan in het Nederlands.

Je hebt toegang tot live dashboard data hieronder. Gebruik deze data om vragen te beantwoorden. Voor algemene vragen die niets met het dashboard te maken hebben, beantwoord je ze gewoon op basis van je eigen kennis.

Zeg nooit "Ik ben een taalmodel" of vergelijkbare disclaimers. Gewoon antwoorden.

${context}${extraContext ? '\n\n' + extraContext : ''}`,
    messages: [{ role: 'user', content: transcript }],
  })

  const response = message.content[0].type === 'text' ? message.content[0].text : 'Geen antwoord ontvangen.'

  return NextResponse.json({ response })
}
