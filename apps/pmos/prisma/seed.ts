import { PrismaClient } from '../src/generated/prisma'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding Leaxaro PMOS...')

  // ─── Tags ────────────────────────────────────────────────────────────────

  const tagNames = [
    'runtime', 'memory', 'orchestration', 'signals', 'recovery',
    'nutrition', 'behavior', 'interventions', 'architecture', 'prompting',
    'analytics', 'pwa', 'auth', 'infra', 'ui', 'database', 'ai',
    'events', 'recommendations',
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
      order: 100,
      sortKey: '001',
    },
  })

  const etap1_1 = await prisma.roadmapNode.create({
    data: {
      title: '1.1 — Monorepo Init (Turborepo + npm workspaces)',
      status: 'done',
      priority: 'high',
      order: 1,
      sortKey: '001.001',
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
      sortKey: '001.002',
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
      sortKey: '001.003',
      parentId: etap1.id,
    },
  })

  const etap2 = await prisma.roadmapNode.create({
    data: {
      title: 'ETAP 2 — Domain Engines',
      description: 'Nutrition engine, training engine (PMC/CTL/ATL), recovery engine, BullMQ queue.',
      status: 'done',
      priority: 'high',
      order: 200,
      sortKey: '002',
    },
  })

  const etap2_1 = await prisma.roadmapNode.create({
    data: {
      title: '2.1 — Nutrition Engine (BMR/TDEE/Macros)',
      status: 'done',
      priority: 'high',
      order: 1,
      sortKey: '002.001',
      parentId: etap2.id,
    },
  })

  const etap2_2 = await prisma.roadmapNode.create({
    data: {
      title: '2.2 — Training Engine (TSS/PMC/CTL/ATL/TSB)',
      status: 'done',
      priority: 'high',
      order: 2,
      sortKey: '002.002',
      parentId: etap2.id,
    },
  })

  const etap2_3 = await prisma.roadmapNode.create({
    data: {
      title: '2.3 — Recovery Engine (HRV/Readiness)',
      status: 'done',
      priority: 'high',
      order: 3,
      sortKey: '002.003',
      parentId: etap2.id,
    },
  })

  // ETAP 2.5 — Event & Signals Architecture
  const etap2_5 = await prisma.roadmapNode.create({
    data: {
      title: 'ETAP 2.5 — Event & Signals Architecture',
      description: 'Canonical event-driven nervous system for Leaxaro runtime. Defines how all signals — wearable, nutrition, behavioral — flow through the system.',
      status: 'backlog',
      priority: 'high',
      order: 250,
      sortKey: '002.005',
    },
  })

  const etap2_5_1 = await prisma.roadmapNode.create({
    data: {
      title: '2.5.1 — Event Taxonomy',
      description: 'Canonical events, naming conventions, event domains. Foundation for all async communication.',
      status: 'backlog',
      priority: 'high',
      order: 1,
      sortKey: '002.005.001',
      parentId: etap2_5.id,
    },
  })

  const etap2_5_2 = await prisma.roadmapNode.create({
    data: {
      title: '2.5.2 — Signal Normalization Layer',
      description: 'Normalize wearable signals, nutrition signals, recovery signals, behavioral signals into canonical event format.',
      status: 'backlog',
      priority: 'high',
      order: 2,
      sortKey: '002.005.002',
      parentId: etap2_5.id,
    },
  })

  const etap2_5_3 = await prisma.roadmapNode.create({
    data: {
      title: '2.5.3 — Event Bus Foundation',
      description: 'Event dispatching, async architecture, foundation for future queue orchestration (BullMQ).',
      status: 'backlog',
      priority: 'medium',
      order: 3,
      sortKey: '002.005.003',
      parentId: etap2_5.id,
    },
  })

  const etap2_5_4 = await prisma.roadmapNode.create({
    data: {
      title: '2.5.4 — Runtime Priority System',
      description: 'Event prioritization, intervention suppression, anti-spam logic. Prevents coaching fatigue.',
      status: 'backlog',
      priority: 'medium',
      order: 4,
      sortKey: '002.005.004',
      parentId: etap2_5.id,
    },
  })

  const etap3 = await prisma.roadmapNode.create({
    data: {
      title: 'ETAP 3 — Auth & Identity Foundation',
      description: 'NextAuth v5 JWT, Credentials provider, bcryptjs, rate limiting, onboarding wizard.',
      status: 'done',
      priority: 'high',
      order: 300,
      sortKey: '003',
    },
  })

  const etap3_1 = await prisma.roadmapNode.create({
    data: {
      title: '3.1 — NextAuth v5 (JWT + Credentials)',
      status: 'done',
      priority: 'high',
      order: 1,
      sortKey: '003.001',
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
      sortKey: '003.002',
      parentId: etap3.id,
    },
  })

  const etap4 = await prisma.roadmapNode.create({
    data: {
      title: 'ETAP 4 — Dashboard & Data Display',
      description: 'Main dashboard, nutrition summary, training load chart, body metrics.',
      status: 'in_progress',
      priority: 'high',
      order: 400,
      sortKey: '004',
    },
  })

  const etap4_1 = await prisma.roadmapNode.create({
    data: {
      title: '4.1 — Dashboard Layout & Navigation',
      status: 'in_progress',
      priority: 'high',
      order: 1,
      sortKey: '004.001',
      parentId: etap4.id,
    },
  })

  const etap4_2 = await prisma.roadmapNode.create({
    data: {
      title: '4.2 — Nutrition Summary Card',
      status: 'backlog',
      priority: 'high',
      order: 2,
      sortKey: '004.002',
      parentId: etap4.id,
    },
  })

  const etap4_3 = await prisma.roadmapNode.create({
    data: {
      title: '4.3 — Training Load Chart (CTL/ATL/TSB)',
      status: 'backlog',
      priority: 'medium',
      order: 3,
      sortKey: '004.003',
      parentId: etap4.id,
    },
  })

  const etap5 = await prisma.roadmapNode.create({
    data: {
      title: 'ETAP 5 — NCIC Conversational Runtime',
      description: 'NCIC core, intent recognition, conversational flows, memory layer.',
      status: 'backlog',
      priority: 'high',
      order: 500,
      sortKey: '005',
    },
  })

  // ETAP 4.5 — Recommendation & Intervention Engine
  const etap4_5 = await prisma.roadmapNode.create({
    data: {
      title: 'ETAP 4.5 — Recommendation & Intervention Engine',
      description: 'Adaptive recommendation ranking and intervention orchestration system. Controls when, how, and what coaching interventions are triggered.',
      status: 'backlog',
      priority: 'high',
      order: 450,
      sortKey: '004.005',
    },
  })

  const etap4_5_1 = await prisma.roadmapNode.create({
    data: {
      title: '4.5.1 — Recommendation Scoring',
      description: 'Confidence scoring, relevance scoring, context scoring. Ranks recommendations by composite score.',
      status: 'backlog',
      priority: 'high',
      order: 1,
      sortKey: '004.005.001',
      parentId: etap4_5.id,
    },
  })

  const etap4_5_2 = await prisma.roadmapNode.create({
    data: {
      title: '4.5.2 — Intervention Ranking',
      description: 'Timing optimization, fatigue prevention, interruption sensitivity. When to surface a coaching message.',
      status: 'backlog',
      priority: 'high',
      order: 2,
      sortKey: '004.005.002',
      parentId: etap4_5.id,
    },
  })

  const etap4_5_3 = await prisma.roadmapNode.create({
    data: {
      title: '4.5.3 — Anti-Annoyance System',
      description: 'Suppression windows, coaching fatigue detection, repetitive prompt detection. Keeps coaching relevant, not intrusive.',
      status: 'backlog',
      priority: 'medium',
      order: 3,
      sortKey: '004.005.003',
      parentId: etap4_5.id,
    },
  })

  const etap4_5_4 = await prisma.roadmapNode.create({
    data: {
      title: '4.5.4 — Adaptive Recommendation Layer',
      description: 'User adaptation over time, behavioral pattern recognition, adherence-based coaching personalization.',
      status: 'backlog',
      priority: 'medium',
      order: 4,
      sortKey: '004.005.004',
      parentId: etap4_5.id,
    },
  })

  const etap6 = await prisma.roadmapNode.create({
    data: {
      title: 'ETAP 6 — PMOS (this app)',
      description: 'AI-native development memory system. Roadmap, execution logs, decisions, knowledge graph.',
      status: 'in_progress',
      priority: 'high',
      order: 600,
      sortKey: '006',
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
      // ETAP 2.5 tags
      { nodeId: etap2_5.id, tagId: tagMap['events'] },
      { nodeId: etap2_5.id, tagId: tagMap['signals'] },
      { nodeId: etap2_5.id, tagId: tagMap['runtime'] },
      { nodeId: etap2_5.id, tagId: tagMap['orchestration'] },
      { nodeId: etap2_5_1.id, tagId: tagMap['events'] },
      { nodeId: etap2_5_2.id, tagId: tagMap['signals'] },
      { nodeId: etap2_5_3.id, tagId: tagMap['orchestration'] },
      { nodeId: etap2_5_4.id, tagId: tagMap['runtime'] },
      // ETAP 3
      { nodeId: etap3.id, tagId: tagMap['auth'] },
      { nodeId: etap3_1.id, tagId: tagMap['auth'] },
      // ETAP 4
      { nodeId: etap4.id, tagId: tagMap['ui'] },
      { nodeId: etap4_3.id, tagId: tagMap['analytics'] },
      // ETAP 4.5 tags
      { nodeId: etap4_5.id, tagId: tagMap['recommendations'] },
      { nodeId: etap4_5.id, tagId: tagMap['interventions'] },
      { nodeId: etap4_5.id, tagId: tagMap['runtime'] },
      { nodeId: etap4_5.id, tagId: tagMap['behavior'] },
      { nodeId: etap4_5_1.id, tagId: tagMap['recommendations'] },
      { nodeId: etap4_5_2.id, tagId: tagMap['interventions'] },
      { nodeId: etap4_5_3.id, tagId: tagMap['behavior'] },
      { nodeId: etap4_5_4.id, tagId: tagMap['recommendations'] },
      // ETAP 5 & 6
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

  // ─── Architecture Warnings ────────────────────────────────────────────────

  await prisma.architectureWarning.createMany({
    data: [
      {
        title: 'Dashboard Gravity Risk — ETAP 4',
        description:
          'ETAP 4 (Dashboard & Data Display) introduces heavy UI investment before the conversational runtime is established. Risk: the app evolves into a data dashboard rather than a conversational intelligence platform. All ETAP 4 tasks should be evaluated: does this UI component serve the conversation, or replace it?',
        severity: 'high',
        type: 'dashboard_gravity',
        affectedArea: 'apps/web/src/app/(app)',
        relatedRoadmapNodeId: etap4.id,
      },
      {
        title: 'Business Logic in Server Actions',
        description:
          'Some auth and onboarding logic is embedded in Next.js server actions (src/lib/actions/auth.ts) rather than in domain packages. This creates a leak of business logic into the framework layer. Risk: logic becomes untestable and hard to reuse in future runtimes.',
        severity: 'medium',
        type: 'business_logic_leak',
        affectedArea: 'apps/web/src/lib/actions/auth.ts',
        relatedRoadmapNodeId: etap3.id,
      },
      {
        title: 'Event System Missing — Signals Are Implicit',
        description:
          'Currently, there is no canonical event system. Nutrition logs, workout logs, and recovery data are stored in DB but do not emit events. This means the runtime cannot react to changes in real time. ETAP 2.5 must be implemented before ETAP 5 (NCIC) to avoid orchestration drift.',
        severity: 'critical',
        type: 'orchestration_drift',
        affectedArea: 'packages/events, packages/queue',
        relatedRoadmapNodeId: etap2_5.id,
      },
      {
        title: 'PMOS Scope Creep Risk',
        description:
          'PMOS is an internal development memory tool. Adding features like AI auto-analysis, embeddings, or real-time collaboration would turn it into a product rather than an internal tool. Keep PMOS lightweight. Reject any feature that does not serve development memory or architecture governance.',
        severity: 'low',
        type: 'overengineering',
        affectedArea: 'apps/pmos',
        relatedRoadmapNodeId: etap6.id,
      },
    ],
  })

  // ─── Strategic Backlog Nodes (ETAP 7–11) ──────────────────────────────────

  const etap7 = await prisma.roadmapNode.create({
    data: {
      title: 'ETAP 7 — Advanced AI Orchestration',
      description: 'AI Gateway Layer with model routing and cost control. Dedicated Conversational Runtime as a separate service. Queue orchestration for proactive interventions. Advanced observability and distributed tracing.',
      status: 'backlog',
      priority: 'high',
      order: 700,
      sortKey: '007',
      scope: 'strategic_backlog',
    },
  })

  const etap8 = await prisma.roadmapNode.create({
    data: {
      title: 'ETAP 8 — Integrations (Strava / Garmin / Apple Health / Google Fit)',
      description: 'OAuth2-based integration layer. Wearable data ingestion. Normalized activity and biometric signals. Real-time webhook processing for training load updates.',
      status: 'backlog',
      priority: 'high',
      order: 800,
      sortKey: '008',
      scope: 'strategic_backlog',
    },
  })

  const etap9 = await prisma.roadmapNode.create({
    data: {
      title: 'ETAP 9 — Predictive AI & Vector Memory',
      description: 'Semantic user memory via pgvector or Pinecone. Behavioral pattern recognition. Predictive coaching based on historical data. Lifecycle orchestration (nudges, retention, adaptive onboarding).',
      status: 'backlog',
      priority: 'medium',
      order: 900,
      sortKey: '009',
      scope: 'strategic_backlog',
    },
  })

  const etap10 = await prisma.roadmapNode.create({
    data: {
      title: 'ETAP 10 — Voice Runtime',
      description: 'Voice-first conversational interface. Speech-to-text ingestion. Voice coaching responses. PWA audio recording integration.',
      status: 'backlog',
      priority: 'medium',
      order: 1000,
      sortKey: '010',
      scope: 'strategic_backlog',
    },
  })

  const etap11 = await prisma.roadmapNode.create({
    data: {
      title: 'ETAP 11 — Multi-Region & Distributed Runtime',
      description: 'Kubernetes or managed container runtime. Regional inference routing. Event streaming architecture. Dedicated recommendation models. Hybrid inference (LLM + heuristics + ML).',
      status: 'backlog',
      priority: 'low',
      order: 1100,
      sortKey: '011',
      scope: 'strategic_backlog',
    },
  })

  // ─── Blueprint Source ─────────────────────────────────────────────────────

  await prisma.blueprintSource.create({
    data: {
      title: 'Leaxaro Strategic Architecture & Conversational Intelligence Blueprint',
      description: 'Dokument strategiczny opisujący docelową wizję produktu Leaxaro: architekturę infrastruktury, model skalowania, logikę aplikacji, grawitację UX oraz kanoniczny model Conversational Intelligence. Zawiera: Executive Summary, produkt vision, Coach-First UX, NCIC structure, infrastructure phases (FAZA 1-3), Bilingual Intelligence Architecture, Event-Driven Architecture, Product Philosophy, risks i advantages.',
      sourceType: 'document',
      version: 'v1',
    },
  })

  // ─── Canonical Principles ─────────────────────────────────────────────────

  const p1 = await prisma.canonicalPrinciple.create({
    data: {
      title: 'Conversation-first over dashboard-first',
      description: 'The primary interaction model is conversation with the coach, not reading dashboards. The coach is the entry point. Dashboard is a contextual layer triggered by the coach or user request.',
      reason: 'Most health apps fail because they are data dashboards that users abandon after 2 weeks. Conversational runtime creates habit loops and personalization depth that dashboards cannot.',
      priority: 'high',
    },
  })

  const p2 = await prisma.canonicalPrinciple.create({
    data: {
      title: 'Runtime-first architecture',
      description: 'Build the conversational runtime before building UI. The runtime must be stateful, event-driven, and outcome-oriented. UI is a thin rendering layer over runtime state.',
      reason: 'If runtime is well-designed, the app can scale technically without rewriting product logic. Runtime-first prevents the gravitational pull of UI complexity absorbing domain logic.',
      priority: 'high',
    },
  })

  const p3 = await prisma.canonicalPrinciple.create({
    data: {
      title: 'LLM as reasoning layer only',
      description: 'LLM is not the main logic of the product. It is the reasoning and language generation layer. All calculations (BMR, TDEE, TSS, CTL, readiness scores) must be done by deterministic domain engines.',
      reason: 'LLMs are non-deterministic, expensive, and cannot be relied on for precise numeric calculations. Mixing LLM reasoning with domain calculations creates uncontrollable and costly behavior.',
      priority: 'high',
    },
  })

  const p4 = await prisma.canonicalPrinciple.create({
    data: {
      title: 'Event-driven orchestration',
      description: 'All significant state changes in the system must emit canonical events. Runtime reacts to events, not to scheduled polling. Events are the nervous system of the product.',
      reason: 'Event-driven architecture enables proactive coaching, real-time intervention, and separation of concerns between ingestion, reasoning, and output layers.',
      priority: 'high',
    },
  })

  const p5 = await prisma.canonicalPrinciple.create({
    data: {
      title: 'Anti-dashboard-gravity',
      description: 'Every new feature must be evaluated: does it serve the conversation, or does it replace it with a static visual? Features that increase dashboard complexity without serving coaching intelligence must be rejected or deferred.',
      reason: 'Dashboard gravity is the product risk where UI investment crowds out runtime investment. The product becomes a data viewer rather than an intelligent coach.',
      priority: 'high',
    },
  })

  const p6 = await prisma.canonicalPrinciple.create({
    data: {
      title: 'Memory continuity over stateless UX',
      description: 'The system must remember context across sessions. Conversations are not isolated transactions. The coach must recall past decisions, user history, behavioral patterns, and stated goals.',
      reason: 'Stateless UX breaks the coaching relationship. A coach who forgets everything between sessions is useless. Memory continuity is what makes Leaxaro different from a generic GPT wrapper.',
      priority: 'high',
    },
  })

  const p7 = await prisma.canonicalPrinciple.create({
    data: {
      title: 'Deterministic engines over LLM calculations',
      description: 'BMR, TDEE, macro splits, TSS, CTL/ATL/TSB, readiness scores, and HRV baselines must be calculated by deterministic domain engines. These results are passed to LLM as context, not calculated by LLM.',
      reason: 'Numeric precision, cost efficiency, testability, and reliability require deterministic calculation. LLM should interpret and explain results, not produce them.',
      priority: 'high',
    },
  })

  const p8 = await prisma.canonicalPrinciple.create({
    data: {
      title: 'Coach-first UX — coach is the primary entry point',
      description: 'When the user enters the app, they see the active coach, not a dashboard. The coach initiates context-aware conversation. Dashboard is a secondary layer accessible on demand.',
      reason: 'This is the single most important product differentiation. Every other health app is dashboard-first. Leaxaro is coach-first. This forces all UX decisions to serve conversational intelligence.',
      priority: 'high',
    },
  })

  const p9 = await prisma.canonicalPrinciple.create({
    data: {
      title: 'Bilingual intelligence — English canonical layer',
      description: 'Runtime, intents, orchestration, memory, and domain logic use English as the canonical intelligence language. The interaction/rendering layer can be localized. Polish and English are both supported from day one.',
      reason: 'Language-neutral runtime ensures semantic state is not tied to user language. Memory and reasoning work regardless of which language the user is speaking.',
      priority: 'medium',
    },
  })

  const p10 = await prisma.canonicalPrinciple.create({
    data: {
      title: 'Migration-friendly architecture — no premature enterprise infra',
      description: 'In FAZA 1 (0–50k MAU), use migration-friendly stack: Vercel, Neon, Upstash, Cloudflare R2. Do not build Kubernetes, distributed event streaming, or dedicated vector search before the product is validated.',
      reason: 'Over-engineering infrastructure before product-market fit is a common startup failure mode. Premature optimization of infra costs time and creates technical debt that is not yet needed.',
      priority: 'medium',
    },
  })

  const p11 = await prisma.canonicalPrinciple.create({
    data: {
      title: 'Separation of orchestration vs prompting',
      description: 'Orchestration logic (routing, priority, suppression, sequencing) must be separated from LLM prompting. Mixing orchestration and prompting creates uncontrollable runtime behavior.',
      reason: 'Without clear separation, the system becomes a black box where output depends on prompt phrasing rather than orchestration state. Controllability requires explicit orchestration.',
      priority: 'high',
    },
  })

  const p12 = await prisma.canonicalPrinciple.create({
    data: {
      title: 'Conversational ingestion over forms',
      description: 'Meal logging, activity reporting, and body metric tracking should happen through conversation, not through forms. "I had oatmeal with banana" is the primary input. Forms are the fallback.',
      reason: 'Form-based logging is the primary reason users abandon health apps. Conversational ingestion reduces friction, enables AI-assisted estimation, and keeps users engaged.',
      priority: 'high',
    },
  })

  const p13 = await prisma.canonicalPrinciple.create({
    data: {
      title: 'Cross-domain reasoning — nutrition + training + recovery',
      description: 'The coach must reason across all three domains simultaneously: nutrition status, training load, and recovery state. Isolated domain analysis is insufficient. A heavy training day changes nutrition targets. Low recovery changes coaching tone.',
      reason: 'No competitor effectively combines nutrition, training load, and recovery reasoning in a single conversational interface. This is Leaxaro\'s core competitive advantage.',
      priority: 'high',
    },
  })

  // ─── Principle → Node Relations ───────────────────────────────────────────

  await prisma.roadmapNodePrinciple.createMany({
    data: [
      // Conversation-first → ETAP 5, ETAP 4, ETAP 7
      { nodeId: etap5.id, principleId: p1.id },
      { nodeId: etap4.id, principleId: p1.id },
      { nodeId: etap7.id, principleId: p1.id },
      // Runtime-first → ETAP 5, ETAP 2.5, ETAP 7
      { nodeId: etap5.id, principleId: p2.id },
      { nodeId: etap2_5.id, principleId: p2.id },
      { nodeId: etap7.id, principleId: p2.id },
      // LLM as reasoning only → ETAP 5, ETAP 2
      { nodeId: etap5.id, principleId: p3.id },
      { nodeId: etap2.id, principleId: p3.id },
      // Event-driven → ETAP 2.5, ETAP 4.5, ETAP 7
      { nodeId: etap2_5.id, principleId: p4.id },
      { nodeId: etap4_5.id, principleId: p4.id },
      { nodeId: etap7.id, principleId: p4.id },
      // Anti-dashboard-gravity → ETAP 4
      { nodeId: etap4.id, principleId: p5.id },
      // Memory continuity → ETAP 5, ETAP 9
      { nodeId: etap5.id, principleId: p6.id },
      { nodeId: etap9.id, principleId: p6.id },
      // Deterministic engines → ETAP 2
      { nodeId: etap2.id, principleId: p7.id },
      // Coach-first UX → ETAP 5, ETAP 4
      { nodeId: etap5.id, principleId: p8.id },
      { nodeId: etap4.id, principleId: p8.id },
      // Bilingual → ETAP 5
      { nodeId: etap5.id, principleId: p9.id },
      // Migration-friendly → ETAP 1, ETAP 11
      { nodeId: etap1.id, principleId: p10.id },
      { nodeId: etap11.id, principleId: p10.id },
      // Separation orchestration vs prompting → ETAP 5, ETAP 7
      { nodeId: etap5.id, principleId: p11.id },
      { nodeId: etap7.id, principleId: p11.id },
      // Conversational ingestion → ETAP 5
      { nodeId: etap5.id, principleId: p12.id },
      // Cross-domain reasoning → ETAP 2, ETAP 5
      { nodeId: etap2.id, principleId: p13.id },
      { nodeId: etap5.id, principleId: p13.id },
    ],
    skipDuplicates: true,
  })

  // ─── Principle → Decision Relations ──────────────────────────────────────

  await prisma.decisionPrinciple.createMany({
    data: [
      { decisionId: d3.id, principleId: p1.id },
      { decisionId: d3.id, principleId: p2.id },
      { decisionId: d3.id, principleId: p5.id },
      { decisionId: d3.id, principleId: p8.id },
      { decisionId: d2.id, principleId: p10.id },
      { decisionId: d1.id, principleId: p10.id },
    ],
    skipDuplicates: true,
  })

  // ─── First PromptExecution (example) ─────────────────────────────────────

  await prisma.promptExecution.create({
    data: {
      title: 'PMOS Bootstrap — Blueprint Ingestion & Execution Memory System',
      etap: '6',
      subetap: '6.1',
      node: 'PMOS Blueprint Ingestion',
      domain: 'memory,architecture,orchestration',
      promptType: 'implementation',
      promptContent: `[PMOS]
ETAP: 6
SUBETAP: 6.1
NODE: PMOS Blueprint Ingestion
DOMAIN: memory,architecture,orchestration
TYPE: implementation

Transform PMOS into canonical strategic memory system for Leaxaro ecosystem. Ingest Leaxaro Strategic Blueprint v1. Add: PromptExecution model, CanonicalPrinciple model, BlueprintSource model. Decompose blueprint into 13 canonical principles, active roadmap vs strategic backlog, principle ↔ roadmap ↔ decision relations.`,
      executionSummary: 'Added 3 new Prisma models (PromptExecution, CanonicalPrinciple, BlueprintSource). Extended schema with NodeScope and PromptStatus enums. Seeded 13 canonical principles from Strategic Blueprint v1, 5 strategic backlog ETAPs (7-11), principle ↔ node ↔ decision relations. Created /prompts and /principles UI views.',
      architecturalImpact: 'PMOS is now a canonical strategic memory layer with structured principles, execution tracking, and blueprint provenance. All future development prompts should carry PMOS headers for continuity.',
      changedFiles: [
        'apps/pmos/prisma/schema.prisma',
        'apps/pmos/prisma/seed.ts',
        'apps/pmos/src/app/prompts/page.tsx',
        'apps/pmos/src/app/principles/page.tsx',
        'apps/pmos/src/components/layout/Sidebar.tsx',
      ],
      nextSteps: 'Integrate PMOS header parsing. Create /prompts/new form. Link PromptExecution to roadmap nodes automatically.',
      status: 'completed',
      roadmapNodeId: etap6.id,
    },
  })

  // ─── Prompt Templates ─────────────────────────────────────────────────────

  await prisma.promptTemplate.createMany({
    data: [
      {
        name: 'Implementation — NCIC Feature',
        description: 'Standard template for implementing a new NCIC feature or domain capability.',
        templateType: 'implementation',
        templateContent: '[PMOS]\nETAP: <number>\nSUBETAP: <number.number>\nNODE: <roadmap node name>\nDOMAIN: runtime,intents,memory\nTYPE: implementation\n\nImplement <feature name> in <package/path>.\n\nRequirements:\n- <requirement 1>\n- <requirement 2>\n\nConstraints:\n- TypeScript strict mode, no any\n- No raw SQL — Prisma only\n- React Server Components by default',
      },
      {
        name: 'Implementation — UI Component',
        description: 'Template for building a new UI component or page.',
        templateType: 'implementation',
        templateContent: '[PMOS]\nETAP: <number>\nSUBETAP: <number.number>\nNODE: <roadmap node name>\nDOMAIN: ui,pwa\nTYPE: implementation\n\nBuild <component name> at <path>.\n\nDesign direction:\n- Dark-first, typography-first\n- Tailwind utility classes\n- React Server Component unless interactivity needed\n\nRequirements:\n- <requirement 1>',
      },
      {
        name: 'Refactor — Domain Logic Extraction',
        description: 'Extract business logic from framework layer into domain packages.',
        templateType: 'refactor',
        templateContent: '[PMOS]\nETAP: <number>\nSUBETAP: <number.number>\nNODE: <roadmap node name>\nDOMAIN: architecture\nTYPE: refactor\n\nExtract <logic description> from <source path> to <target package>.\n\nWhy: Business logic must not leak into Next.js server actions or API routes.\n\nTarget package: packages/<name>/src/\n\nSteps:\n1. Identify all logic to extract\n2. Create domain function in package\n3. Update imports in framework layer\n4. Verify no direct DB calls remain in framework layer',
      },
      {
        name: 'Architecture Analysis — Warning Candidate',
        description: 'Analyze a potential architecture warning against canonical principles.',
        templateType: 'architecture',
        templateContent: '[PMOS]\nETAP: <number>\nSUBETAP: <number.number>\nNODE: <roadmap node name>\nDOMAIN: architecture,memory\nTYPE: analysis\n\nAnalyze <area> for architecture violations.\n\nCheck against canonical principles:\n- [ ] Conversation-first over dashboard-first\n- [ ] Runtime-first architecture\n- [ ] LLM as reasoning layer only\n- [ ] Event-driven orchestration\n- [ ] Anti-dashboard-gravity\n\nAffected area: <path or system>\nRisk level: <low|medium|high|critical>',
      },
      {
        name: 'Migration — Database Schema Change',
        description: 'Database schema migration using prisma db push (no shadow DB).',
        templateType: 'migration',
        templateContent: '[PMOS]\nETAP: <number>\nSUBETAP: <number.number>\nNODE: <roadmap node name>\nDOMAIN: database,infra\nTYPE: migration\n\nMigrate <describe change> in prisma/schema.prisma.\n\nChange type: <add model | add field | rename | delete>\nBreaking: <yes | no>\n\nSteps:\n1. Update prisma/schema.prisma\n2. Run: npx prisma db push (no migrate dev — no shadow DB)\n3. Update affected repository classes in packages/database/\n4. Update Zod validators in packages/validators/',
      },
      {
        name: 'Debugging — Runtime Issue',
        description: 'Diagnose and fix runtime issues.',
        templateType: 'debugging',
        templateContent: '[PMOS]\nETAP: <number>\nSUBETAP: <number.number>\nNODE: <roadmap node name>\nDOMAIN: runtime,memory\nTYPE: debugging\n\nDebug <issue description>.\n\nSymptoms:\n- <symptom 1>\n\nSuspected cause: <hypothesis>\n\nSteps:\n1. Reproduce consistently\n2. Isolate to component/package\n3. Check canonical alignment (is this a design issue?)\n4. Fix at root cause, not symptom',
      },
      {
        name: 'Runtime Analysis — Execution Flow',
        description: 'Analyze conversational runtime execution flows.',
        templateType: 'runtime_analysis',
        templateContent: '[PMOS]\nETAP: 5\nSUBETAP: 5.<number>\nNODE: NCIC <domain>\nDOMAIN: runtime,orchestration,memory\nTYPE: runtime-analysis\n\nAnalyze <execution flow name> runtime behavior.\n\nFlow: <describe flow from trigger to output>\n\nCheck:\n- Event emission: <yes | no | missing>\n- LLM involvement: <yes | no — what for>\n- Memory update: <yes | no>\n- Side effects: <list>',
      },
      {
        name: 'Infra — Environment / Config Change',
        description: 'Infrastructure and environment configuration changes.',
        templateType: 'infra',
        templateContent: '[PMOS]\nETAP: 1\nSUBETAP: 1.<number>\nNODE: Infrastructure\nDOMAIN: infra,database\nTYPE: infra\n\n<Describe infra change>.\n\nEnvironment: <dev | staging | production>\nBreaking: <yes | no>\nRequires redeploy: <yes | no>\nVercel env vars to update: <list>',
      },
      {
        name: 'Warning Resolution — Architecture Fix',
        description: 'Resolve an active architecture warning.',
        templateType: 'warning_resolution',
        templateContent: '[PMOS]\nETAP: <number>\nSUBETAP: <number.number>\nNODE: <roadmap node name>\nDOMAIN: architecture\nTYPE: warning-resolution\n\nResolve architecture warning: <warning title>\n\nWarning type: <type>\nSeverity: <low | medium | high | critical>\n\nResolution approach:\n<describe how the warning is being fixed>\n\nPost-resolution: mark warning as resolved in PMOS /warnings',
      },
    ],
  })

  // ─── Example ChangedFiles ─────────────────────────────────────────────────

  const seedPromptExec = await prisma.promptExecution.findFirst({
    where: { etap: '6' },
  })

  if (seedPromptExec) {
    await prisma.changedFile.createMany({
      data: [
        {
          path: 'apps/pmos/prisma/schema.prisma',
          changeType: 'updated',
          impactLevel: 'high',
          notes: 'Added PromptExecution, CanonicalPrinciple, BlueprintSource models.',
          promptExecutionId: seedPromptExec.id,
        },
        {
          path: 'apps/pmos/prisma/seed.ts',
          changeType: 'updated',
          impactLevel: 'medium',
          notes: 'Seeded 13 canonical principles, 5 strategic backlog ETAPs, blueprint source.',
          promptExecutionId: seedPromptExec.id,
        },
        {
          path: 'apps/pmos/src/app/prompts/page.tsx',
          changeType: 'created',
          impactLevel: 'medium',
          notes: 'New /prompts timeline view with PMOS header preview.',
          promptExecutionId: seedPromptExec.id,
        },
        {
          path: 'apps/pmos/src/app/principles/page.tsx',
          changeType: 'created',
          impactLevel: 'medium',
          notes: 'New /principles view showing 13 canonical principles with relations.',
          promptExecutionId: seedPromptExec.id,
        },
        {
          path: 'apps/pmos/src/components/layout/Sidebar.tsx',
          changeType: 'updated',
          impactLevel: 'low',
          notes: 'Added Prompts and Principles nav items.',
          promptExecutionId: seedPromptExec.id,
        },
      ],
    })
  }

  console.log('✅ Seed complete.')
  console.log(`   Tags: ${tags.length}`)
  console.log(`   Roadmap nodes: 29 (24 active + 5 strategic backlog)`)
  console.log(`   Execution logs: 3`)
  console.log(`   Decisions: 4`)
  console.log(`   Architecture warnings: 4`)
  console.log(`   Canonical principles: 13`)
  console.log(`   Blueprint sources: 1`)
  console.log(`   Prompt executions: 1`)
  console.log(`   Prompt templates: 9`)
  console.log(`   Changed files: 5 (from seed prompt execution)`)
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
