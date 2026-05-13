import { db } from '@/lib/db'
import { RoadmapTree } from '@/components/roadmap/RoadmapTree'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

async function getRoadmapRoots() {
  return db.roadmapNode.findMany({
    where: { parentId: null },
    orderBy: { order: 'asc' },
    include: {
      children: {
        orderBy: { order: 'asc' },
        include: {
          children: {
            orderBy: { order: 'asc' },
            include: {
              tags: { include: { tag: true } },
              _count: { select: { logs: true, decisions: true } },
            },
          },
          tags: { include: { tag: true } },
          _count: { select: { logs: true, decisions: true } },
        },
      },
      tags: { include: { tag: true } },
      _count: { select: { logs: true, decisions: true } },
    },
  })
}

export default async function RoadmapPage() {
  const nodes = await getRoadmapRoots()

  const totalNodes = nodes.reduce(
    (acc, n) => acc + 1 + n.children.length + n.children.reduce((a, c) => a + c.children.length, 0),
    0
  )
  const doneNodes = nodes.reduce((acc, n) => {
    const all = [n, ...n.children, ...n.children.flatMap((c) => c.children)]
    return acc + all.filter((x) => x.status === 'done').length
  }, 0)

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-bg-base/95 backdrop-blur border-b border-bg-border px-8 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-text-primary text-lg font-medium">Roadmap</h1>
            <p className="text-text-secondary text-sm mt-0.5">
              {doneNodes}/{totalNodes} done
            </p>
          </div>
          <Link
            href="/roadmap/new"
            className="flex items-center gap-2 px-3 py-1.5 rounded bg-accent/10 text-accent text-sm hover:bg-accent/20 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Add node
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="px-8 py-6">
        {nodes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-text-secondary text-sm">No roadmap nodes yet.</p>
            <Link
              href="/roadmap/new"
              className="mt-4 text-accent text-sm hover:underline"
            >
              Create first node
            </Link>
          </div>
        ) : (
          <div className="space-y-1">
            {nodes.map((node) => (
              <RoadmapTree key={node.id} node={node} depth={0} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
