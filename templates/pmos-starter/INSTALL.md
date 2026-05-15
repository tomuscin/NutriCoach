# PMOS Install Guide

Step-by-step instructions for embedding PMOS into a new project.

---

## Prerequisites

- Node.js 20+
- npm 10+
- PostgreSQL database (Neon free tier recommended: https://neon.tech)

---

## STEP 1 — Copy PMOS into your project

From the root of your project:

```bash
# If you have the Leaxaro repo as a reference
cp -r /path/to/pmos-starter/apps/pmos apps/pmos

# Or clone just the starter
git clone https://github.com/your-org/pmos-starter apps/pmos
```

Your project structure should now contain:

```
your-project/
  apps/
    pmos/
      package.json
      pmos.config.ts
      prisma/
        schema.prisma
        seed.ts
      src/
        app/
        components/
        lib/
  scripts/
    build-pmos-context.ts
```

---

## STEP 2 — Configure the project

Edit `apps/pmos/pmos.config.ts`:

```ts
export const pmosConfig = {
  projectName: 'Your Project Name',
  projectType: 'fullstack-web',          // fullstack-web | api | mobile | library | monorepo
  architectureStyle: 'event-driven',     // event-driven | layered | microservices | monolith
  domains: ['auth', 'api', 'ui'],        // your actual domains
  runtimeStyle: 'stateless',            // stateless | stateful | hybrid
  preferredStack: ['Next.js', 'Prisma'], // your stack
}
```

---

## STEP 3 — Install dependencies

```bash
cd apps/pmos
npm install
```

---

## STEP 4 — Set up environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
# Required — get from Neon dashboard (https://neon.tech)
DATABASE_URL="postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/pmos?sslmode=require"
DIRECT_URL="postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/pmos?sslmode=require"

# App URL (keep default for local dev)
NEXT_PUBLIC_APP_URL="http://localhost:3200"
```

### Getting Neon credentials

1. Create account at https://neon.tech
2. Create project → copy `DATABASE_URL` and `DIRECT_URL` from the dashboard
3. Paste both into `.env.local`

---

## STEP 5 — Initialize the database

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database (creates all tables)
npm run db:push

# Seed with generic starter data
npm run db:seed
```

Expected output from seed:
```
Seeding PMOS...
Tags created: 15
Principles created: 5
ETAPs created: 5
Warnings created: 2
Execution log created: 1
PMOS seed complete.
```

---

## STEP 6 — Run PMOS

```bash
npm run dev
```

PMOS is available at: http://localhost:3200

You should see:
- Dashboard with 5 ETAPs
- 5 Canonical Principles
- 2 Architecture Warnings
- 1 Execution Log

---

## STEP 7 — Build runtime context

The runtime context is an auto-generated Markdown file that injects PMOS state into your AI assistant.

```bash
# From project root
npm run context:build

# Or directly
npx tsx scripts/build-pmos-context.ts
```

Output: `apps/pmos/.context/runtime-context.md`

This file is automatically picked up by GitHub Copilot when placed in `.context/`.

---

## STEP 8 — Bootstrap with AI (optional but recommended)

Copy the contents of `VSC-BOOTSTRAP-PROMPT.md` and paste into GitHub Copilot Chat.

This will:
- Analyze your project structure
- Generate a project-specific roadmap in PMOS
- Create principles from your codebase patterns
- Detect and create initial architecture warnings
- Write the first real execution log

---

## Turbo / Monorepo Setup

If your project uses Turborepo, add to `turbo.json`:

```json
{
  "tasks": {
    "context:build": {
      "dependsOn": [],
      "outputs": ["apps/pmos/.context/**"]
    }
  }
}
```

And to root `package.json`:

```json
{
  "scripts": {
    "context:build": "cd apps/pmos && tsx ../../scripts/build-pmos-context.ts"
  }
}
```

---

## Troubleshooting

**`db:push` fails — SSL error**
```env
# Try adding to DATABASE_URL:
?sslmode=require&ssl=true
```

**`db:seed` fails — Prisma client not found**
```bash
npm run db:generate   # regenerate Prisma client first
```

**Context build fails — PMOS not running**
```bash
# PMOS must be running before context:build
npm run dev &
sleep 3
npm run context:build
```

**Port 3200 in use**
Edit `package.json`:
```json
"dev": "next dev --port 3201"
```
And update `NEXT_PUBLIC_APP_URL` in `.env.local`.
