// Soft-delete helpers — used for Meal, Workout, and User (GDPR)
// Health metrics (BodyMetric, SleepMetric, RecoveryMetric) are IMMUTABLE — no soft delete.

/** Prisma where-clause fragment to exclude soft-deleted rows. */
export const excludeDeleted = { deletedAt: null } as const

/** Prisma where-clause fragment to include only soft-deleted rows. */
export const onlyDeleted = { deletedAt: { not: null } } as const

/** Build the payload to mark a record as soft-deleted. */
export function softDeletePayload(): { deletedAt: Date } {
  return { deletedAt: new Date() }
}

/** Build the payload to restore a soft-deleted record. */
export function softRestorePayload(): { deletedAt: null } {
  return { deletedAt: null }
}

/** Type guard — returns true if a record is soft-deleted. */
export function isSoftDeleted(record: { deletedAt: Date | null }): boolean {
  return record.deletedAt !== null
}
