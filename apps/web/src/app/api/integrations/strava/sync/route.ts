import { requireAuth } from '@/lib/auth'
import { runStravaSync } from '@/lib/integrations/sync/strava-sync'

export const dynamic = 'force-dynamic'

export async function POST() {
  const user = await requireAuth()
  const result = await runStravaSync(user.id)
  return Response.json(result, { status: result.success ? 200 : 500 })
}
