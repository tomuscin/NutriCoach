# Leaxaro — Database Migration Strategy
# MySQL / MariaDB (WEBD.pl)

## Database target
- **Provider**: MySQL 5.7+ / MariaDB 10.2+
- **Host**: WEBD.pl shared hosting
- **Database name**: `tomuscin_nutricoach`
- **Prisma provider**: `"mysql"`
- **ORM**: Prisma v5

---

## Local Development Setup

### Option A: Docker (recommended)
```bash
docker-compose up -d mysql redis
# Then verify connection:
mysql -h 127.0.0.1 -P 3306 -u nutricoach -pnutricoach_dev nutricoach

# .env.local:
DATABASE_URL="mysql://nutricoach:nutricoach_dev@localhost:3306/nutricoach"
```

### Option B: MAMP / XAMPP (macOS)
```bash
# Start MAMP, then:
DATABASE_URL="mysql://root:root@localhost:8889/nutricoach_dev"
```

---

## Migration Commands

### First-time setup (local dev)
```bash
# Generate Prisma client
npx prisma generate

# Create + run initial migration
npx prisma migrate dev --name init

# Seed development data
npx prisma db seed
```

### Production deployment (WEBD.pl)
```bash
# NEVER use 'migrate dev' in production — it can reset data
# ALWAYS use 'migrate deploy' which only applies pending migrations

npx prisma migrate deploy
```

### Reset (local dev only — NEVER in production)
```bash
npx prisma migrate reset
# This drops the database, recreates it, runs all migrations, runs seed
```

### Schema change workflow
```bash
# 1. Edit prisma/schema.prisma
# 2. Generate migration
npx prisma migrate dev --name describe_your_change
# 3. Review generated SQL in prisma/migrations/
# 4. Commit schema.prisma + migration files together
```

---

## WEBD.pl Connection Notes

### Enabling external MySQL access
1. Log in to WEBD.pl panel
2. Navigate to: Bazy danych MySQL → Dostęp zdalny
3. Add allowed IP addresses (Vercel IPs or 0.0.0.0/0 for testing)
4. Note your MySQL hostname (typically `mysql.webd.pl` or similar)

### Connection string format
```
mysql://tomuscin_nutricoach:PASSWORD@mysql.webd.pl:3306/tomuscin_nutricoach?ssl=true&sslaccept=strict
```

### Connection limits
WEBD.pl shared hosting typically limits connections per database.
If you hit connection limit errors, add to DATABASE_URL:
```
?connection_limit=5&pool_timeout=20
```

### SSL
Always use SSL for remote connections:
```
?ssl=true&sslaccept=strict
```

---

## MySQL Compatibility Notes

### JSON Fields
- **MySQL 5.7.8+**: Native JSON column type — Prisma uses it natively
- **MariaDB 10.2–10.4**: JSON stored as LONGTEXT — Prisma handles transparently
- **MariaDB 10.5+**: Native JSON support added
- **Impact**: None — Prisma abstracts this. Data is stored and retrieved identically.

### Enums
- MySQL native ENUMs are used — Prisma generates `ENUM('VALUE1','VALUE2')` columns
- Adding new enum values requires a migration (ALTER TABLE ... MODIFY COLUMN)
- **Risk**: Enum changes in production need careful migration planning

### Descending Indexes
- `sort: Desc` removed from all `@@index()` definitions
- MySQL 8.0+ supports descending indexes, MariaDB partially
- **Impact**: Queries still work — optimizer may be slightly less efficient on large tables for DESC ORDER BY queries
- **Mitigation**: Not significant at MVP scale. Revisit when table size > 100k rows.

### String Length (VARCHAR)
- Prisma default: `VARCHAR(191)` for `String` fields (safe for utf8mb4)
- Max key prefix for utf8mb4: 767 bytes → 191 chars
- Fields with `@db.Text` bypass this: stored as MySQL TEXT (65535 chars max)
- Fields with `@db.LongText` store up to 4GB (not used currently)

### Transactions
- Prisma transactions (`$transaction`) work identically on MySQL
- MySQL default isolation: REPEATABLE READ (same as PostgreSQL)
- `withTransaction()` in packages/database is fully compatible

---

## Rollback Strategy

### If a migration fails in production
```bash
# 1. Check migration status
npx prisma migrate status

# 2. If partially applied — manually restore from backup
# WEBD.pl panel → Backup → Restore point before migration

# 3. Mark migration as rolled back
npx prisma migrate resolve --rolled-back "migration_name"

# 4. Fix the migration file and re-deploy
npx prisma migrate deploy
```

### Backup before each production migration
```bash
# From WEBD.pl panel: Bazy danych → Eksport
# Or via mysqldump:
mysqldump -h HOST -u USER -pPASSWORD tomuscin_nutricoach > backup_$(date +%Y%m%d_%H%M%S).sql
```

---

## Redis / Queue Strategy (WEBD.pl context)

WEBD.pl does NOT provide Redis. Use **Upstash** (serverless Redis):
- Free tier: 10,000 commands/day
- Connection: TLS only (rediss://)
- No persistent server process needed (serverless-safe)

```bash
# .env.local:
REDIS_URL="rediss://default:TOKEN@HOST.upstash.io:6379"
```

### Queue resilience
BullMQ is configured with `maxRetriesPerRequest: null` (required for BullMQ).
Job retry strategy per queue type is defined in `packages/queue/src/job-types.ts`.

If Redis is unavailable:
- AI briefs: will not be generated (non-critical)
- TP/Garmin sync: fallback to manual sync only
- App remains fully functional for manual data entry and viewing

---

## Performance Index Notes (MySQL-specific)

Critical composite indexes already defined in schema:
- `(userId, date)` — on DailyLog, BodyMetric, SleepMetric, RecoveryMetric, Workout, TrainingLoad
- `(userId, createdAt)` — on Goal, AIInsight, Notification, ExcelImportSession, SyncLog
- `(userId, status)` — on Goal, Integration, SyncLog, Notification
- `(nextSyncAt)` — on Integration (sync scheduler)
- `(integrationId, startedAt)` — on SyncLog
- `@@unique([userId, date])` — on DailyLog, TrainingLoad (implicit index)
- `@@unique([userId, fileHash])` — on ExcelImportSession

MySQL query optimization tips:
- Use `EXPLAIN` to verify index usage on slow queries
- Avoid `SELECT *` in production queries (Prisma `select: {}` option)
- For analytics queries across many users: add covered indexes as needed

---

## Health Check Endpoint

`GET /api/health` — available in apps/web

Returns:
```json
{
  "status": "ok | degraded | error",
  "app": "Leaxaro",
  "version": "0.1.0",
  "timestamp": "2026-05-12T...",
  "components": {
    "database": { "status": "ok", "latencyMs": 12 },
    "redis": { "status": "ok", "latencyMs": 3 }
  }
}
```

HTTP status codes:
- `200` — ok or degraded
- `503` — database error (app not functional)
