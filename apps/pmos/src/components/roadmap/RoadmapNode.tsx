import { STATUS_LABELS, STATUS_COLORS, PRIORITY_COLORS } from '@/lib/constants'

type Tag = { tag: { id: string; name: string } }
type Count = { logs: number; decisions: number }

interface RoadmapNodeProps {
  node: {
    id: string
    title: string
    description: string | null
    status: string
    priority: string
    order: number
    tags: Tag[]
    _count: Count
  }
  depth: number
}

export function RoadmapNode({ node, depth }: RoadmapNodeProps) {
  const statusColor = STATUS_COLORS[node.status] ?? 'text-text-secondary'
  const priorityColor = PRIORITY_COLORS[node.priority] ?? 'text-text-secondary'

  return (
    <div className="flex-1 min-w-0 py-1.5 pr-4">
      <div className="flex items-baseline gap-3 min-w-0">
        {/* Title */}
        <span
          className={`
            text-sm leading-snug flex-shrink-0
            ${depth === 0 ? 'font-medium text-text-primary' : 'font-normal text-text-primary'}
            ${node.status === 'done' ? 'line-through text-text-tertiary' : ''}
            ${node.status === 'archived' ? 'text-text-tertiary' : ''}
          `}
        >
          {node.title}
        </span>

        {/* Meta pills */}
        <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
          {/* Tags */}
          {node.tags.slice(0, 3).map(({ tag }) => (
            <span
              key={tag.id}
              className="text-2xs text-text-tertiary bg-bg-elevated border border-bg-border px-1.5 py-0.5 rounded"
            >
              #{tag.name}
            </span>
          ))}

          {/* Log count */}
          {node._count.logs > 0 && (
            <span className="text-2xs text-text-tertiary flex items-center gap-1">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <rect x="1" y="1" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
                <path d="M3 4h4M3 6h2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
              {node._count.logs}
            </span>
          )}

          {/* Decision count */}
          {node._count.decisions > 0 && (
            <span className="text-2xs text-text-tertiary flex items-center gap-1">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M5 1L9 9H1L5 1Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
              </svg>
              {node._count.decisions}
            </span>
          )}

          {/* Priority — only high */}
          {node.priority === 'high' && (
            <span className={`text-2xs ${priorityColor}`}>↑</span>
          )}

          {/* Status */}
          <span className={`text-2xs ${statusColor}`}>
            {STATUS_LABELS[node.status]}
          </span>
        </div>
      </div>

      {/* Description — only depth 0 */}
      {depth === 0 && node.description && (
        <p className="text-text-secondary text-xs mt-0.5 leading-relaxed line-clamp-1 pr-4">
          {node.description}
        </p>
      )}
    </div>
  )
}
