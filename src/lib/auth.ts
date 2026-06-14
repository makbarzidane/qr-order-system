import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from './prisma'
import bcrypt from 'bcryptjs'
import type { NextAuthOptions } from 'next-auth'
import type { Role } from '@/types'

const HAS_DB = Boolean(process.env.DATABASE_URL)

const DEMO_USERS: Record<string, { password: string; role: Role; name: string }> = {
  'admin@qrorder.app': { password: 'admin123', role: 'ADMIN', name: 'Admin' },
  'cashier@qrorder.app': { password: 'cashier123', role: 'CASHIER', name: 'Kasir' },
  'kitchen@qrorder.app': { password: 'kitchen123', role: 'KITCHEN', name: 'Dapur' },
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        const email = credentials.email.trim().toLowerCase()
        const demo = DEMO_USERS[email]
        if (!HAS_DB) {
          if (demo && demo.password === credentials.password) return { id: email, email, name: demo.name, role: demo.role }
          return null
        }

        const user = await prisma.user.findUnique({ where: { email } })
        if (!user || !user.isActive) return null
        const valid = await bcrypt.compare(credentials.password, user.password)
        if (!valid) return null
        return { id: user.id, email: user.email, name: user.name, role: user.role as Role }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.role = (user as { role: Role }).role
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as Role
        session.user.id = token.sub ?? ''
      }
      return session
    },
  },
  pages: { signIn: '/login' },
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET,
}
