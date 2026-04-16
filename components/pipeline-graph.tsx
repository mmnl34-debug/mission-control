'use client'

import type { AgentSession } from '@/lib/supabase'
import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { nl } from 'date-fns/locale'

const STATUS_COLORS: Record<string, string> = {
  active: '#00d4ff',
  idle: '#f59e0b',
  completed: '#10b981',
  error: '#ef4444',
}

const NODE_W = 160
const NODE_H = 72
const H_GAP = 24
const V_GAP = 48
const LANE_LABEL_W = 96
const PADDING = 16

interface NodePos {
  session: AgentSession
  x: number
  y: number
}

interface Lane {
  project: string
  sessions: AgentSession[]
  y: number
}

function truncate(s: string | null | undefined, n: number): string {
  if (!s) return ''
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}

function buildLayout(sessions: AgentSession[]): { lanes: Lane[]; totalHeight: number; nodePositions: NodePos[] } {
  // Group by project
  const groups = new Map<string, AgentSession[]>()
  for (const s of sessions) {
    const key = s.project ?? 'Algemeen'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(s)
  }

  const lanes: Lane[] = []
  const nodePositions: NodePos[] = []
  let y = PADDING

  for (const [project, groupSessions] of groups) {
    const lane: Lane = { project, sessions: groupSessions, y }
    lanes.push(lane)

    groupSessions.forEach((session, i) => {
      const x = LANE_LABEL_W + PADDING + i * (NODE_W + H_GAP)
      nodePositions.push({ session, x, y: y + 8 })
    })

    y += NODE_H + 16 + V_GAP
  }

  return { lanes, totalHeight: y, nodePositions }
}

