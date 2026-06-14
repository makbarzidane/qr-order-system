import type { Role } from './index'

declare module 'next-auth' {
  interface User {
    role: Role
  }
  interface Session {
    user: {
      role: Role
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: Role
  }
}
