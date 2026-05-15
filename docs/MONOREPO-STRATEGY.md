# Leaxaro — Monorepo Strategy

## Tool: Turborepo + npm workspaces

Leaxaro uses **Turborepo** for task orchestration and **npm workspaces** for package management.

This combination was chosen for:
- zero-config local dev (single `npm run dev` at root)
- incremental builds with remote caching
- simple migration path (no lock-in)
- native npm ecosystem compatibility

---

## Workspace Layout

```
package.json (root)       # workspace config, devDependencies
apps/
  web/                    # Next.js 14 app — "leaxaro-web"
  api/                    # future: standalone API
  workers/                # future: background job workers
packages/
  ncic/                   # Nutrition Conversational Intelligence Core
  ai/                     # AI utilities
  database/               # Prisma + repositories
  events/                 # event bus
  nutrition-engine/       # nutrition domain logic
  training-engine/        # training domain logic
  recovery-engine/        # recovery domain logic
  queue/                  # job queue abstraction
  types/                  # shared TypeScript types
  ui/                     # shared UI components
  utils/                  # shared utilities
  validators/             # Zod schemas
  config/                 # shared ESLint, TSConfig
services/
  conversational-runtime/ # future: NCIC runtime service
  event-engine/           # future: event processing service
  recommendation-engine/  # future: recommendation service
  memory-engine/          # future: memory service
  ingestion-engine/       # future: data ingestion service
  ai-gateway/             # future: unified AI gateway
```

---

## Naming Conventions

| Type | Convention | Example |
|---|---|---|
| App packages | `@nutricoach/web` | `apps/web` |
| Core packages | `@nutricoach/ncic` | `packages/ncic` |
| Domain packages | `@nutricoach/nutrition-engine` | `packages/nutrition-engine` |
| Service packages | `@nutricoach/conversational-runtime` | `services/conversational-runtime` |

---

## Turborepo Task Pipeline

```json
{
  "build": { "dependsOn": ["^build"] },
  "dev": { "cache": false, "persistent": true },
  "typecheck": { "dependsOn": ["^typecheck"] },
  "lint": { "dependsOn": ["^lint"] },
  "test": { "dependsOn": ["^build"] }
}
```

---

## Anti-Patterns to Avoid

- **Circular dependencies** between packages — use events/interfaces to decouple
- **Fat packages** — keep domain packages focused on one concern
- **Shared env vars across ecosystems** — each workspace has its own `.env.local`
- **apps/ importing from other apps/** — apps should only import from packages/
- **services/ importing from apps/** — services are downstream from packages only

---

## Future Migration Path

If Leaxaro grows to require pnpm workspaces (stricter isolation, phantom deps fix):
1. Replace `package-lock.json` with `pnpm-lock.yaml`
2. Add `pnpm-workspace.yaml` at root
3. Update CI/CD workflows
4. Migration is non-breaking — Turborepo supports both

If a standalone service needs to be extracted to its own repo:
1. Move from `services/[name]/` to a new GitHub repo
2. Publish shared packages to npm private registry or GitHub Packages
3. Reference via semver in service package.json
