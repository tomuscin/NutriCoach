// POST /api/integrations/trainingpeaks/sync — trigger manual sync
// Queues a background sync job for the authenticated user

export async function POST() {
  // TODO: ETAP 9 — queue sync job, return job ID
  return Response.json({ message: 'TrainingPeaks sync trigger — ETAP 9' }, { status: 501 })
}
