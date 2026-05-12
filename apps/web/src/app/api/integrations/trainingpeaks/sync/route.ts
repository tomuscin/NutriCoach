// POST /api/integrations/trainingpeaks/sync — manual sync trigger
// Runs a full sync for the authenticated user synchronously (max 60s).

import { requireAuth } from '@/lib/auth'
import { runTrainingPeaksSync } from '@/lib/integrations/sync/training-sync'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST() {
  const user = await requireAuth()
  const result = await runTrainingPeaksSync(user.id)
  return Response.json(result, { status: result.success ? 200 : 500 })
}
