// GET /api/workouts — fetch workout history
// POST /api/workouts — log a new workout

export async function GET() {
  // TODO: ETAP 5 — fetch Workout records for authenticated user
  return Response.json({ data: [], message: 'Workouts — ETAP 5' }, { status: 501 })
}

export async function POST() {
  // TODO: ETAP 5 — create Workout record
  return Response.json({ message: 'Workouts POST — ETAP 5' }, { status: 501 })
}
