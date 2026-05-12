# NutriCoach — Architecture

## Overview

NutriCoach is a **mobile-first, premium web application** for nutrition monitoring, training tracking, recovery analysis, and AI-powered personal coaching.

**Tech Stack:**
- Frontend: Next.js 15 (App Router) + React 19 + TypeScript
- Styling: TailwindCSS + shadcn/ui + Framer Motion
- Database: MySQL / MariaDB (WEBD.pl — `tomuscin_nutricoach`) + Prisma ORM
- Cache / Queue: Redis (Upstash) + BullMQ
- Auth: NextAuth/Auth.js v5 (email/password, JWT sessions)
- AI: OpenAI API (GPT-4o / GPT-4o-mini)
- Hosting: Vercel (frontend), WEBD.pl (database), Upstash (Redis), Render (workers — future)
- Monorepo: Turborepo + npm workspaces

---

## Project Structure

```
NutriCoach/
├── apps/
│   ├── web/                  # Main Next.js app (frontend + API routes)
│   ├── api/                  # Future BFF (post-MVP)
│   └── workers/              # Background jobs (AI, sync, notifications)
├── packages/
│   ├── types/                # Shared TypeScript types
│   ├── ui/                   # Shared component library (shadcn/ui based)
│   ├── config/               # Shared configuration constants
│   ├── utils/                # Shared utility functions
│   ├── ai/                   # AI Coach orchestration
│   ├── nutrition-engine/     # Nutrition calculations (BMR, TDEE, macros)
│   ├── training-engine/      # Training load (TSS, ATL, CTL, TSB, zones)
│   └── recovery-engine/      # Recovery scoring (HRV, sleep, readiness)
├── prisma/
│   ├── schema.prisma         # Database schema
│   └── seed.ts               # Development seed
├── docs/                     # Documentation
├── scripts/                  # Dev/deploy scripts
├── infrastructure/           # Docker, IaC
└── .github/                  # CI/CD workflows
```

---

## Application Architecture

### Request Flow

```
Browser / Mobile
    ↓
Next.js App (Vercel Edge)
    ↓ Route Groups
    ├── (auth)/    — login, register, verify, reset
    └── (app)/     — protected app routes
         ├── /dashboard
         ├── /nutrition
         ├── /workouts
         ├── /recovery
         ├── /ai-coach
         ├── /analytics
         ├── /integrations
         └── /profile

    ↓ API Routes (Next.js)
    /api/auth/[...nextauth]    — NextAuth handlers
    /api/nutrition/logs        — DailyLog CRUD
    /api/nutrition/meals       — Meal CRUD
    /api/workouts              — Workout CRUD
    /api/body-metrics          — BodyMetric CRUD
    /api/recovery              — Sleep + RecoveryMetric
    /api/ai/coach              — AI Coach (streaming)
    /api/ai/brief              — Daily briefs (morning/midday/evening)
    /api/integrations/trainingpeaks/connect   — OAuth initiate
    /api/integrations/trainingpeaks/callback  — OAuth callback
    /api/integrations/trainingpeaks/sync      — Manual sync trigger
    /api/health                — Health check
    
    ↓
    Prisma ORM → MySQL / MariaDB (WEBD.pl — port 3306)
    Redis (Upstash) → BullMQ queues (AI, sync, notifications)
    OpenAI API
    TrainingPeaks API (ETAP 9)
    Garmin API (ETAP 10)
```

### State Management

- **Server State**: React Query (TanStack Query v5) — all DB data
- **Client State**: Zustand — UI state (theme, sidebar, selected date)
- **Form State**: React Hook Form + Zod validation
- **Auth State**: NextAuth session (JWT cookies)

### Data Flow

```
Excel (source of truth) → Import Parser → DailyLog / BodyMetric / Workout
TrainingPeaks → TP Sync Worker → Workout / RecoveryMetric
Garmin → Garmin Sync Worker → SleepMetric / RecoveryMetric
User manual input → API routes → Prisma → MySQL (WEBD.pl)
MySQL (WEBD.pl) → Context Builder → OpenAI → AIInsight → User
```

---

## Module Responsibilities

