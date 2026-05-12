// NutriCoach — Database Seed
// Realistic data for a road cyclist in caloric deficit (redukcja)
// Run: npx tsx prisma/seed.ts (from project root with DATABASE_URL set)

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// ─── Seed config ─────────────────────────────────────────────────────────────
const SEED_EMAIL = 'tomasz@nutricoach.local'

const TODAY = new Date()
const daysAgo = (n: number): Date => {
  const d = new Date(TODAY)
  d.setDate(d.getDate() - n)
  d.setHours(12, 0, 0, 0)
  return d
}
const dateOnly = (n: number): Date => {
  const d = new Date(TODAY)
  d.setDate(d.getDate() - n)
  d.setHours(0, 0, 0, 0)
  return d
}

async function main() {
  console.log('🌱 Seeding NutriCoach database...')
  console.log('   Profile: Road cyclist, male, 34y, 78kg → 73kg goal')
  console.log('   Scenario: Caloric deficit, FTP 270W, CTL build')

  // ─── Cleanup ──────────────────────────────────────────────────────────────
  await prisma.user.deleteMany({ where: { email: SEED_EMAIL } })
  console.log('   ✓ Cleaned existing seed data')

  // ─── User ─────────────────────────────────────────────────────────────────
  const user = await prisma.user.create({
    data: {
      email: SEED_EMAIL,
      name: 'Tomasz',
      // bcrypt of 'nutricoach_dev' — placeholder for dev only
      passwordHash: '$2b$10$placeholder_replace_before_real_auth_is_implemented',
      emailVerified: new Date(),
      role: 'USER',
      status: 'ACTIVE',
    },
  })
  console.log(`   ✓ User: ${user.email} (${user.id})`)

  // ─── UserProfile ──────────────────────────────────────────────────────────
  await prisma.userProfile.create({
    data: {
      userId: user.id,
      sex: 'MALE',
      birthDate: new Date('1991-09-15'),
      heightCm: 179,
      currentWeightKg: 78.2,
      targetWeightKg: 73.0,
      activityLevel: 'VERY_ACTIVE',
      mainSport: 'CYCLING',
      ftp: 270,
      vo2max: 62.0,
      restingHR: 44,
      bmr: 1820,
      tdee: 2730,
      caloricTarget: 2230,
      proteinTargetG: 156,
      carbsTargetG: 235,
      fatTargetG: 62,
      onboardingCompletedAt: new Date(),
    },
  })
  console.log('   ✓ UserProfile created')

  // ─── Goal ─────────────────────────────────────────────────────────────────
  await prisma.goal.create({
    data: {
      userId: user.id,
      type: 'REDUCTION',
      priority: 'BALANCED',
      status: 'ACTIVE',
      startWeightKg: 78.2,
      targetWeightKg: 73.0,
      weeklyWeightChangeKg: -0.5,
      targetCaloricDeficit: 500,
      startDate: dateOnly(0),
      targetDate: new Date('2026-08-01'),
      notes: 'Cel: -5 kg w 12 tygodniach, zachowanie masy mięśniowej, wzrost FTP/kg',
    },
  })
  console.log('   ✓ Goal: REDUCTION 78.2→73 kg')

  // ─── Body metrics — last 14 days ──────────────────────────────────────────
  const weights = [78.2,78.0,77.9,78.1,77.8,77.6,77.7,77.5,77.4,77.3,77.5,77.2,77.1,77.0]
  for (let i = 13; i >= 0; i--) {
    await prisma.bodyMetric.create({
      data: {
        userId: user.id,
        date: dateOnly(i),
        weightKg: weights[13 - i],
        bodyFatPercent: i < 7 ? parseFloat((14.2 - (13 - i) * 0.05).toFixed(1)) : undefined,
        muscleMassKg: i < 7 ? 61.8 : undefined,
        source: 'MANUAL',
      },
    })
  }
  console.log('   ✓ BodyMetrics: 14 days')

  // ─── Daily logs — last 7 days ─────────────────────────────────────────────
  const nutrition = [
    { kcal: 2180, p: 155, c: 230, f: 60, w: 2800 },
    { kcal: 2350, p: 158, c: 250, f: 63, w: 3200 },
    { kcal: 2100, p: 160, c: 220, f: 58, w: 2600 },
    { kcal: 2280, p: 154, c: 245, f: 62, w: 3000 },
    { kcal: 1980, p: 162, c: 200, f: 56, w: 2500 },
    { kcal: 2420, p: 157, c: 265, f: 65, w: 3400 },
    { kcal: 2150, p: 156, c: 228, f: 61, w: 2700 },
  ]
  for (let i = 6; i >= 0; i--) {
    const n = nutrition[6 - i]
    await prisma.dailyLog.create({
      data: {
        userId: user.id,
        date: dateOnly(i),
        targetCalories: 2230,
        targetProteinG: 156,
        targetCarbsG: 235,
        targetFatG: 62,
        consumedCalories: n.kcal,
        consumedProteinG: n.p,
        consumedCarbsG: n.c,
        consumedFatG: n.f,
        consumedFiberG: 28,
        waterMl: n.w,
        calorieBalance: n.kcal - 2730,
        deficit: 2730 - n.kcal,
      },
    })
  }
  console.log('   ✓ DailyLogs: 7 days')

  // ─── Sleep metrics — last 7 days ──────────────────────────────────────────
  const sleepData = [
    { totalMin: 450, hrv: 68, rhr: 46, score: 74, deep: 90,  rem: 99  },
    { totalMin: 480, hrv: 72, rhr: 44, score: 85, deep: 100, rem: 106 },
    { totalMin: 420, hrv: 61, rhr: 48, score: 65, deep: 80,  rem: 92  },
    { totalMin: 450, hrv: 70, rhr: 45, score: 77, deep: 92,  rem: 99  },
    { totalMin: 510, hrv: 75, rhr: 43, score: 88, deep: 110, rem: 112 },
    { totalMin: 390, hrv: 58, rhr: 50, score: 60, deep: 72,  rem: 86  },
    { totalMin: 450, hrv: 67, rhr: 46, score: 73, deep: 90,  rem: 99  },
  ]
  for (let i = 6; i >= 0; i--) {
    const s = sleepData[6 - i]
    const sleepStartHour = new Date(dateOnly(i))
    sleepStartHour.setHours(23, 0, 0, 0)
    const sleepEndHour = new Date(dateOnly(i))
    sleepEndHour.setDate(sleepEndHour.getDate() - 1)
    sleepEndHour.setHours(6, 30, 0, 0)
    await prisma.sleepMetric.create({
      data: {
        userId: user.id,
        date: dateOnly(i),
        source: 'GARMIN',
        sleepStart: sleepStartHour,
        sleepEnd: sleepEndHour,
        totalSleepMinutes: s.totalMin,
        deepSleepMinutes: s.deep,
        remSleepMinutes: s.rem,
        lightSleepMinutes: s.totalMin - s.deep - s.rem - 10,
        awakeMinutes: 10,
        sleepScore: s.score,
      },
    })
  }
  console.log('   ✓ SleepMetrics: 7 days')

  // ─── Recovery metrics — last 7 days ──────────────────────────────────────
  const recoveryScores = [72, 81, 65, 77, 88, 60, 74]
  const hrvData =      [68, 72, 61, 70, 75, 58, 67]
  const rhrData =      [46, 44, 48, 45, 43, 50, 46]
  for (let i = 6; i >= 0; i--) {
    const score = recoveryScores[6 - i]
    await prisma.recoveryMetric.create({
      data: {
        userId: user.id,
        date: dateOnly(i),
        source: 'CALCULATED',
        hrv: hrvData[6 - i],
        restingHR: rhrData[6 - i],
        readinessScore: score,
        fatigueScore: 100 - score,
        status: score >= 80 ? 'HIGH' : score >= 65 ? 'MODERATE' : 'LOW',
        notes: score >= 80
          ? 'Dobry dzień na intensywny trening.'
          : score >= 65
          ? 'Trening o umiarkowanej intensywności.'
          : 'Priorytet: regeneracja.',
      },
    })
  }
  console.log('   ✓ RecoveryMetrics: 7 days')

  // ─── Workouts — last 7 days ───────────────────────────────────────────────
  const workouts = [
    {
      dAgo: 6, title: 'Interwały progowe 4x10min',  dMin: 75,  tss: 82,
      np: 255, avgP: 230, maxP: 420, avgHR: 158, maxHR: 175, km: 38,
    },
    {
      dAgo: 5, title: 'Długa baza aerobowa',         dMin: 180, tss: 118,
      np: 195, avgP: 175, maxP: 380, avgHR: 138, maxHR: 168, km: 95,
    },
    {
      dAgo: 3, title: 'Tempo 2x20min @ FTP',         dMin: 90,  tss: 95,
      np: 268, avgP: 245, maxP: 410, avgHR: 163, maxHR: 172, km: 45,
    },
    {
      dAgo: 1, title: 'VO2max 6x3min',               dMin: 65,  tss: 78,
      np: 278, avgP: 258, maxP: 450, avgHR: 170, maxHR: 181, km: 30,
    },
  ]
  for (const w of workouts) {
    await prisma.workout.create({
      data: {
        userId: user.id,
        date: dateOnly(w.dAgo),
        source: 'TRAININGPEAKS',
        title: w.title,
        sportType: 'CYCLING',
        durationMinutes: w.dMin,
        distanceKm: w.km,
        avgHR: w.avgHR,
        maxHR: w.maxHR,
        avgPowerW: w.avgP,
        normalizedPowerW: w.np,
        maxPowerW: w.maxP,
        tss: w.tss,
        rpe: 7,
      },
    })
  }
  console.log('   ✓ Workouts: 4 rides (intervals, base, tempo, VO2max)')

  // ─── Training load (PMC) — last 14 days ───────────────────────────────────
  const pmc = [
    { d: 14, tss: 82,  atl: 58, ctl: 52, tsb: -6  },
    { d: 13, tss: 118, atl: 68, ctl: 54, tsb: -14 },
    { d: 12, tss: 0,   atl: 62, ctl: 53, tsb: -9  },
    { d: 11, tss: 95,  atl: 66, ctl: 55, tsb: -11 },
    { d: 10, tss: 0,   atl: 60, ctl: 54, tsb: -6  },
    { d: 9,  tss: 0,   atl: 55, ctl: 53, tsb: 2   },
    { d: 8,  tss: 45,  atl: 54, ctl: 53, tsb: -1  },
    { d: 7,  tss: 78,  atl: 58, ctl: 54, tsb: -4  },
    { d: 6,  tss: 82,  atl: 62, ctl: 55, tsb: -7  },
    { d: 5,  tss: 118, atl: 72, ctl: 57, tsb: -15 },
    { d: 4,  tss: 0,   atl: 66, ctl: 56, tsb: -10 },
    { d: 3,  tss: 95,  atl: 68, ctl: 58, tsb: -10 },
    { d: 2,  tss: 0,   atl: 62, ctl: 57, tsb: -5  },
    { d: 1,  tss: 78,  atl: 63, ctl: 58, tsb: -5  },
  ]
  for (const row of pmc) {
    await prisma.trainingLoad.create({
      data: {
        userId: user.id,
        date: dateOnly(row.d),
        ctl: row.ctl,
        atl: row.atl,
        tsb: row.tsb,
        dailyTSS: row.tss,
      },
    })
  }
  console.log('   ✓ TrainingLoad (PMC): 14 days')

  console.log('')
  console.log('✅ Seed complete!')
  console.log(`   User: ${SEED_EMAIL}`)
  console.log('   DB: tomuscin_nutricoach @ mn05.webd.pl')
  console.log('   Prisma Studio: npm run db:studio')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

