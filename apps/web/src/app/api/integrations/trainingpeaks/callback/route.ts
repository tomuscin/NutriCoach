// GET /api/integrations/trainingpeaks/callback — handle OAuth callback
// Exchanges code for tokens, stores in TPIntegration table

export async function GET() {
  // TODO: ETAP 9
  // const { code, state } = request.nextUrl.searchParams
  // validateState(state)
  // const tokens = await exchangeCodeForTokens(code)
  // await storeTPIntegration(userId, tokens)
  // redirect('/integrations?connected=trainingpeaks')
  return Response.json({ message: 'TrainingPeaks OAuth callback — ETAP 9' }, { status: 501 })
}
