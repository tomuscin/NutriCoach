// NextAuth v5 module augmentation
// Extends Session and JWT types with custom fields

import type { DefaultSession, DefaultJWT } from 'next-auth'
import type { UserRole, UserStatus } from '@prisma/client'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: UserRole
      status: UserStatus
      onboardingCompleted: boolean
    } & DefaultSession['user']
  }

  interface User {
    role: UserRole
    status: UserStatus
    onboardingCompleted: boolean
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    id?: string
    role?: UserRole
    status?: UserStatus
    onboardingCompleted?: boolean
  }
}