| Module | Package | Responsibility |
|--------|---------|----------------|
| Nutrition Engine | `@nutricoach/nutrition-engine` | BMR, TDEE, caloric targets, macro splits, daily balance |
| Training Engine | `@nutricoach/training-engine` | TSS, ATL, CTL, TSB, FTP zones, PMC |
| Recovery Engine | `@nutricoach/recovery-engine` | Readiness score, sleep analysis, HRV baseline |
| AI Package | `@nutricoach/ai` | Prompt management, safety layer, orchestration |
| Types | `@nutricoach/types` | Shared TypeScript types across all apps |
| Utils | `@nutricoach/utils` | Formatting, date utilities, math helpers |
| Config | `@nutricoach/config` | Constants, default values, app config |
| UI | `@nutricoach/ui` | shadcn/ui components, custom widgets |

---

## Security Architecture

- All API routes validate session before processing
- Input sanitization on all user-submitted data
- Zod validation schemas on all API boundaries
- PKCE OAuth flow for TrainingPeaks (no secret exposure)
- Tokens stored encrypted in MySQL (AES-256-GCM at application layer)
- Token refresh before expiry (10 min threshold)
- AI safety layer: prompt injection detection, off-topic guard
- Security headers on all responses (CSP, X-Frame-Options, etc.)
- Environment variables never exposed to client
- Prisma parameterized queries (SQL injection prevention)
- MySQL remote access: SSL required (sslaccept=strict in DATABASE_URL)

---

## Performance Strategy

- Next.js App Router with React Server Components (minimize client JS)
- Aggressive caching: React Query with staleTime per data type
- **Redis cache**: AI context (TTL 5 min), user profile (TTL 15 min), training load (TTL 1 hour)
- Database indexes on all (userId, date) combinations — critical for time-series queries
- Denormalized calorie totals on DailyLog (no JOIN for dashboard)
- Edge runtime for lightweight API routes
- BullMQ queues: AI briefs, TP/Garmin sync, notifications — all async and retry-safe
- Image optimization via Next.js Image component
- Framer Motion lazy loaded, animations respecting prefers-reduced-motion

## Redis Strategy (WEBD.pl context)

WEBD.pl does not provide Redis. Use **Upstash** (serverless Redis, free tier).

| Use Case | Queue / Key Pattern | TTL |
|---|---|---|
| AI context cache | `ai:ctx:{userId}` | 5 min |
| User profile cache | `profile:{userId}` | 15 min |
| Training load cache | `pmc:{userId}:{date}` | 1 hour |
| AI brief jobs | `nutricoach:ai` BullMQ queue | — |
| Sync jobs | `nutricoach:sync` BullMQ queue | — |
| Notification jobs | `nutricoach:notifications` BullMQ queue | — |
| Rate limiting | `rl:{userId}:{route}` | 60 sec |

Redis down = app degrades gracefully (cache miss → DB query, queue retry later).

---

## Scalability Path

```
MVP (ETAP 1–7):        Monolith — Next.js + MySQL/WEBD.pl + Vercel + Upstash Redis
Post-MVP (ETAP 8–10):  Extract workers → Render background services
Scale (v2):            BFF API → separate service, Redis queue, CDN
                       DB migration path: MySQL/WEBD.pl → PlanetScale or managed MySQL
```

## Database Notes (MySQL / WEBD.pl)

- **Provider**: MySQL 5.7+ or MariaDB 10.2+ (WEBD.pl shared hosting)
- **Database name**: `tomuscin_nutricoach`
- **External access**: Enable in WEBD.pl panel — add IP whitelist or enable all (restrict to Vercel IPs in prod)
- **SSL**: Required — use `ssl=true&sslaccept=strict` in `DATABASE_URL`
- **JSON fields**: MySQL 5.7.8+ = native JSON column; MariaDB 10.2+ = LONGTEXT (Prisma handles transparently)
- **Descending indexes**: `sort: Desc` removed from schema — not supported in MariaDB; MySQL 8+ supports it but not guaranteed on WEBD.pl
- **Connection pool**: Prisma default pool (10 connections max); tune via `connection_limit` param if WEBD.pl limits connections
- **Migration**: Use `npx prisma migrate deploy` (not `dev`) in production — never run `prisma migrate reset` in production
