import { PrismaClient } from '../src/generated/prisma'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding Leaxaro PMOS...')

  // ─── Tags ────────────────────────────────────────────────────────────────

  const tagNames = [
    'runtime', 'memory', 'orchestration', 'signals', 'recovery',
    'nutrition', 'behavior', 'interventions', 'architecture', 'prompting',
    'analytics', 'pwa', 'auth', 'infra', 'ui', 'database', 'ai',
  ]

  const tags = await Promise.all(
    tagNames.map((name) =>
      prisma.tag.upsert({
        where: { name },
        update: {},
        create: { name },
      })
    )
  )

  const tagMap = Object.fromEntries(tags.map((t) => [t.name, t.id]))

  // ─── Roadmap Nodes ────────────────────────────────────────────────────────

  const etap1 = await prisma.roadmapNode.create({
    data: {
      title: 'ETAP 1 — Infrastructure Foundation',
      description: 'Monorepo setup, database schema, Prisma, environment isolation, base packages.',
      status: 'done',
      priority: 'high',
      order: 1,
    },
  })

  const etap1_1 = await prisma.roadmapNode.create({
    data: {
      title: '1.1 — Monorepo Init (Turborepo + npm workspaces)',
      status: 'done',
      priority: 'high',
      order: 1,
      parentId: etap1.id,
    },
  })

  const etap1_2 = await prisma.roadmapNode.create({
    data: {
      title: '1.2 — Prisma Schema (MySQL → 20 models)',
      description: 'Full domain schema: user, nutrition, workout, body metrics, integrations.',
      status: 'done',
      priority: 'high',
      order: 2,
      parentId: etap1.id,
    },
  })

  const etap1_3 = await prisma.roadmapNode.create({
    data: {
      title: '1.3 — Shared Packages Bootstrap',
      description: '@nutricoach/types, @nutricoach/config, @nutricoach/database, @nutricoach/validators',
      status: 'done',
      priority: 'high',
      order: 3,
      parentId: etap1.id,
    },
  })

  const etap2 = await prisma.roadmapNode.create({
    data: {
      title: 'ETAP 2 — Domain Engines',
      description: 'Nutrition engine, training engine (PMC/CTL/ATL), recovery engine, BullMQ queue.',
      status: 'done',
      priority: 'high',
      order: 2,
    },
  })

  const etap2_1 = await prisma.roadmapNode.create({
    data: {
      title: '2.1 — Nutrition Engine (BMR/TDEE/Macros)',
      status: 'done',
      priority: 'high',
      order: 1,
      parentId: etap2.id,
    },
  })

  const etap2_2 = await prisma.roadmapNode.create({
    data: {
      title: '2.2 — Training Engine (TSS/PMC/CTL/ATL/TSB)',
      status: 'done',
      priority: 'high',
      order: 2,
      parentId: etap2.id,
    },
  })

  const etap2_3 = await prisma.roadmapNode.create({
    data: {
      title: '2.3 — Recovery Engine (HRV/Readiness)',
      status: 'done',
      priority: 'high',
      order: 3,
      parentId: etap2.id,
    },
  })

  const etap3 = await prisma.roadmapNode.create({
    data: {
      title: 'ETAP 3 — Auth & Identity Foundation',
      description: 'NextAuth v5 JWT, Credentials provider, bcryptjs, rate limiting, onboarding wizard.',
      status: 'done',
      priority: 'high',
      order: 3,
    },
  })

  const etap3_1 = await prisma.roadmapNode.create({
    data: {
      title: '3.1 — NextAuth v5 (JWT + Credentials)',
      status: 'done',
      priority: 'high',
      order: 1,
      parentId: etap3.id,
    },
  })

  const etap3_2 = await prisma.roadmapNode.create({
    data: {
      title: '3.2 — Onboarding Wizard (4 steps)',
      description: 'Profile, goals, activity level, sport type.',
      status: 'done',
      priority: 'high',
      order: 2,
      parentId: etap3.id,
    },
  })

  const etap4 = await prisma.roadmapNode.create({
    data: {
      title: 'ETAP 4 — Dashboard & Data Display',
      description: 'Main dashboard, nutrition summary, training load chart, body metrics.',
      status: 'in_progress',
      priority: 'high',
      order: 4,
    },
  })

  const etap4_1 = await prisma.roadmapNode.create({
    data: {
      title: '4.1 — Dashboard Layout & Navigation',
      status: 'in_progress',
      priority: 'high',
      order: 1,
      parentId: etap4.id,
    },
  })

  const etap4_2 = await prisma.roadmapNode.create({
    data: {
      title: '4.2 — Nutrition Summary Card',
      status: 'backlog',
      priority: 'high',
      order: 2,
      parentId: etap4.id,
    },
  })

  const etap4_3 = await prisma.roadmapNode.create({
    data: {
      title: '4.3 — Training Load Chart (CTL/ATL/TSB)',
      status: 'backlog',
      priority: 'medium',
      order: 3,
      parentId: etap4.id,
    },
  })

  const etap5 = await prisma.roadmapNode.create({
    data: {
      title: 'ETAP 5 — NCIC Conversational Runtime',
      description: 'NCIC core, intent recognition, conversational flows, memory layer.',
      status: 'backlog',
      priority: 'high',
      order: 5,
    },
  })

  const etap6 = await prisma.roadmapNode.create({
    data: {
      title: 'ETAP 6 — PMOS (this app)',
      description: 'AI-native development memory system. Roadmap, execution logs, decisions, knowledge graph.',
      status: 'in_progress',
      priority: 'high',
      order: 6,
    },
  })

  // ─── Tag Relations ────────────────────────────────────────────────────────

  await prisma.roadmapNodeTag.createMany({
    data: [
      { nodeId: etap1.id, tagId: tagMap['infra'] },
      { nodeId: etap1.id, tagId: tagMap['database'] },
      { nodeId: etap1_2.id, tagId: tagMap['database'] },
      { nodeId: etap1_3.id, tagId: tagMap['architecture'] },
      { nodeId: etap2.id, tagId: tagMap['nutrition'] },
      { nodeId: etap2.id, tagId: tagMap['runtime'] },
      { nodeId: etap2_1.id, tagId: tagMap['nutrition'] },
      { nodeId: etap2_2.id, tagId: tagMap['analytics'] },
      { nodeId: etap2_3.id, tagId: tagMap['recovery'] },
      { nodeId: etap3.id, tagId: tagMap['auth'] },
      { nodeId: etap3_1.id, tagId: tagMap['auth'] },
      { nodeId: etap4.id, tagId: tagMap['ui'] },
      { nodeId: etap4_3.id, tagId: tagMap['analytics'] },
      { nodeId: etap5.id, tagId: tagMap['runtime'] },
      { nodeId: etap5.id, tagId: tagMap['memory'] },
      { nodeId: etap5.id, tagId: tagMap['orchestration'] },
      { nodeId: etap6.id, tagId: tagMap['memory'] },
      { nodeId: etap6.id, tagId: tagMap['architecture'] },
    ],
    skipDuplicates: true,
  })

  // ─── Execution Logs ───────────────────────────────────────────────────────

  const log1 = await prisma.executionLog.create({
    data: {
      title: 'Monorepo Bootstrap — Turborepo + 9 packages',
      summary:
        'Initialized Turborepo monorepo with npm workspaces. Created 9 shared packages: types (593 lines, 29 domains), config, database (Prisma singleton + 7 repositories), queue (BullMQ + Redis), validators (Zod schemas), events (18 event types), nutrition-engine, training-engine, recovery-engine.',
      prompt:
        'Zbuduj monorepo Leaxaro z Turborepo. Pakiety: @nutricoach/types, @nutricoach/config, @nutricoach/database, @nutricoach/queue, @nutricoach/validators, @nutricoach/events, @nutricoach/nutrition-engine, @nutricoach/training-engine, @nutricoach/recovery-engine.',
      changedFiles: [
        'package.json',
        'turbo.json',
        'packages/types/src/index.ts',
        'packages/config/src/index.ts',
        'packages/database/src/index.ts',
        'packages/queue/src/index.ts',
        'packages/validators/src/index.ts',
        'packages/events/src/index.ts',
        'packages/nutrition-engine/src/index.ts',
        'packages/training-engine/src/index.ts',
        'packages/recovery-engine/src/index.ts',
      ],
      architecturalImpact:
        'Established monorepo architecture. All domain logic is in isolated packages. Apps are consumers only. Single source of truth for types and config.',
      canonicalAlignment: 'high',
    },
  })

  const log2 = await prisma.executionLog.create({
    data: {
      title: 'Prisma Schema — MySQL 20 models, 25 enums',
      summary:
        'Created full domain Prisma schema for MySQL (WEBD.pl). 20 models covering User, NutritionLog, WorkoutLog, BodyMetric, Goal, Integration, Sync, AISession, and more. 25 enums. Used prisma db push (no shadow DB).',
      changedFiles: ['prisma/schema.prisma', 'prisma/seed.ts'],
      architecturalImpact:
        'MySQL provider locked in (no Neon). JSON fields use native MySQL 5.7.8+ support. No sort: Desc in indexes (MariaDB incompatibility). All migrations via db push.',
      blockers: 'No shadow DB permission on WEBD.pl — migrate dev impossible. Permanently using db push.',
      canonicalAlignment: 'high',
    },
  })

  const log3 = await prisma.executionLog.create({
    data: {
      title: 'NextAuth v5 — JWT strategy, Credentials provider, rate limiting',
      summary:
        'Implemented NextAuth v5 (5.0.0-beta.31) with JWT sessions. Credentials provider with bcryptjs 12 rounds. In-memory rate limiter (5 attempts / 15 min). Auth logger. Middleware protecting all /(app)/* routes. Server actions for register/login/logout/onboarding. Onboarding wizard (4 steps).',
      prompt:
        'Zaimplementuj NextAuth v5 z JWT, Credentials provider, bcryptjs, rate limiting, middleware ochrony tras, server actions auth, wizard onboarding 4 kroki.',
      changedFiles: [
        'src/lib/auth.ts',
        'src/lib/rate-limit.ts',
        'src/lib/auth-logger.ts',
        'src/middleware.ts',
        'src/lib/actions/auth.ts',
        'src/components/onboarding/OnboardingWizard.tsx',
        'src/app/(auth)/login/page.tsx',
        'src/app/(auth)/register/page.tsx',
      ],
      architecturalImpact:
        'JWT strategy chosen over DB sessions for simplicity. Prisma adapter wired but not used for session persistence. This means no multi-device session management on MVP.',
      blockers: 'NextAuth v5 beta — some APIs unstable. instrumentationHook deprecated in Next.js 15.',
      nextSteps: 'Add OAuth providers (Google, Strava) in ETAP 5.',
      canonicalAlignment: 'high',
    },
  })

  // ─── Log → Node Relations ─────────────────────────────────────────────────

  await prisma.roadmapNodeLog.createMany({
    data: [
      { nodeId: etap1.id, logId: log1.id },
      { nodeId: etap1_1.id, logId: log1.id },
      { nodeId: etap1_2.id, logId: log2.id },
      { nodeId: etap3.id, logId: log3.id },
      { nodeId: etap3_1.id, logId: log3.id },
    ],
    skipDuplicates: true,
  })

  // ─── Log Tags ─────────────────────────────────────────────────────────────

  await prisma.logTag.createMany({
    data: [
      { logId: log1.id, tagId: tagMap['infra'] },
      { logId: log1.id, tagId: tagMap['architecture'] },
      { logId: log2.id, tagId: tagMap['database'] },
      { logId: log2.id, tagId: tagMap['infra'] },
      { logId: log3.id, tagId: tagMap['auth'] },
    ],
    skipDuplicates: true,
  })

  // ─── Decisions ────────────────────────────────────────────────────────────

  const d1 = await prisma.decision.create({
    data: {
      title: 'MySQL over PostgreSQL for main app DB',
      decision: 'Use MySQL 8.0 (Percona) on WEBD.pl as the primary database for the Leaxaro web app.',
      reason:
        'WEBD.pl hosting provides MySQL. Creating a separate Neon PG would add cost and complexity for MVP. The Prisma schema was designed MySQL-compatible (no sort: Desc in indexes, JSON native support).',
      impact:
        'Locked into MySQL for the main app. PMOS uses Neon Postgres separately as it is a standalone tool not tied to WEBD.pl.',
      affectedSystems: ['prisma/schema.prisma', 'apps/web', 'packages/database'],
    },
  })

  const d2 = await prisma.decision.create({
    data: {
      title: 'JWT sessions over DB sessions in NextAuth v5',
      decision: 'Use JWT strategy instead of database sessions.',
      reason:
        'Simpler setup. No session table management. Faster reads (no DB query per request). Acceptable for single-user MVP.',
      impact: 'No multi-device session invalidation. Cannot revoke sessions without token blacklist. Acceptable for current stage.',
      affectedSystems: ['src/lib/auth.ts', 'src/middleware.ts'],
    },
  })

  const d3 = await prisma.decision.create({
    data: {
      title: 'Conversational-first over Dashboard-first architecture',
      decision:
        'Leaxaro is a conversational intelligence platform. The UI is a thin layer over NCIC runtime. Dashboard is secondary.',
      reason:
        'Most health apps fail because they are data dashboards that users stop using after 2 weeks. Conversational runtime creates habit and personalization loops.',
      impact:
        'All feature decisions are evaluated against: does this strengthen the conversational runtime? Dashboard features are deprioritized when they conflict with conversational depth.',
      affectedSystems: ['packages/ncic', 'apps/web/src/app/(app)', 'docs/architecture.md'],
    },
  })

  const d4 = await prisma.decision.create({
    data: {
      title: 'PMOS as standalone repo (separate from Leaxaro monorepo)',
      decision: 'Leaxaro PMOS lives in github.com/lexaro-app/Leaxaro-PMOS, not inside the main monorepo.',
      reason:
        'PMOS is an internal tool, not a product. It should be independently deployable, have its own Neon Postgres, and not pollute the main monorepo with tool-specific dependencies.',
      impact:
        'PMOS can be deployed separately on Vercel. Uses Neon Postgres (not MySQL). No shared packages with the main app — intentionally isolated.',
      affectedSystems: ['apps/pmos (standalone)', 'github.com/lexaro-app/Leaxaro-PMOS'],
    },
  })

  // ─── Decision → Node Relations ────────────────────────────────────────────

  await prisma.roadmapNodeDecision.createMany({
    data: [
      { nodeId: etap1_2.id, decisionId: d1.id },
      { nodeId: etap3_1.id, decisionId: d2.id },
      { nodeId: etap5.id, decisionId: d3.id },
      { nodeId: etap6.id, decisionId: d4.id },
    ],
    skipDuplicates: true,
  })

  console.log('✅ Seed complete.')
  console.log(`   Tags: ${tags.length}`)
  console.log(`   Roadmap nodes: 14`)
  console.log(`   Execution logs: 3`)
  console.log(`   Decisions: 4`)
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
