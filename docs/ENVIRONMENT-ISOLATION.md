# Leaxaro — Environment Isolation

## Absolute Rule

Leaxaro is the **third, completely autonomous development ecosystem**.

It must never share any infrastructure, credentials, billing, or runtime with:
- **Profitia** (B2B SaaS procurement intelligence)
- **Private** (personal projects and tools)

---

## What Must Be Separate

| Resource | Status | Notes |
|---|---|---|
| GitHub repository | OK — `github-private:tomuscin/Leaxaro` | own SSH alias |
| Vercel project | OK — own deployment | own team/billing |
| Neon database | OK — own Postgres | own project + connection string |
| OpenAI API key | REQUIRED — dedicated key | never share with Profitia |
| Sentry project | REQUIRED — dedicated project | own DSN |
| PostHog project | REQUIRED — dedicated project | own API key |
| Upstash Redis | REQUIRED — own instance | own REST URL + token |
| Resend API key | REQUIRED — own key | own sending domain |
| Environment variables | REQUIRED — `apps/web/.env.local` | never copied across ecosystems |
| Billing accounts | REQUIRED | separate per service |
| GitHub Actions secrets | REQUIRED | scoped to this repo only |

---

## What Must NEVER Happen

- Do NOT share `DATABASE_URL` or `DIRECT_URL` with Profitia or Private
- Do NOT reuse OpenAI API keys across ecosystems
- Do NOT copy environment variables between `.env.local` files of different projects
- Do NOT add Leaxaro packages to Profitia or Private workspace configs
- Do NOT share Sentry DSN, PostHog keys, or Upstash tokens
- Do NOT merge billing or usage under a shared account
- Do NOT connect to the same PostgreSQL database from multiple ecosystems

---

## Current Isolation State

### Root directory
- Old (archived): `/Users/tomaszuscinski/Projects/private/Leaxaro`
- New (canonical): `/Users/tomaszuscinski/Documents/Visual Code Studio/Leaxaro`

The old location in `/Projects/private/` was a violation of the isolation principle. The new location in `Visual Code Studio/Leaxaro` is an independent root, peer to `Profitia` and `Private`.

### VS Code workspace
Leaxaro has its own `.code-workspace` file at the root. Do NOT add it to the Profitia or Private workspace configs.

---

## Environment Variables Structure

All secrets live in `apps/web/.env.local`. This file is gitignored.

Key variable groups:
- `DATABASE_URL` / `DIRECT_URL` — Neon PostgreSQL (Leaxaro-specific)
- `NEXTAUTH_*` — NextAuth (Leaxaro-specific domain)
- `OPENAI_API_KEY` — dedicated OpenAI key for Leaxaro
- `SENTRY_*` — Leaxaro Sentry project
- `NEXT_PUBLIC_POSTHOG_*` — Leaxaro PostHog project
- `UPSTASH_*` — Leaxaro Upstash instance
- `STRAVA_*` — Leaxaro Strava OAuth app
- `RESEND_API_KEY` — Leaxaro sending key

---

## Checklist Before Any Integration

- [ ] Is this credential scoped to Leaxaro only?
- [ ] Is this service billed separately?
- [ ] Is the GitHub secret scoped to this repo?
- [ ] Does this service have its own project/instance?
- [ ] Is `.env.local` NOT committed to git?
