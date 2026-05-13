import { db } from '@/lib/db'
import { LogList } from '@/components/logs/LogList'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

async function getLogs() {
  return db.executionLog.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      tags: { include: { tag: true } },
      nodes: { include: { node: { select: { id: true, title: true } } } },
    },
  })
}

export default async function LogsPage() {
  const logs = await getLogs()

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-bg-base/95 backdrop-blur border-b border-bg-border px-8 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-text-primary text-lg font-medium">Execution Logs</h1>
            <p className="text-text-secondary text-sm mt-0.5">
              {logs.length} {logs.length === 1 ? 'log' : 'logs'}
            </p>
          </div>
          <Link
            href="/logs/new"
            className="flex items-center gap-2 px-3 py-1.5 rounded bg-accent/10 text-accent text-sm hover:bg-accent/20 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Add log
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="px-8 py-6">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-text-secondary text-sm">No execution logs yet.</p>
            <Link href="/logs/new" className="mt-4 text-accent text-sm hover:underline">
              Log first execution
            </Link>
          </div>
        ) : (
          <LogList logs={logs} />
        )}
      </div>
    </div>
  )
}
