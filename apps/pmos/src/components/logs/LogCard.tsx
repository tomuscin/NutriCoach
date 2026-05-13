'use client'

import { useState } from 'react'
import { ALIGNMENT_LABELS, ALIGNMENT_COLORS } from '@/lib/constants'

type Tag = { tag: { id: string; name: string } }
type NodeRef = { node: { id: string; title: string } }

interface Log {
  id: string
  title: string
  summary: string | null
  prompt: string | null
  changedFiles: string[]
  architecturalImpact: string | null
  blockers: string | null
  nextSteps: string | null
  canonicalAlignment: string
  createdAt: Date
  tags: Tag[]
  nodes: NodeRef[]
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}

export function LogCard({ log }: { log: Log }) {
  const [expanded, setExpanded] = useState(false)
  const alignmentColor = ALIGNMENT_COLORS[log.canonicalAlignment] ?? 'text-text-secondary'
  const alignmentLabel = ALIGNMENT_LABELS[log.canonicalAlignment] ?? log.canonicalAlignment

  return (
    <div className="border border-bg-border rounded-lg bg-bg-surface hover:border-bg-border/80 transition-colors">
      {/* Header row */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-4 px-5 py-4 text-left"
      >
        {/* Date column */}
        <div className="flex-shrink-0 w-20 pt-0.5">
          <span className="text-text-tertiary text-xs font-mono">
            {formatDate(log.createdAt)}
          </span>
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-3">
            <span className="text-text-primary text-sm font-medium leading-snug flex-1">{log.title}</span>

            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Tags */}
              {log.tags.slice(0, 2).map(({ tag }) => (
                <span
                  key={tag.id}
                  className="text-2xs text-text-tertiary bg-bg-elevated border border-bg-border px-1.5 py-0.5 rounded"
                >
                  #{tag.name}
                </span>
              ))}

              {/* Canonical alignment */}
              <span className={`text-2xs font-medium ${alignmentColor}`}>
                {alignmentLabel}
              </span>

              {/* Expand arrow */}
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                className={`text-text-tertiary transition-transform ${expanded ? 'rotate-180' : ''}`}
              >
                <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>

          {/* Summary preview */}
          {!expanded && log.summary && (
            <p className="text-text-secondary text-xs mt-1 line-clamp-1 leading-relaxed">
              {log.summary}
            </p>
          )}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-bg-border px-5 py-4 space-y-4">
          {/* Summary */}
          {log.summary && (
            <Section label="Summary">
              <p className="text-text-secondary text-sm leading-relaxed">{log.summary}</p>
            </Section>
          )}

          {/* VSC Prompt */}
          {log.prompt && (
            <Section label="VSC Prompt">
              <pre className="text-text-secondary text-xs leading-relaxed whitespace-pre-wrap font-mono bg-bg-elevated border border-bg-border rounded p-3">
                {log.prompt}
              </pre>
            </Section>
          )}

          {/* Changed files */}
          {log.changedFiles.length > 0 && (
            <Section label="Changed Files">
              <div className="flex flex-wrap gap-1.5">
                {log.changedFiles.map((f) => (
                  <span
                    key={f}
                    className="text-2xs text-accent/80 bg-accent/5 border border-accent/10 px-2 py-0.5 rounded font-mono"
                  >
                    {f}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {/* Architectural impact */}
          {log.architecturalImpact && (
            <Section label="Architectural Impact">
              <p className="text-text-secondary text-sm leading-relaxed">{log.architecturalImpact}</p>
            </Section>
          )}

          {/* Blockers */}
          {log.blockers && (
            <Section label="Blockers">
              <p className="text-status-blocked text-sm leading-relaxed">{log.blockers}</p>
            </Section>
          )}

          {/* Next steps */}
          {log.nextSteps && (
            <Section label="Next Steps">
              <p className="text-text-secondary text-sm leading-relaxed">{log.nextSteps}</p>
            </Section>
          )}

          {/* Linked nodes */}
          {log.nodes.length > 0 && (
            <Section label="Linked Roadmap Nodes">
              <div className="flex flex-wrap gap-2">
                {log.nodes.map(({ node }) => (
                  <span
                    key={node.id}
                    className="text-xs text-text-secondary bg-bg-elevated border border-bg-border px-2 py-0.5 rounded"
                  >
                    {node.title.slice(0, 50)}
                  </span>
                ))}
              </div>
            </Section>
          )}
        </div>
      )}
    </div>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-text-tertiary text-2xs uppercase tracking-wider mb-1.5">{label}</p>
      {children}
    </div>
  )
}
