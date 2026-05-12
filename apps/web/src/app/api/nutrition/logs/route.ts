// GET /api/nutrition/logs — fetch daily logs
// POST /api/nutrition/logs — create daily log entry

export async function GET() {
  // TODO: ETAP 4 — fetch DailyLog records for authenticated user
  return Response.json({ data: [], message: 'Nutrition logs — ETAP 4' }, { status: 501 })
}

export async function POST() {
  // TODO: ETAP 4 — create/update DailyLog
  return Response.json({ message: 'Nutrition logs POST — ETAP 4' }, { status: 501 })
}
