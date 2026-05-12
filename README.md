# NutriCoach — README

AI Personal Coach for nutrition, training and recovery.

**Private project. Not affiliated with Profitia.**

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router) + React 19 + TypeScript |
| Styling | TailwindCSS + shadcn/ui + Framer Motion |
| Database | MySQL / MariaDB (WEBD.pl — `tomuscin_nutricoach`) + Prisma ORM |
| Cache / Queue | Redis (Upstash) + BullMQ |
| Auth | NextAuth/Auth.js v5 |
| AI | OpenAI API (GPT-4o / GPT-4o-mini) |
| Hosting | Vercel (app) + WEBD.pl (database) + Upstash (Redis) |
| Monorepo | Turborepo + npm workspaces |

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example apps/web/.env.local
# Edit apps/web/.env.local with your credentials

# 3. Set up database
npm run db:migrate

# 4. Run development server
npm run dev

# 5. Open http://localhost:3100
```

---

## Project Structure

```
NutriCoach/
├── apps/
│   ├── web/              # Main app (Next.js 15)
│   ├── api/              # Future BFF
│   └── workers/          # Background jobs (AI, sync)
├── packages/
│   ├── types/            # Shared TypeScript types
│   ├── ui/               # Component library
│   ├── utils/            # Utilities
│   ├── config/           # Constants
│   ├── ai/               # AI Coach package
│   ├── nutrition-engine/ # Nutrition calculations
│   ├── training-engine/  # Training load (TSS, ATL, CTL)
│   └── recovery-engine/  # Recovery scoring
├── prisma/               # Schema + migrations
├── docs/                 # Documentation
├── scripts/              # Dev scripts
└── infrastructure/       # Docker, CI/CD
```

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start all apps in dev mode |
| `npm run build` | Build all apps |
| `npm run lint` | Lint all packages |
| `npm run typecheck` | TypeScript check |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:studio` | Open Prisma Studio |
| `npm run db:seed` | Seed development data |
| `npm run format` | Prettier format |

---

## Documentation

- [Architecture](docs/architecture.md)
- [Domain Model](docs/domain-model.md)
- [AI Coach](docs/ai-coach.md)
- [Integrations](docs/integrations.md)
- [Design System](docs/design-system.md)
- [Roadmap](docs/roadmap.md)

---

## Development Status

**ETAP 1 — Architecture & Foundation** ✅  
See [roadmap](docs/roadmap.md) for full 10-stage plan.
