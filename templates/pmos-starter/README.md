# PMOS — Project Memory Operating System
## Embedded AI-Native Development Memory Runtime

PMOS is a **self-hosted, embedded AI-native project operating system** you run locally inside your project.

It is not a SaaS. It is not a shared dashboard. It is not a project management tool.

PMOS is a **development memory runtime** — a structured layer that keeps your AI assistant, your architecture, and your execution history in sync across sessions, collaborators, and time.

---

## What PMOS Is

```
Each project has its own PMOS.
Each PMOS has its own:
  - Roadmap (hierarchical execution nodes)
  - Principles (canonical architecture rules)
  - Execution Logs (what was built, why, how)
  - Warnings (architecture risks, drifts)
  - Decisions (why things are the way they are)
  - Prompts (AI execution history)
  - Runtime Context (auto-generated AI injection file)
```

PMOS runs as a Next.js app on a local or project-scoped Postgres database (Neon recommended).  
It exposes a runtime context API that can be consumed by GitHub Copilot, Claude, or any AI assistant.

---

## Quick Start

```bash
# 1. Copy PMOS into your project
cp -r templates/pmos-starter/apps/pmos apps/pmos

# 2. Install dependencies
cd apps/pmos && npm install

# 3. Configure environment
cp .env.example .env.local
# Edit .env.local with your Postgres credentials

# 4. Initialize database
npm run db:generate
npm run db:push
npm run db:seed

# 5. Run PMOS
npm run dev
# → http://localhost:3200

# 6. Build runtime context for AI
npm run context:build
```

See [INSTALL.md](./INSTALL.md) for the complete step-by-step guide.

---

## What Gets Created

After seeding, you have a working PMOS with:

- **5 generic ETAPs** (Foundation → AI Layer) ready to customize
- **5 Canonical Principles** (Runtime-first, Event-driven, Conversation-first, Memory continuity, Deterministic-first)
- **2 Architecture Warnings** (example drift/overengineering signals)
- **1 Initial Execution Log**
- **Runtime context** auto-generated at `apps/pmos/.context/runtime-context.md`

---

## Customization

After installing, configure PMOS for your project by editing `pmos.config.ts`:

```ts
export const pmosConfig = {
  projectName: 'My Project',
  projectType: 'fullstack-web',
  architectureStyle: 'event-driven',
  domains: ['auth', 'api', 'ui', 'database'],
  runtimeStyle: 'stateless',
  preferredStack: ['Next.js', 'Prisma', 'PostgreSQL'],
}
```

Then re-seed or edit the roadmap via the PMOS UI.

---

## Architecture

See [PMOS-ARCHITECTURE.md](./PMOS-ARCHITECTURE.md) for a full description of:
- What PMOS is and why it exists
- The runtime context model
- How execution logs form architectural memory
- How principles and warnings enforce continuity
- How the context builder feeds AI tools

---

## Bootstrap Your Project

After installation, use the [VSC-BOOTSTRAP-PROMPT.md](./VSC-BOOTSTRAP-PROMPT.md) — a ready-to-paste GitHub Copilot prompt that will:

1. Analyze your project structure
2. Generate a project-specific roadmap
3. Create principles from your codebase patterns
4. Create initial warnings from detected risks
5. Write the first execution log

---

## Stack

| Layer | Technology |
|---|---|
| Runtime | Next.js 14 (App Router) |
| Database | PostgreSQL (Neon recommended) |
| ORM | Prisma v5 |
| UI | Tailwind CSS v3 |
| Context API | `/api/context/active` |
| Context Builder | `tsx scripts/build-pmos-context.ts` |

---

## Philosophy

> PMOS is not a ticket system. It is not a sprint planner.
> It is a **memory layer** — the persistent record of what your project is, why decisions were made, and what the AI should know before touching anything.

The runtime context file (`apps/pmos/.context/runtime-context.md`) is the output — a Markdown document injected into your AI assistant's context at the start of every session.
