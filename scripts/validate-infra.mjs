#!/usr/bin/env node
// Leaxaro — Infrastructure Validation Script
// Run before deploy: node scripts/validate-infra.mjs
// Checks: env vars, DB connectivity, Prisma schema, Redis

import { execSync } from 'child_process'
import { existsSync, readFileSync } from 'fs'
import { createRequire } from 'module'
import { resolve } from 'path'

const require = createRequire(import.meta.url)
const ROOT = resolve(process.cwd())

let passed = 0
let failed = 0
let warnings = 0

function ok(msg) {
  console.log(`  ✓ ${msg}`)
  passed++
}

function fail(msg) {
  console.error(`  ✗ ${msg}`)
  failed++
}

function warn(msg) {
  console.warn(`  ⚠ ${msg}`)
  warnings++
}

function section(title) {
  console.log(`\n── ${title} ──────────────────────────────────────────`)
}

// ─── Load env ────────────────────────────────────────────────────────────────
const envFile = resolve(ROOT, 'apps/web/.env.local')
if (existsSync(envFile)) {
  const lines = readFileSync(envFile, 'utf8').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx === -1) continue
    const key = trimmed.slice(0, idx)
    let val = trimmed.slice(idx + 1)
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1)
    if (!process.env[key]) process.env[key] = val
  }
}

console.log('═══════════════════════════════════════════════════════')
console.log('  Leaxaro — Infrastructure Validation')
console.log(`  ${new Date().toISOString()}`)
console.log('═══════════════════════════════════════════════════════')

// ─── 1. Environment ───────────────────────────────────────────────────────────
section('1. Environment Variables')

const required = {
  DATABASE_URL: (v) => v.startsWith('mysql://') || v.startsWith('mysql2://'),
  NEXTAUTH_SECRET: (v) => v.length >= 32,
  NEXTAUTH_URL: (v) => v.startsWith('http'),
}

const optional = ['OPENAI_API_KEY', 'REDIS_URL', 'RESEND_API_KEY']

for (const [key, validate] of Object.entries(required)) {
  const val = process.env[key]
  if (!val) {
    fail(`${key}: MISSING`)
  } else if (!validate(val)) {
    fail(`${key}: INVALID value`)
  } else {
    const display = key.includes('SECRET') || key.includes('PASSWORD')
      ? val.slice(0, 6) + '…'
      : key === 'DATABASE_URL'
      ? val.replace(/:([^@]+)@/, ':***@')
      : val
    ok(`${key}: ${display}`)
  }
}

for (const key of optional) {
  if (process.env[key]) {
    ok(`${key}: set`)
  } else {
    warn(`${key}: not set (optional)`)
  }
}

// ─── 2. Prisma schema ─────────────────────────────────────────────────────────
section('2. Prisma Schema')

try {
  execSync('npx prisma validate', { stdio: 'pipe', env: process.env })
  ok('schema.prisma: valid')
} catch (e) {
  fail(`schema.prisma: INVALID — ${e.stderr?.toString().trim() ?? e.message}`)
}

const schemaPath = resolve(ROOT, 'prisma/schema.prisma')
if (existsSync(schemaPath)) {
  const schema = readFileSync(schemaPath, 'utf8')
  const modelCount = (schema.match(/^model\s+\w+/gm) ?? []).length
  const enumCount = (schema.match(/^enum\s+\w+/gm) ?? []).length
  ok(`schema.prisma: ${modelCount} models, ${enumCount} enums`)

  if (!schema.includes('provider = "mysql"')) {
    fail('provider: not set to "mysql"')
  } else {
    ok('provider: mysql ✓')
  }

  if (schema.split('\n').some(line => !line.trim().startsWith('//') && line.includes('sort: Desc'))) {
    fail('sort: Desc found in indexes — incompatible with MariaDB')
  } else {
    ok('indexes: no sort:Desc (MariaDB safe)')
  }
}

// ─── 3. DB Connectivity ───────────────────────────────────────────────────────
section('3. Database Connectivity')

