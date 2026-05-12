// GET /api/integrations/trainingpeaks/connect — initiate OAuth flow
// Redirects user to TrainingPeaks authorization page

export async function GET() {
  // TODO: ETAP 9
  // const authUrl = buildTrainingPeaksAuthUrl()
  // redirect(authUrl)
  return Response.json({ message: 'TrainingPeaks OAuth connect — ETAP 9' }, { status: 501 })
}
