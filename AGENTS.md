# NutriCoach — AGENTS.md
# Instructions for AI coding assistants working on this project

## CRITICAL: Environment Isolation
This project is PRIVATE. It must NEVER share code, dependencies, API keys,
database connections, GitHub accounts, or any resources with the Profitia workspace.

## Project Location
/Users/tomaszuscinski/Projects/private/NutriCoach/

## Active Stage
ETAP 3 complete (Auth & Identity Foundation). Starting ETAP 4 (Dashboard & Data Display).

## Infrastructure Status (ETAP 2.5 — validated 2026-05-12)
- **DB**: MySQL 8.0.32 (Percona) @ mn05.webd.pl — CONNECTED ✅
- **Tables**: 20 tables created via `prisma db push` ✅
- **Seed**: realistic cyclist data (tomasz@nutricoach.local) ✅
- **Prisma client**: generated v5.22.0 ✅
- **Infra validation**: `node scripts/validate-infra.mjs` — 19 passed, 0 failed ✅
- **`prisma db push`**: use instead of `migrate dev` on WEBD.pl (no shadow DB permission)
- **NEXTAUTH_SECRET**: set ✅ (`TjYM7/y9tT7PSPoQZbzfl2ERAsIrHx4OxZO1ds97tLI=` in .env.local)

## Auth Status (ETAP 3 — completed 2026-05-12)
- **NextAuth v5** (5.0.0-beta.31): JWT strategy + Credentials provider ✅
- **`@auth/prisma-adapter`** v2.0.0: wired but JWT sessions (not DB sessions) ✅
- **bcryptjs** 12 rounds: password hashing ✅
- **Rate limiting**: in-memory (5 attempts / 15 min window) in `src/lib/rate-limit.ts` ✅
- **Auth logger**: `src/lib/auth-logger.ts` — logs sign-in/sign-out/errors ✅
- **Middleware**: `src/middleware.ts` — protects all `/(app)/*` routes, redirects to `/auth/login?callbackUrl=...` ✅
- **Server actions**: `src/lib/actions/auth.ts` — register, login, logout, onboarding ✅
- **Onboarding wizard**: `src/components/onboarding/OnboardingWizard.tsx` — 4 steps (profile, goals, activity, sport) ✅
- **Auth pages**: login, register, forgot-password, verify-email, error — all at `/auth/*` ✅
- **Session helpers**: `currentUser()`, `requireAuth()`, `requireOnboarded()`, `requireRole()` in `src/lib/auth.ts` ✅
- **Build**: clean production build — 15 pages all `ƒ` Dynamic, Middleware 132 kB ✅
- **Smoke tests** (2026-05-12): health ✅, /auth/login 200 ✅, /dashboard → redirect to /auth/login?callbackUrl=%2Fdashboard ✅

## Build Notes (critical — Next.js 15.3.9 + App Router)
- ALL pages need `export const dynamic = 'force-dynamic'` — private app, no SSG
- `src/pages/_document.tsx` and `src/pages/_error.tsx` required (Pages Router static gen for /_error)
- `next.config.ts`: NO `instrumentationHook: true` (deprecated in 15); `serverExternalPackages` at top level (not in `experimental`)
- `metadataBase` in root layout OK — but can't use `process.env` before `dynamic` export
- Auth layout `(auth)/layout.tsx` needs `force-dynamic` if any child uses `auth()`

## Architecture
- Monorepo: Turborepo + npm workspaces
- Frontend: apps/web (Next.js 15 App Router)
- **Database: MySQL / MariaDB (WEBD.pl — `tomuscin_nutricoach`)** + Prisma v5
  - Prisma provider: `"mysql"` (no directUrl — MySQL doesn't use Neon pooler)
  - No `sort: Desc` in indexes (MariaDB incompatible)
  - JSON fields: native MySQL 5.7.8+ / LONGTEXT on MariaDB (Prisma transparent)
  - Connection: `DATABASE_URL=mysql://...?ssl=true&sslaccept=strict`
  - Docs: docs/database-migration.md
- Auth: NextAuth v5 ✅ (JWT strategy, Credentials provider — ETAP 3 done)
- AI: OpenAI API (GPT-4o / GPT-4o-mini)
- Queue: BullMQ 5 + ioredis 5 + Redis via Upstash (packages/queue)
- Port: 3100 (to avoid conflict with other local projects)

## Packages (all in packages/)
| Package | Purpose |
|---|---|
| `@nutricoach/types` | Shared TypeScript domain types (593 lines, 29 domains) |
| `@nutricoach/config` | Shared constants (nutrition, training, sync, Redis, queue schedule, pagination, import limits) |
| `@nutricoach/database` | Prisma singleton + 7 repository classes + helpers (pagination, soft-delete, transactions, query-builder) |
| `@nutricoach/queue` | BullMQ queues (ai, sync, notifications, imports, analytics) + Redis connection |
| `@nutricoach/validators` | Zod schemas for all domain entities (user, goal, nutrition, workout, body-metric, import) |
| `@nutricoach/events` | In-process domain events (18 event types, 3 handler groups) |
| `@nutricoach/nutrition-engine` | BMR/TDEE, macro splits, daily balance, trend analyzers, projections |
| `@nutricoach/training-engine` | TSS, PMC (CTL/ATL/TSB), FTP zones, incremental PMC update, trend analyzers |
| `@nutricoach/recovery-engine` | Readiness scoring, HRV baseline, sleep analysis, recovery analyzers |

## Key Files
- Schema: prisma/schema.prisma (25 enums, 20 models — MySQL provider)
- Migration docs: docs/database-migration.md
- Types: packages/types/src/index.ts
- Config: packages/config/src/index.ts
- Nutrition engine: packages/nutrition-engine/src/{index,analyzers}.ts
- Training engine: packages/training-engine/src/{index,analyzers}.ts
- Recovery engine: packages/recovery-engine/src/{index,analyzers}.ts
- AI prompts: apps/web/src/lib/ai/prompts.ts
- TrainingPeaks: apps/web/src/lib/integrations/trainingpeaks.ts
- Excel import: apps/web/src/lib/imports/ (column-map, excel-parser, import-session)
- Health check: apps/web/src/app/api/health/route.ts

## Coding Conventions
- TypeScript strict mode
- No `any` types
- Zod for all external data validation
- Prisma for all DB operations (no raw SQL)
- React Server Components by default, `'use client'` only when needed
- TanStack Query for all server state
- No console.log in production code (use console.error/warn only)

## Excel Source File
/Users/tomaszuscinski/Projects/private/NutriCoach/redukcjaod 04.05.2026.xlsx
— This is the user's data source. Inspect column headers before implementing parser.

## Documentation
All architectural decisions documented in docs/*.md
Read docs/architecture.md and docs/domain-model.md before making structural changes.