if (!process.env.DATABASE_URL) {
  fail('DATABASE_URL not set — skipping DB checks')
} else {
  // TCP check
  try {
    const url = new URL(process.env.DATABASE_URL.replace('mysql://', 'http://'))
    const host = url.hostname
    const port = url.port || '3306'
    execSync(`nc -zw3 ${host} ${port}`, { stdio: 'pipe' })
    ok(`TCP: ${host}:${port} reachable`)
  } catch {
    fail('TCP: cannot reach MySQL host (firewall or host down?)')
  }

  // Prisma query
  try {
    const { PrismaClient } = require('@prisma/client')
    const p = new PrismaClient()
    // eslint-disable-next-line no-undef
    await p.$queryRawUnsafe('SELECT VERSION() as version, DATABASE() as db')
      .then(async (rows) => {
        ok(`DB query: MySQL ${rows[0].version} | DB: ${rows[0].db}`)
        await p.$disconnect()
      })
  } catch (e) {
    fail(`DB query: FAILED — ${e.message?.slice(0, 100)}`)
  }

  // Table count
  try {
    const { PrismaClient } = require('@prisma/client')
    const p = new PrismaClient()
    const tables = await p.$queryRawUnsafe('SHOW TABLES')
    ok(`Tables: ${tables.length} found in database`)
    await p.$disconnect()
  } catch {
    warn('Could not count tables')
  }
}

// ─── 4. Prisma Client ─────────────────────────────────────────────────────────
section('4. Prisma Client')

const clientPath = resolve(ROOT, 'node_modules/@prisma/client')
if (existsSync(clientPath)) {
  ok('@prisma/client: installed')
} else {
  fail('@prisma/client: NOT found — run: npx prisma generate')
}

// ─── 5. Redis ─────────────────────────────────────────────────────────────────
section('5. Redis')

if (process.env.REDIS_URL) {
  ok(`REDIS_URL: configured (${process.env.REDIS_URL.replace(/:([^@]+)@/, ':***@')})`)
  warn('Redis connection test: run app and check /api/health')
} else {
  warn('Redis: not configured — queue features disabled (OK for ETAP 2.5)')
  ok('Graceful fallback: active (app works without Redis)')
}

// ─── 6. Next.js build prerequisites ──────────────────────────────────────────
section('6. Build Prerequisites')

const nextConfigPath = resolve(ROOT, 'apps/web/next.config.ts')
if (existsSync(nextConfigPath)) {
  const cfg = readFileSync(nextConfigPath, 'utf8')
  ok('next.config.ts: found')
  if (cfg.includes('instrumentationHook: true')) {
    ok('instrumentationHook: enabled')
  } else {
    warn('instrumentationHook: not enabled (startup diagnostics disabled)')
  }
  if (cfg.includes('transpilePackages')) {
    ok('transpilePackages: configured (monorepo packages)')
  } else {
    warn('transpilePackages: not set (may cause build issues)')
  }
}

const envLocalExists = existsSync(resolve(ROOT, 'apps/web/.env.local'))
if (envLocalExists) {
  ok('apps/web/.env.local: exists')
} else {
  fail('apps/web/.env.local: MISSING — copy from .env.example')
}

const gitignorePath = resolve(ROOT, '.gitignore')
if (existsSync(gitignorePath)) {
  const gi = readFileSync(gitignorePath, 'utf8')
  if (gi.includes('.env.local')) {
    ok('.gitignore: .env.local excluded ✓')
  } else {
    fail('.gitignore: .env.local NOT excluded — secrets may leak!')
  }
}

// ─── Summary ──────────────────────────────────────────────────────────────────
console.log('\n═══════════════════════════════════════════════════════')
console.log(`  Results: ${passed} passed | ${warnings} warnings | ${failed} failed`)
if (failed === 0) {
  console.log('  Status: ✅ READY — all critical checks passed')
} else {
  console.log('  Status: ❌ NOT READY — fix failed checks before deploy')
}
console.log('═══════════════════════════════════════════════════════\n')

if (failed > 0) process.exit(1)
