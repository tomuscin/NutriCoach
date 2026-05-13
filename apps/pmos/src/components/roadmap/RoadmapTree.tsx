'use client'

import { useState } from 'react'
import { RoadmapNode } from '@/components/roadmap/RoadmapNode'
import { STATUS_DOT } from '@/lib/constants'

type Tag = { tag: { id: string; name: string } }
type Count = { logs: number; decisions: number }

type NodeWithChildren = {
  id: string
  title: string
  description: string | null
  status: string
  priority: string
  order: number
  tags: Tag[]
  _count: Count
  children: NodeWithChildren[]
}

interface RoadmapTreeProps {
  node: NodeWithChildren
  depth: number
}

export function RoadmapTree({ node, depth }: RoadmapTreeProps) {
  const [expanded, setExpanded] = useState(depth < 1 || node.status === 'in_progress')

  const hasChildren = node.children.length > 0

  return (
    <div>
      {/* Node row */}
      <div
        className={`
          group flex items-start gap-0 rounded hover:bg-bg-elevated transition-colors
          ${depth === 0 ? 'py-1' : ''}
        `}
        style={{ paddingLeft: `${depth * 20}px` }}
      >
        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className={`
            flex-shrink-0 w-5 h-7 flex items-center justify-center
            text-text-tertiary hover:text-text-secondary transition-colors
            ${!hasChildren ? 'opacity-0 pointer-events-none' : ''}
          `}
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            className={`transition-transform ${expanded ? 'rotate-90' : ''}`}
          >
            <path d="M3 2l4 3-4 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Status dot */}
        <div className="flex-shrink-0 w-4 h-7 flex items-center justify-center">
          <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[node.status] ?? 'bg-text-tertiary'}`} />
        </div>

        {/* Content */}
        <RoadmapNode node={node} depth={depth} />
      </div>

      {/* Children */}
      {expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <RoadmapTree key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}
