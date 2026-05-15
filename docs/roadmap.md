# Leaxaro — Roadmap

## ETAP 1 — Architecture & Foundation ✅
**Goal**: Professional project structure, no business logic yet.

Delivered:
- Monorepo structure (Turborepo + npm workspaces)
- apps/web (Next.js 15 App Router), apps/api, apps/workers
- packages: types, ui, utils, config, ai, nutrition-engine, training-engine, recovery-engine
- Prisma schema: 14 models, full relationships
- App Router structure: (auth), (app), API routes
- AI architecture: prompts, context builder, safety layer
- Integration architecture: TrainingPeaks, Garmin
- Excel import architecture
- DevOps: GitHub Actions CI, Docker foundation, linting, Husky
- Documentation: architecture, domain model, AI coach, integrations, database schema

---

## ETAP 2 — Database & Domain Model ✅
**Goal**: Complete domain model, repositories, engine analyzers, import foundation.

Delivered:
- Prisma schema: 25 enums, 20 models (MySQL/MariaDB compatible)
- packages/database: Prisma singleton + 7 repository classes + helpers
- packages/queue: BullMQ 5 + ioredis 5 (5 queue types)
- packages/validators: Zod schemas for all domain entities
- packages/events: In-process domain events (18 event types)
- packages/types: Full TypeScript domain types (29 domains)
- Engine analyzers: nutrition-engine, training-engine, recovery-engine
- Excel import: parser (exceljs), column-map (80 PL/EN variants), import-session service
- packages/config: Redis, queue schedule, pagination, import limits constants
- **Architecture correction**: PostgreSQL/Neon → MySQL/MariaDB (WEBD.pl)
- DATABASE_URL format: `mysql://user:pass@host:3306/tomuscin_nutricoach`

---

## ETAP 3 — Auth & Onboarding (current)
**Goal**: Working login, register, email verification, user profile setup.

Scope:
- NextAuth v5 full config (email/password, JWT, Prisma adapter)
- Email verification flow (Resend)
- Password reset flow
- LoginForm, RegisterForm components (shadcn/ui)
- Onboarding wizard: sex, birth date, height, weight, goal, activity level
- Calculate initial BMR/TDEE/targets on onboarding complete
- Middleware: session guard for (app) routes
- Session store in Prisma (Account, Session models)

---

## ETAP 4 — UI Foundation & Excel Import
**Goal**: App shell, navigation, design system, import historical data.

Scope:
- shadcn/ui components setup (Button, Card, Input, etc.)
- Custom Leaxaro widgets (CalorieRing, MacroBar, StatCard)
- Sidebar + MobileBottomNav + MobileTopBar
- Dark/light mode (next-themes)
- Excel parser implementation (exceljs / xlsx)
- Import script: historical DailyLogs, BodyMetrics, Workouts
- Verify EXCEL_COLUMN_MAP against actual file headers
- TanStack Query setup + query client provider
- Zustand store setup

---

## ETAP 5 — Nutrition Logging
**Goal**: Working daily nutrition log — add meals, track macros.

Scope:
- DailyLog API: GET/POST/PATCH
- Meal API: POST/DELETE
- Daily targets calculation from UserProfile + Goal
- MealLogger form (quick add + detailed)
- MacroProgress bars (protein, carbs, fat)
- CalorieRing widget (consumed vs target)
- DailyLog history view
- Water intake tracking
- Body weight logging + trend chart

---

## ETAP 5 — Training & Recovery Tracking
**Goal**: Manual workout logging, training load visualization, sleep + HRV tracking.

Scope:
- Workout API: GET/POST/PATCH/DELETE
- Workout logger form (type, duration, RPE, TSS manual)
- TSS from RPE estimator
- Performance Management Chart (ATL, CTL, TSB)
- FTP zones display
- Sleep metric logging form
- Recovery metric logging form
- Readiness score display (composite)
- RecoveryEngine integration
- Dashboard widgets: TrainingLoadWidget, RecoveryWidget

---

## ETAP 6 — Analytics Dashboard
**Goal**: Data visualization — weight trend, calorie trend, training load, sleep.

Scope:
- Weight trend chart (line chart, 7/30/90 day views)
- Calorie intake vs target chart
- Macro distribution chart (area/stacked)
- Training load PMC chart (ATL/CTL/TSB)
- Sleep duration chart
- HRV trend chart
- Weekly summary stats
- Recharts integration
- Date range selector

---

## ETAP 7 — AI Coach
**Goal**: Working AI Coach — morning brief, midday check, evening review, chat.

Scope:
- buildUserContext() full implementation
- Morning brief job (Vercel Cron or manual trigger)
- Midday check job
- Evening review job
- AICoachChat component (streaming SSE)
- Morning brief display on dashboard
- InsightHistory sidebar
- AIInsight storage + retrieval
- Token usage tracking
- Safety layer full implementation

---

## ETAP 8 — Notifications & Settings
**Goal**: Push notifications, email digests, user settings.

Scope:
- Notification system (in-app + email)
- Daily summary email (Resend)
- Achievement notifications (goal milestones, streaks)
- Settings page: macros targets, notification preferences, timezone
- Account settings: email change, password change, delete account
- Goal management: create new goal, view history

---

## ETAP 9 — TrainingPeaks Integration
**Goal**: Full OAuth + sync — workouts imported automatically.

Scope:
- TrainingPeaks OAuth 2.0 + PKCE full implementation
- Token storage (encrypted in DB)
- Auto-refresh logic
- Background sync worker (6h interval)
- Manual sync trigger from UI
- Workout deduplication (externalId)
- FTP sync to UserProfile
- Sync status display (connected/syncing/error)
- TPSyncLog viewer for debugging

---

## ETAP 10 — Garmin Integration + Polish
**Goal**: Garmin sleep/activity sync, app polish, production readiness.

Scope:
- Garmin Connect OAuth + activity/sleep API
- SleepMetric + RecoveryMetric sync from Garmin
- Body Battery import
- Performance & UX polish
- Lighthouse audit + Core Web Vitals optimization
- Error boundaries, loading states, empty states
- Offline support (service worker for static shell)
- A11y audit (keyboard navigation, ARIA)
- Final security audit
- Production deployment checklist

---

## Post-MVP (v2) Considerations

- BFF extraction (apps/api as standalone Express/Hono service)
- Redis queue (BullMQ) for background jobs
- Stripe integration (subscription / pro tier)
- Mobile app (React Native / Expo) sharing packages
- Meal database integration (Open Food Facts / Nutritionix)
- Photo meal logging (GPT-4 Vision → macro estimation)
- PDF weekly report generation
- Oura Ring integration
