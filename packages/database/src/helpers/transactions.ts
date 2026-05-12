// Transaction helpers — wrapping Prisma interactive transactions

import type { PrismaClient } from '@prisma/client'

type TransactionClient = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0]

export type TransactionFn<T> = (tx: TransactionClient) => Promise<T>

/**
 * Run a set of operations in a Prisma interactive transaction.
 * Rolls back automatically if the callback throws.
 */
export async function withTransaction<T>(
  db: PrismaClient,
  fn: TransactionFn<T>,
): Promise<T> {
  return db.$transaction(fn)
}

/**
 * Run multiple operations in a transaction with a custom timeout.
 * Use for longer operations (e.g., Excel import batch).
 */
export async function withLongTransaction<T>(
  db: PrismaClient,
  fn: TransactionFn<T>,
  timeoutMs = 30_000,
): Promise<T> {
  return db.$transaction(fn, { timeout: timeoutMs })
}
