'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase, type AgentSession, type CostRecord, type Project } from '@/lib/supabase'
import { Bot, FolderKanban, Activity, DollarSign } from 'lucide-react'

type Props = {
  initialSessions: AgentSession[]
  initialCosts: CostRecord[]
  initialProjects: Project[]
}

function StatCard({
  label,
  value,
  icon: Icon,
  topColor,
  changed,
}: {
  label: string
  value: string | number
  icon: React.ElementType
  topColor: string
  changed: boolean
}) {
  return (
    <div
      className="glass-card relative overflow-hidden flex flex-col p-5 transition-all"
      style={{
        borderTop: `1px solid ${topColor}`,
        boxShadow: `0 0 20px ${topColor}18, inset 0 1px 0 ${topColor}30`,
      }}
    >
      {/* Top glow bar */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${topColor}, transparent)` }}
      />

      <div className="flex items-center justify-between mb-4">
        <span className="text-xs tracking-widest uppercase font-terminal" style={{ color: '#334155' }}>
          {label}
        </span>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: `${topColor}18`, border: `1px solid ${topColor}30` }}
        >
          <Icon size={14} style={{ color: topColor }} />
        </div>
      </div>

      <div
        className={`font-terminal text-3xl font-bold transition-all duration-300 ${changed ? 'counter-changed' : 'glow-text'}`}
        style={{ color: '#f1f5f9' }}
      >
        {value}
      </div>
    </div>
  )
}

export function LiveStats({ initialSessions, initialCosts, initialProjects }: Props) {
  const [sessions, setSessions] = useState<AgentSession[]>(initialSessions)
  const [costs, setCosts] = useState<CostRecord[]>(initialCosts)
  const [projects] = useState<Project[]>(initialProjects)
  const [changed, setChanged] = useState<Record<string, boolean>>({})
  const prevValues = useRef<Record<string, string | number>>({})

  function triggerChange(key: string) {
    setChanged(prev => ({ ...prev, [key]: true }))
    setTimeout(() => setChanged(prev => ({ ...prev, [key]: false })), 700)
  }

  useEffect(() => {
    const channel = supabase
      .channel('live-stats')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'agent_sessions' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setSessions(prev => [payload.new as AgentSession, ...prev])
            triggerChange('agents')
          } else if (payload.eventType === 'UPDATE') {
            setSessions(prev =>
              prev.map(s => s.id === (payload.new as AgentSession).id ? payload.new as AgentSession : s)
            )
            triggerChange('agents')
          } else if (payload.eventType === 'DELETE') {
            setSessions(prev => prev.filter(s => s.id !== (payload.old as { id: string }).id))
            triggerChange('agents')
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cost_tracking' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setCosts(prev => [payload.new as CostRecord, ...prev])
            triggerChange('cost')
            triggerChange('tokens')
          } else if (payload.eventType === 'UPDATE') {
            setCosts(prev =>
              prev.map(c => c.id === (payload.new as CostRecord).id ? payload.new as CostRecord : c)
            )
            triggerChange('cost')
            triggerChange('tokens')
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const activeCount = sessions.filter(s => s.status === 'active').length
  const totalCost = costs.reduce((sum, c) => sum + Number(c.cost_usd), 0)
  const totalTokens = costs.reduce((sum, c) => sum + c.input_tokens + c.output_tokens, 0)

  useEffect(() => {
    prevValues.current = {
      agents: activeCount,
      projects: projects.length,
      tokens: totalTokens,
      cost: totalCost,
    }
  })

  const stats = [
    {
      key: 'agents',
      label: 'Active Agents',
      value: `${activeCount}/${sessions.length}`,
      icon: Bot,
      topColor: '#6366f1',
    },
    {
      key: 'projects',
      label: 'Projects',
      value: projects.length,
      icon: FolderKanban,
      topColor: '#10b981',
    },
    {
      key: 'tokens',
      label: 'Total Tokens',
      value: totalTokens >= 1000 ? `${(totalTokens / 1000).toFixed(1)}K` : totalTokens,
      icon: Activity,
      topColor: '#f59e0b',
    },
    {
      key: 'cost',
      label: 'Total Cost',
      value: `$${totalCost.toFixed(4)}`,
      icon: DollarSign,
      topColor: '#ec4899',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map(stat => (
        <StatCard
          key={stat.key}
          label={stat.label}
          value={stat.value}
          icon={stat.icon}
          topColor={stat.topColor}
          changed={!!changed[stat.key]}
        />
      ))}
    </div>
  )
}
