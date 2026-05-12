// UserRepository — auth-focused user operations
// Profile data lives in UserProfileRepository (UserProfile model)

import type { PrismaClient, User, Prisma, UserStatus } from '@prisma/client'
import { BaseRepository } from './base.repository'
import { softDeletePayload } from '../helpers/soft-delete'

export class UserRepository extends BaseRepository {
  constructor(db: PrismaClient) {
    super(db)
  }

  async findById(id: string): Promise<User | null> {
    return this.db.user.findUnique({
      where: { id, deletedAt: null },
    })
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.db.user.findUnique({
      where: { email, deletedAt: null },
    })
  }

  async findByIdWithProfile(id: string) {
    return this.db.user.findUnique({
      where: { id, deletedAt: null },
      include: { profile: true },
    })
  }

  async create(data: Prisma.UserCreateInput): Promise<User> {
    return this.db.user.create({ data })
  }

  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return this.db.user.update({ where: { id }, data })
  }

  async updateStatus(id: string, status: UserStatus): Promise<User> {
    return this.db.user.update({ where: { id }, data: { status } })
  }

  async markEmailVerified(id: string): Promise<User> {
    return this.db.user.update({
      where: { id },
      data: { emailVerified: new Date() },
    })
  }

  /** GDPR soft delete — anonymises PII and marks deletedAt. */
  async softDelete(id: string): Promise<User> {
    return this.db.user.update({
      where: { id },
      data: {
        ...softDeletePayload(),
        email: `deleted-${id}@deleted.local`,
        name: null,
        image: null,
        passwordHash: null,
        status: 'DELETED',
      },
    })
  }

  async existsByEmail(email: string): Promise<boolean> {
    const count = await this.db.user.count({
      where: { email, deletedAt: null },
    })
    return count > 0
  }
}