function CubicPath({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  const mx = (x1 + x2) / 2
  const d = `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`
  return (
    <>
      <path d={d} fill="none" stroke="rgba(0,212,255,0.3)" strokeWidth={1.5} />
      <circle r={3} fill="#00d4ff">
        <animateMotion dur="2.5s" repeatCount="indefinite" path={d} />
      </circle>
    </>
  )
}

export function PipelineGraph({ sessions }: { sessions: AgentSession[] }) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  if (sessions.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height: 220 }}>
        <span className="font-terminal text-sm" style={{ color: '#334155' }}>
          Geen actieve pipeline sessies
        </span>
      </div>
    )
  }

  const { lanes, totalHeight, nodePositions } = buildLayout(sessions)

  // Build parent→child connections from metadata
  const parentConnections: Array<{ fromPos: NodePos; toPos: NodePos }> = []
  for (const np of nodePositions) {
    const parentId = np.session.metadata?.parent_session_id as string | undefined
    if (parentId) {
      const parentNp = nodePositions.find(p => p.session.session_id === parentId || p.session.id === parentId)
      if (parentNp) {
        parentConnections.push({ fromPos: parentNp, toPos: np })
      }
    }
  }

  // Intra-lane connections (sequential nodes in same lane)
  const laneConnections: Array<{ fromPos: NodePos; toPos: NodePos }> = []
  for (const lane of lanes) {
    if (lane.sessions.length > 1) {
      const laneNodes = nodePositions.filter(np =>
        lane.sessions.some(s => s.id === np.session.id)
      )
      for (let i = 0; i < laneNodes.length - 1; i++) {
        laneConnections.push({ fromPos: laneNodes[i], toPos: laneNodes[i + 1] })
      }
    }
  }

  const svgWidth = Math.max(
    ...nodePositions.map(np => np.x + NODE_W + PADDING),
    400
  )

  const hovered = hoveredId ? nodePositions.find(np => np.session.id === hoveredId) : null

  return (
    <div className="relative overflow-auto">
      <svg
        width={svgWidth}
        height={totalHeight + PADDING}
        style={{ display: 'block', minWidth: '100%' }}
      >
        {/* Lane labels and separators */}
        {lanes.map((lane, i) => (
          <g key={lane.project}>
            {/* Lane separator (not first) */}
            {i > 0 && (
              <line
                x1={0}
                y1={lane.y - V_GAP / 2}
                x2={svgWidth}
                y2={lane.y - V_GAP / 2}
                stroke="rgba(0,212,255,0.06)"
                strokeWidth={1}
              />
            )}
            {/* Lane label */}
            <text
              x={PADDING / 2}
              y={lane.y + NODE_H / 2 + 8}
              fill="#475569"
              fontSize={10}
              fontFamily="'JetBrains Mono', 'Fira Code', monospace"
              transform={`rotate(-90, ${PADDING / 2}, ${lane.y + NODE_H / 2 + 8})`}
            >
              {truncate(lane.project, 14)}
            </text>
          </g>
        ))}

        {/* Intra-lane connections */}
        {laneConnections.map(({ fromPos, toPos }, i) => (
          <CubicPath
            key={`lane-${i}`}
            x1={fromPos.x + NODE_W}
            y1={fromPos.y + NODE_H / 2}
            x2={toPos.x}
            y2={toPos.y + NODE_H / 2}
          />
        ))}

        {/* Parent→child connections */}
        {parentConnections.map(({ fromPos, toPos }, i) => (
          <CubicPath
            key={`parent-${i}`}
            x1={fromPos.x + NODE_W / 2}
            y1={fromPos.y + NODE_H}
            x2={toPos.x + NODE_W / 2}
            y2={toPos.y}
          />
        ))}

        {/* Nodes */}
        {nodePositions.map(({ session, x, y }) => {
          const c = STATUS_COLORS[session.status] ?? '#64748b'
          const isHovered = hoveredId === session.id
          return (
            <g
              key={session.id}
              onMouseEnter={() => setHoveredId(session.id)}
              onMouseLeave={() => setHoveredId(null)}
              style={{ cursor: 'pointer' }}
            >
              {/* Glow on hover */}
              {isHovered && (
                <rect
                  x={x - 2}
                  y={y - 2}
                  width={NODE_W + 4}
                  height={NODE_H + 4}
                  rx={8}
                  fill="none"
                  stroke={c}
                  strokeWidth={1}
                  opacity={0.4}
                  filter="url(#glow)"
                />
              )}
              {/* Node background */}
              <rect
                x={x}
                y={y}
                width={NODE_W}
                height={NODE_H}
                rx={6}
                fill="rgba(255,255,255,0.03)"
                stroke={isHovered ? c : 'rgba(0,212,255,0.15)'}
                strokeWidth={isHovered ? 1.5 : 1}
              />
              {/* Left status border */}
              <rect
                x={x}
                y={y + 6}
                width={3}
                height={NODE_H - 12}
                rx={1.5}
                fill={c}
              />
              {/* Agent name */}
              <text
                x={x + 12}
                y={y + 22}
                fill="white"
                fontSize={11}
                fontWeight="bold"
                fontFamily="'JetBrains Mono', 'Fira Code', monospace"
              >
                {truncate(session.agent_name, 16)}
              </text>
              {/* Status badge */}
              <rect
                x={x + NODE_W - 52}
                y={y + 8}
                width={44}
                height={14}
                rx={3}
                fill={`${c}22`}
              />
              <text
                x={x + NODE_W - 30}
                y={y + 19}
                fill={c}
                fontSize={8}
                textAnchor="middle"
                fontFamily="'JetBrains Mono', 'Fira Code', monospace"
                letterSpacing="0.08em"
              >
                {session.status.toUpperCase()}
              </text>
              {/* Current task / project subtitle */}
              <text
                x={x + 12}
                y={y + 40}
                fill="#94a3b8"
                fontSize={9}
                fontFamily="'JetBrains Mono', 'Fira Code', monospace"
              >
                {truncate(session.current_task ?? session.project ?? session.model, 22)}
              </text>
              {/* Model */}
              <text
                x={x + 12}
                y={y + 56}
                fill="#475569"
                fontSize={8}
                fontFamily="'JetBrains Mono', 'Fira Code', monospace"
              >
                {truncate(session.model, 24)}
              </text>
              {/* Active "now" indicator */}
              {session.status === 'active' && (
                <line
                  x1={x + NODE_W + 6}
                  y1={y + 4}
                  x2={x + NODE_W + 6}
                  y2={y + NODE_H - 4}
                  stroke="#00d4ff"
                  strokeWidth={1.5}
                  opacity={0.6}
                />
              )}
            </g>
          )
        })}

        {/* SVG filter for glow */}
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>

      {/* Tooltip */}
      {hovered && (
        <div
          style={{
            position: 'absolute',
            left: hovered.x + NODE_W + 12,
            top: hovered.y,
            background: 'rgba(7,7,15,0.95)',
            border: '1px solid rgba(0,212,255,0.2)',
            borderRadius: 8,
            padding: '10px 14px',
            pointerEvents: 'none',
            zIndex: 10,
            minWidth: 200,
          }}
        >
          <p className="font-terminal text-xs font-bold" style={{ color: '#f1f5f9', marginBottom: 4 }}>
            {hovered.session.agent_name}
          </p>
          <p className="font-terminal" style={{ color: '#64748b', fontSize: 10 }}>
            Model: {hovered.session.model}
          </p>
          <p className="font-terminal" style={{ color: '#64748b', fontSize: 10 }}>
            Gestart: {formatDistanceToNow(new Date(hovered.session.started_at), { locale: nl, addSuffix: true })}
          </p>
          {hovered.session.current_task && (
            <p className="font-terminal" style={{ color: '#64748b', fontSize: 10, marginTop: 4 }}>
              Taak: {truncate(hovered.session.current_task, 40)}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
