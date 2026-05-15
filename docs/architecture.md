# Leaxaro — Architecture

## Overview

Leaxaro is an **AI-native Conversational Intelligence Platform** for nutrition, training, and recovery. It is NOT a dashboard app, NOT a calorie tracker, and NOT a chatbot wrapper.

The platform is built on a conversational-first, runtime-first, event-driven, memory-oriented, and capability-based architecture.

---

## Ecosystem Position

Leaxaro is the **third autonomous development ecosystem**, completely isolated from:

- **Profitia** — B2B SaaS procurement intelligence
- **Private** — personal projects and tools

Leaxaro has its own: GitHub repo, Vercel deployment, Neon database, OpenAI key, Sentry, PostHog, Upstash, billing, environment variables.

---

## Root Structure

```
/Leaxaro
├── apps/
│   ├── web/                    # Next.js 14 — main PWA (leaxaro-web)
│   ├── api/                    # standalone API (future)
│   └── workers/                # background workers (future)
├── packages/
│   ├── ncic/                   # Nutrition Conversational Intelligence Core ← CANONICAL
│   ├── ai/                     # AI utilities (streaming, prompts)
│   ├── database/               # Prisma client + repositories
│   ├── events/                 # event bus + event types
│   ├── nutrition-engine/       # nutrition calculations
│   ├── training-engine/        # training load calculations
│   ├── recovery-engine/        # recovery scoring
│   ├── queue/                  # job queue abstraction
│   ├── types/                  # shared TypeScript types
│   ├── ui/                     # shared UI components
│   ├── utils/                  # utilities
│   ├── validators/             # Zod schemas
│   └── config/                 # shared config
├── services/
│   ├── conversational-runtime/ # NCIC runtime (future)
│   ├── event-engine/           # event processing (future)
│   ├── recommendation-engine/  # AI recommendations (future)
│   ├── memory-engine/          # user memory + context (future)
│   ├── ingestion-engine/       # data ingestion (future)
│   └── ai-gateway/             # unified AI gateway (future)
├── infrastructure/             # Docker, compose
├── docs/                       # canonical architecture docs
├── experiments/                # AI inference experiments, prompt engineering
├── archive/                    # deprecated code for reference
├── scripts/                    # automation scripts
└── prisma/                     # root Prisma schema
```

---

## Application Layer (`apps/web`)

Next.js 14 App Router PWA. Handles auth, onboarding, dashboard, conversational interface (future - powered by NCIC), Strava/TrainingPeaks integrations.

**Key principle**: `apps/web` is a thin orchestration layer. Business logic lives in `packages/*`.

---

## Conversational Intelligence Layer (`packages/ncic`)

The NCIC is the canonical home for all AI-native conversational logic.
See [NCIC-FOUNDATION.md](./NCIC-FOUNDATION.md).

---

## Infrastructure

| Layer | Provider |
|---|---|
| Hosting | Vercel |
| Database | Neon (PostgreSQL serverless) |
| Cache/Queue | Upstash (Redis + QStash) |
| AI | OpenAI (gpt-4o, embeddings) |
| Observability | Sentry + PostHog |
| Email | Resend |
| Vector Memory | future: pgvector / Pinecone |

---

## Brand Evolution

**NutriCoach → Leaxaro** (renamed 2026-05-13)

The working title "NutriCoach" constrained the product to nutrition/diet-app positioning.
Leaxaro is category-flexible, more premium, and aligned with the conversational runtime vision.

**What changed:**
- Product name, workspace, metadata, PWA identity, docs, env app name
- Canonical brand in all user-facing surfaces

**What intentionally did NOT change:**
- Package namespace `@nutricoach/*` — technical identifier, migration path TBD
- Database name `tomuscin_nutricoach` — live production DB (WEBD.pl)
- Vercel project link (`.vercel/project.json`) — tied to deployed infrastructure
- NCIC — "Nutrition Conversational Intelligence Core" remains the internal runtime architecture layer within Leaxaro

**NCIC note:** NCIC is an internal runtime architecture layer within Leaxaro. The "Nutrition" in NCIC refers to the origin domain but NCIC now spans nutrition, training, recovery, and behavioral intelligence.

---

## Development Principles

1. **Conversational-first** — every feature is designed around dialogue, not CRUD
2. **Runtime-first** — behavior from orchestrated capabilities, not hardcoded logic
3. **Event-driven** — side effects communicated through events, not direct calls
4. **Memory-oriented** — user context persists and evolves across sessions
5. **Capability-based** — AI selects and composes capabilities to achieve outcomes
6. **Isolation** — zero sharing with Profitia and Private ecosystems
