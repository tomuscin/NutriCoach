import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const nodes = await db.roadmapNode.findMany({
    where: { parentId: null },
    orderBy: { order: 'asc' },
    include: {
      children: {
        orderBy: { order: 'asc' },
        include: {
          children: { orderBy: { order: 'asc' } },
          tags: { include: { tag: true } },
        },
      },
      tags: { include: { tag: true } },
    },
  })

  return NextResponse.json({ nodes }, { status: 200 })
}
